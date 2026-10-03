/**
 * The NPM-3a-ii walk helper's guards (Kyle's II-D11):
 * scripts/walk/community-push/communityPushHelper.js.
 *
 * run() is called with an injected Firestore stand-in, a temporary
 * allowlist file and a connect() spy, so no credential, no network and no
 * firebase-admin is involved. Each test names the mutation it catches.
 */

/* global describe, it, expect, beforeEach, afterEach, jest */

const fs = require("fs");
const os = require("os");
const path = require("path");
const helper = require("../../../scripts/walk/community-push/communityPushHelper");
const {
  directMessageDoc,
  connectionRequestDoc,
} = require("./fixtures/communityEventShapes");

const PROJECT = "test-project";
const UIDS = {A: "uid-A", B: "uid-B", C: "uid-C"};
const TS = {__serverTimestamp: true};

let dir;
let allowlistPath;
let store;
let reads;
let adds;
let lines;
let connect;

/**
 * A Firestore stand-in with the surface the helper uses.
 * @return {object}
 */
function fakeDb() {
  const docsOf = (collection) => [...store.entries()]
      .filter(([p]) => p.startsWith(`${collection}/`))
      .map(([p, data]) => ({id: p.split("/")[1], data: () => data}));
  return {
    doc: (p) => ({
      get: async () => {
        reads.push(p);
        return {exists: store.has(p), data: () => store.get(p)};
      },
    }),
    collection: (collection) => ({
      where: (field, op, value) => ({
        get: async () => {
          reads.push(`${collection}?${field}${op}`);
          const docs = docsOf(collection).filter((d) => {
            const v = d.data()[field];
            if (op === "==") return JSON.stringify(v) === JSON.stringify(value);
            if (op === "array-contains") {
              return Array.isArray(v) && v.includes(value);
            }
            return false;
          });
          return {docs};
        },
      }),
      add: async (data) => {
        const id = `new-${adds.length + 1}`;
        adds.push({collection, id, data});
        store.set(`${collection}/${id}`, data);
        return {id};
      },
    }),
  };
}

/**
 * Run the helper with these arguments.
 * @param {string[]} args
 * @return {Promise<object>}
 */
function runWith(args) {
  return helper.run({
    argv: ["node", "communityPushHelper.js", ...args],
    allowlistPath,
    connect,
    serverTimestamp: () => TS,
    log: (line) => lines.push(line),
  });
}

/**
 * Write the allowlist file.
 * @param {object} contents
 */
function writeAllowlist(contents) {
  fs.writeFileSync(allowlistPath, JSON.stringify(contents));
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "walk-helper-"));
  allowlistPath = path.join(dir, "allowlist.local.json");
  writeAllowlist({projectId: PROJECT, uids: UIDS});
  store = new Map();
  reads = [];
  adds = [];
  lines = [];
  store.set("users/uid-A", {displayName: "Ada"});
  store.set("users/uid-B", {displayName: "Bea"});
  store.set("users/uid-C", {displayName: "Cal"});
  store.set("conversations/conv-AB", {participants: ["uid-A", "uid-B"]});
  store.set("connections/conn-AB", {
    requesterId: "uid-A", addresseeId: "uid-B",
    participants: ["uid-A", "uid-B"], status: "accepted",
  });
  connect = jest.fn(() => ({db: fakeDb(), projectId: PROJECT}));
});

afterEach(() => {
  fs.rmSync(dir, {recursive: true, force: true});
});

describe("refusals before anything is read", () => {
  // Mutation: run without the allowlist file.
  it("no allowlist file: refuses, connects to nothing", async () => {
    fs.rmSync(allowlistPath);
    await expect(runWith(["message", "--from", "B", "--to", "A"]))
        .rejects.toThrow(/No allowlist/);
    expect(connect).not.toHaveBeenCalled();
  });

  // Mutation: accept a UID that is not in the allowlist.
  it("a sender outside the allowlist is refused", async () => {
    await expect(runWith(["message", "--from", "uid-Z", "--to", "A"]))
        .rejects.toThrow(/sender uid-Z is not in the allowlist/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("a recipient outside the allowlist is refused", async () => {
    await expect(runWith(["request", "--from", "C", "--to", "uid-Z"]))
        .rejects.toThrow(/recipient uid-Z is not in the allowlist/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("a UID in the allowlist is accepted as well as its label", async () => {
    await runWith(["message", "--from", "uid-B", "--to", "uid-A"]);
    expect(lines.join("\n")).toContain("Sender:    B  uid-B  Bea");
  });

  it("the same account as sender and recipient is refused", async () => {
    await expect(runWith(["message", "--from", "A", "--to", "uid-A"]))
        .rejects.toThrow(/same account/);
  });

  it("no event or no accounts named is refused", async () => {
    await expect(runWith(["--from", "B", "--to", "A"]))
        .rejects.toThrow(/message or request/);
    await expect(runWith(["message", "--to", "A"]))
        .rejects.toThrow(/--from and --to/);
  });

  // Mutation: skip the project check.
  it("a credential for another project is refused", async () => {
    connect = jest.fn(() => ({db: fakeDb(), projectId: "other-project"}));
    await expect(runWith(["message", "--from", "B", "--to", "A"]))
        .rejects.toThrow(/allowlist names test-project/);
    expect(reads).toEqual([]);
  });
});

describe("dry run", () => {
  // Mutation: write in a dry run.
  it("prints the project, both accounts and the document, writes nothing",
      async () => {
        const result = await runWith(["message", "--from", "B", "--to", "A"]);
        expect(result.written).toBeNull();
        expect(adds).toEqual([]);
        const out = lines.join("\n");
        expect(out).toContain(`Project:   ${PROJECT}`);
        expect(out).toContain("Sender:    B  uid-B  Bea");
        expect(out).toContain("Recipient: A  uid-A  Ada");
        expect(out).toContain("directMessages/<new auto ID>");
        expect(out).toContain("\"conversationId\": \"conv-AB\"");
        expect(out).toContain("DRY RUN: nothing was written");
      });

  it("never reads userPrivate", async () => {
    await runWith(["message", "--from", "B", "--to", "A", "--execute"]);
    expect(reads.some((r) => r.startsWith("userPrivate"))).toBe(false);
  });
});

describe("execute", () => {
  // Mutation: a field added, dropped or renamed in the message shape.
  it("a message: exactly one directMessages document, in the app's shape",
      async () => {
        const result = await runWith(
            ["message", "--from", "B", "--to", "A", "--execute"]);
        expect(adds).toHaveLength(1);
        expect(adds[0].collection).toBe("directMessages");
        expect(adds[0].data).toEqual(directMessageDoc({
          conversationId: "conv-AB",
          senderId: "uid-B",
          receiverId: "uid-A",
          text: helper.MESSAGE_TEXT,
          createdAt: TS,
        }));
        expect(result.written).toBe("directMessages/new-1");
        expect(lines.join("\n")).toContain("WROTE directMessages/new-1");
      });

  // Mutation: a field added, dropped or renamed in the request shape.
  it("a request: exactly one pending connections document, in the app's shape",
      async () => {
        await runWith(["request", "--from", "C", "--to", "A", "--execute"]);
        expect(adds).toHaveLength(1);
        expect(adds[0].collection).toBe("connections");
        expect(adds[0].data).toEqual(connectionRequestDoc({
          requesterId: "uid-C",
          addresseeId: "uid-A",
          createdAt: TS,
        }));
        expect(adds[0].data.status).toBe("pending");
      });
});

describe("refusals that need a read", () => {
  // Mutation: send a message without an existing conversation.
  it("a message between two accounts with no conversation is refused",
      async () => {
        await expect(runWith(
            ["message", "--from", "C", "--to", "A", "--execute"]))
            .rejects.toThrow(/have no conversation/);
        expect(adds).toEqual([]);
      });

  // Mutation: only check pending or accepted connections.
  it("a request when any connection document exists is refused", async () => {
    store.set("connections/conn-AC", {
      requesterId: "uid-A", addresseeId: "uid-C",
      participants: ["uid-A", "uid-C"], status: "declined",
    });
    await expect(runWith(
        ["request", "--from", "C", "--to", "A", "--execute"]))
        .rejects.toThrow(/already exists between C and A: conn-AC \(declined\)/);
    expect(adds).toEqual([]);
  });

  it("a request between connected accounts is refused", async () => {
    await expect(runWith(
        ["request", "--from", "B", "--to", "A", "--execute"]))
        .rejects.toThrow(/already exists between B and A/);
  });
});
