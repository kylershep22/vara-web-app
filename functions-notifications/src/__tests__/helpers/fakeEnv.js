/**
 * Test environment for the notifications codebase.
 *
 * WHY A FAKE AND NOT THE EMULATOR. These suites observe three outputs of a
 * trigger: what is handed to Expo, what is written to Firestore, and what is
 * logged. None of that needs real query semantics beyond equality and
 * array-contains, and a fake lets a test make one specific read FAIL, which
 * the emulator cannot do. Failure injection is the point: the sender's rule
 * is that a failed read sends nothing, and only a fake can prove it.
 *
 * Every module the code under test touches at load time is mocked with
 * jest.doMock, so install() must run before the code under test is required,
 * and after jest.resetModules() so each test gets a fresh module graph.
 */

/* global jest */

const SERVER_TIMESTAMP = {__fake: "serverTimestamp"};

/**
 * An obviously fake Expo access token. The real one is a Firebase secret and
 * never appears in this repo. install() puts this in process.env, which is
 * where the secret's value() reads it from at run time.
 */
const FAKE_EXPO_ACCESS_TOKEN = "fake-expo-access-token-for-tests-only";

/**
 * Expo.isExpoPushToken from expo-server-sdk 4.0.0
 * (build/ExpoClient.js, static isExpoPushToken), copied rather than loaded:
 * jest.requireActual on the SDK caches a real SDK wired to whichever
 * node-fetch stand-in was current, and a later test that wants the real SDK
 * would silently get that stale one. The realExpo suites exercise the real
 * method itself.
 * @param {*} token
 * @return {boolean}
 */
function isExpoPushTokenLikeSdk(token) {
  return (typeof token === "string" &&
    (((token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken[")) && token.endsWith("]")) ||
      /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i
          .test(token)));
}

/**
 * A Firestore Timestamp stand-in. Only toMillis is read by the sender.
 * @param {number} ms
 * @return {object}
 */
function timestamp(ms) {
  return {toMillis: () => ms, toDate: () => new Date(ms)};
}

/**
 * Build a fresh fake world and register every mock.
 * @param {object=} options
 * @param {boolean=} options.realExpo keep the real expo-server-sdk, so a test
 *   can observe the HTTP request it builds
 * @param {function=} options.fetch REQUIRED with realExpo: the stand-in for
 *   node-fetch. It is registered here, FIRST, before anything below can load
 *   the real SDK, because a module loaded before its mock keeps the real
 *   dependency - and the real node-fetch would reach Expo's servers.
 * @return {object} handles for seeding, failure injection and observation
 */
function install(options) {
  const opts = options || {};
  process.env.EXPO_ACCESS_TOKEN = FAKE_EXPO_ACCESS_TOKEN;

  // NO NETWORK, EVER. node-fetch is always mocked: by the caller's stand-in
  // in realExpo mode, and otherwise by one that throws, so a test that
  // somehow reaches the real SDK fails loudly instead of calling Expo.
  if (opts.realExpo && typeof opts.fetch !== "function") {
    throw new Error("install({realExpo: true}) requires a fetch stand-in");
  }
  const realFetch = jest.requireActual("node-fetch");
  const fetchStandIn = opts.realExpo ? opts.fetch : jest.fn(async () => {
    throw new Error("network blocked in tests: node-fetch was called");
  });
  const fetchModule = Object.assign(fetchStandIn, {
    __esModule: true,
    default: fetchStandIn,
    Headers: realFetch.Headers,
  });
  jest.doMock("node-fetch", () => fetchModule);
  const store = new Map();
  const writes = [];
  const queries = [];
  const failures = {get: new Set(), query: new Set(), create: new Set()};
  let autoId = 0;

  const clone = (v) => (v === undefined ? undefined : JSON.parse(
      JSON.stringify(v, (k, val) => (val && typeof val.toMillis === "function" ?
        {__ms: val.toMillis()} : val)),
      (k, val) => (val && typeof val.__ms === "number" ?
        timestamp(val.__ms) : val)));

  const fail = (kind, path) => {
    if (failures[kind].has(path)) {
      const err = new Error(`injected ${kind} failure at ${path}`);
      err.code = 14;
      throw err;
    }
  };

  /**
   * @param {string} path
   * @param {*} data
   * @return {object}
   */
  function snapshot(path, data) {
    const ref = docRef(path);
    return {
      id: ref.id,
      ref,
      exists: data !== undefined,
      data: () => clone(data),
      get: (field) => (data === undefined ? undefined : clone(data)[field]),
    };
  }

  /**
   * @param {string} path
   * @return {object}
   */
  function docRef(path) {
    const id = path.split("/").pop();
    return {
      id,
      path,
      get: async () => {
        fail("get", path);
        return snapshot(path, store.get(path));
      },
      set: async (data, options) => {
        const prev = store.get(path);
        const next = options && options.merge && prev ?
          Object.assign({}, prev, data) : data;
        store.set(path, clone(next));
        writes.push({op: "set", path, data: clone(data)});
      },
      create: async (data) => {
        fail("create", path);
        if (store.has(path)) {
          const err = new Error(`ALREADY_EXISTS: ${path}`);
          err.code = 6;
          throw err;
        }
        store.set(path, clone(data));
        writes.push({op: "create", path, data: clone(data)});
      },
      update: async (data) => {
        if (!store.has(path)) throw new Error(`NOT_FOUND: ${path}`);
        store.set(path, Object.assign({}, store.get(path), clone(data)));
        writes.push({op: "update", path, data: clone(data)});
      },
      delete: async () => {
        store.delete(path);
        writes.push({op: "delete", path});
      },
      collection: (name) => collectionRef(`${path}/${name}`),
    };
  }

  /**
   * @param {string} path
   * @param {Array} filters
   * @param {number|undefined} max
   * @return {object}
   */
  function query(path, filters, max) {
    return {
      where: (f, op, v) => query(path, filters.concat([[f, op, v]]), max),
      limit: (n) => query(path, filters, n),
      get: async () => {
        queries.push({path, filters: filters.slice(), limit: max});
        fail("query", path);
        const prefix = `${path}/`;
        let docs = [];
        for (const [key, data] of store) {
          if (!key.startsWith(prefix)) continue;
          if (key.slice(prefix.length).includes("/")) continue;
          const ok = filters.every(([f, op, v]) => {
            const actual = data[f];
            if (op === "==") return actual === v;
            if (op === "array-contains") {
              return Array.isArray(actual) && actual.includes(v);
            }
            if (op === "in") return v.includes(actual);
            throw new Error(`fake query does not support ${op}`);
          });
          if (ok) docs.push(snapshot(key, data));
        }
        if (typeof max === "number") docs = docs.slice(0, max);
        return {
          docs,
          empty: docs.length === 0,
          size: docs.length,
          forEach: (cb) => docs.forEach(cb),
        };
      },
    };
  }

  /**
   * @param {string} path
   * @return {object}
   */
  function collectionRef(path) {
    const base = query(path, [], undefined);
    return Object.assign(base, {
      path,
      doc: (id) => docRef(`${path}/${id || `auto${++autoId}`}`),
      add: async (data) => {
        const ref = docRef(`${path}/auto${++autoId}`);
        store.set(ref.path, clone(data));
        writes.push({op: "add", path: ref.path, data: clone(data)});
        return ref;
      },
    });
  }

  const db = {
    doc: (path) => docRef(path),
    collection: (path) => collectionRef(path),
  };

  // ---- firebase-admin -----------------------------------------------------
  const getUser = jest.fn(async (uid) => ({uid, email: `${uid}@example.test`}));
  const firestore = () => db;
  firestore.FieldValue = {serverTimestamp: () => SERVER_TIMESTAMP};
  firestore.Timestamp = {fromMillis: timestamp, now: () => timestamp(Date.now())};
  const admin = {
    apps: [],
    initializeApp: jest.fn(() => {
      admin.apps.push({});
    }),
    firestore,
    auth: () => ({getUser}),
  };
  jest.doMock("firebase-admin", () => admin);

  // ---- expo-server-sdk ----------------------------------------------------
  const expoSend = jest.fn(async (messages) => messages.map(() => ({
    status: "ok", id: "ticket",
  })));
  const expoClients = [];
  /** Fake Expo client. */
  class Expo {
    /**
     * @param {object=} clientOptions recorded, so tests see the access token
     */
    constructor(clientOptions) {
      expoClients.push(clientOptions);
      this.sendPushNotificationsAsync = expoSend;
    }
    /**
     * @param {*} token
     * @return {boolean}
     */
    static isExpoPushToken(token) {
      return isExpoPushTokenLikeSdk(token);
    }
  }
  // A doMock registration survives jest.resetModules(), so real-SDK mode
  // must undo an earlier test's fake explicitly or it silently gets the fake.
  if (opts.realExpo) jest.dontMock("expo-server-sdk");
  else jest.doMock("expo-server-sdk", () => ({Expo}));

  // ---- @sendgrid/mail -----------------------------------------------------
  const mailSend = jest.fn(async () => undefined);
  jest.doMock("@sendgrid/mail", () => ({setApiKey: jest.fn(), send: mailSend}));

  // ---- logging: firebase-functions/logger and console ---------------------
  const logs = [];
  const record = (level) => (...args) => {
    logs.push({level, args});
  };
  jest.doMock("firebase-functions/logger", () => ({
    debug: record("debug"),
    log: record("info"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
    write: (entry) => logs.push({level: entry.severity, args: [entry]}),
  }));
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    jest.spyOn(console, level).mockImplementation(record(`console.${level}`));
  }

  return {
    store,
    writes,
    queries,
    failures,
    logs,
    expoSend,
    expoClients,
    mailSend,
    getUser,
    seed: (path, data) => store.set(path, clone(data)),
    /** @return {Array<object>} every message handed to Expo, flattened */
    sentMessages: () => expoSend.mock.calls.reduce(
        (all, call) => all.concat(call[0]), []),
    /**
     * Every log entry serialised, for "never logs X" assertions.
     * @return {string}
     */
    logText: () => JSON.stringify(logs),
    /**
     * Build the event a v2 onDocumentCreated handler receives.
     * @param {string} path document path of the triggering document
     * @param {object} params route params
     * @return {object}
     */
    event: (path, params) => ({
      data: snapshot(path, store.get(path)),
      params,
    }),
  };
}

module.exports = {install, timestamp, SERVER_TIMESTAMP, FAKE_EXPO_ACCESS_TOKEN};
