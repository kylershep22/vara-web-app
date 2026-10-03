/**
 * NPM-3a-i: the Expo access token (Kyle approved Expo's enhanced push
 * security).
 *
 * Every request to Expo's push API must carry "Authorization: Bearer
 * <token>". The token is the EXPO_ACCESS_TOKEN function secret, bound only
 * to the two Community triggers. Without it nothing is sent, and the check
 * runs before the duplicate marker so a configuration fault does not consume
 * it. The value never appears in a log.
 *
 * The header tests use the REAL expo-server-sdk with node-fetch mocked, so
 * they observe the actual HTTP request the SDK builds rather than trusting
 * that a constructor option becomes a header. The value used here is an
 * obviously fake one from fakeEnv; the real secret is never in this repo.
 */

/* global jest, describe, it, expect, afterEach */

const world = require("./helpers/world");
const {FAKE_EXPO_ACCESS_TOKEN} = require("./helpers/fakeEnv");

let env;
let notifications;
let fetchMock;

/**
 * Install the fake world. With realExpo, node-fetch is mocked and answers
 * with the given status and body.
 * @param {object=} options
 * @param {boolean=} options.realExpo
 * @param {number=} options.status
 * @param {object=} options.body
 */
function setup(options) {
  const opts = options || {};
  jest.resetModules();
  fetchMock = jest.fn(async () => ({
    status: opts.status || 200,
    statusText: opts.status === 401 ? "Unauthorized" : "OK",
    text: async () => JSON.stringify(opts.body ||
      {data: [{status: "ok", id: "ticket-1"}]}),
  }));
  env = require("./helpers/fakeEnv").install(opts.realExpo ?
    {realExpo: true, fetch: fetchMock} : {});
  world.seedDeliverable(env);
  notifications = require("../../index");
}

afterEach(() => {
  delete process.env.EXPO_ACCESS_TOKEN;
  jest.restoreAllMocks();
});

/** @return {Array<object>} structured community_push log payloads */
function pushLogs() {
  // The outcome line of each invocation (src/community/log.js). The
  // received lines are pinned in evidenceLogs.test.js.
  return env.logs
      .filter((l) => l.args[0] === "community_push" &&
        l.args[1] && l.args[1].stage === "outcome")
      .map((l) => Object.assign({level: l.level}, l.args[1]));
}

/** @return {Array<object>} marker creates written */
function markerWrites() {
  return env.writes.filter((w) => w.path.startsWith("notificationLog/"));
}

describe("the access token on the request", () => {
  // Mutation: construct the Expo client without the access token.
  it("every Expo request carries Authorization: Bearer <token>", async () => {
    setup({realExpo: true});
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    await notifications.notifyOnConnectionRequestCreated.run(
        world.requestEvent(env));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      const [url, init] = call;
      expect(url).toContain("exp.host");
      expect(init.headers.get("authorization"))
          .toBe(`Bearer ${FAKE_EXPO_ACCESS_TOKEN}`);
    }
  });

  it("the fake client is also handed the token (fake-SDK suites)", async () => {
    setup();
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    expect(env.expoClients).toEqual([{accessToken: FAKE_EXPO_ACCESS_TOKEN}]);
  });
});

describe("the harness", () => {
  // Guards the guard: no suite in this codebase may reach Expo's servers.
  it("blocks the network unless a test supplies a fetch stand-in", async () => {
    setup();
    const fetch = require("node-fetch");
    await expect(fetch.default("https://exp.host/--/api/v2/push/send"))
        .rejects.toThrow(/network blocked/);
  });

  it("refuses real-SDK mode without a fetch stand-in", () => {
    jest.resetModules();
    expect(() => require("./helpers/fakeEnv").install({realExpo: true}))
        .toThrow(/requires a fetch stand-in/);
  });
});

describe("binding", () => {
  /**
   * @param {object} fn a v2 CloudFunction
   * @return {Array<string>} the secret names bound to it
   */
  function boundSecrets(fn) {
    const env = fn.__endpoint.secretEnvironmentVariables || [];
    return env.map((s) => s.key).sort();
  }

  // Mutation: drop the secrets option from either Community trigger, or add
  // it to the invite trigger.
  it("binds EXPO_ACCESS_TOKEN to the two Community triggers only", () => {
    setup();
    expect(boundSecrets(notifications.notifyOnDirectMessageCreated))
        .toEqual(["EXPO_ACCESS_TOKEN"]);
    expect(boundSecrets(notifications.notifyOnConnectionRequestCreated))
        .toEqual(["EXPO_ACCESS_TOKEN"]);
    expect(boundSecrets(notifications.notifyOnInviteCreated)).toEqual([]);
  });
});

describe("a missing token", () => {
  // Mutation: remove the token check (the push is sent with no token), or
  // move it after the marker (the marker is consumed).
  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["whitespace", "   "],
  ])("%s: sends nothing, logs the reason, writes no marker", async (label, value) => {
    setup();
    if (value === undefined) delete process.env.EXPO_ACCESS_TOKEN;
    else process.env.EXPO_ACCESS_TOKEN = value;
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    await notifications.notifyOnConnectionRequestCreated.run(
        world.requestEvent(env));
    expect(env.sentMessages()).toHaveLength(0);
    expect(markerWrites()).toEqual([]);
    const errors = pushLogs().filter((l) => l.level === "error");
    expect(errors.map((l) => l.reason)).toEqual(
        ["expo_access_token_missing", "expo_access_token_missing"]);
  });

  it("an event refused for a missing token sends once the token is back", async () => {
    setup();
    delete process.env.EXPO_ACCESS_TOKEN;
    const event = world.dmEvent(env);
    await notifications.notifyOnDirectMessageCreated.run(event);
    process.env.EXPO_ACCESS_TOKEN = FAKE_EXPO_ACCESS_TOKEN;
    await notifications.notifyOnDirectMessageCreated.run(event);
    expect(env.sentMessages()).toHaveLength(1);
  });
});

describe("unauthorized response from Expo", () => {
  // Mutation: retry a failed send, or log the error message (which can carry
  // detail) instead of the code.
  it("is logged by code only and not retried", async () => {
    setup({
      realExpo: true,
      status: 401,
      body: {errors: [{
        code: "UNAUTHORIZED",
        message: `The bearer token ${FAKE_EXPO_ACCESS_TOKEN} is invalid.`,
      }]},
    });
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const errors = pushLogs().filter((l) => l.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("expo_send_failed");
    expect(errors[0].code).toBe("UNAUTHORIZED");
    expect(env.logText()).not.toContain(FAKE_EXPO_ACCESS_TOKEN);
  });
});

describe("logs", () => {
  // Mutation: log the access token anywhere.
  it("never contain the token value, on any path", async () => {
    setup();
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    await notifications.notifyOnDirectMessageCreated.run(world.dmEvent(env));
    env.expoSend.mockImplementationOnce(async () => {
      throw Object.assign(new Error("boom"), {code: "UNAUTHORIZED"});
    });
    await notifications.notifyOnConnectionRequestCreated.run(
        world.requestEvent(env));
    delete process.env.EXPO_ACCESS_TOKEN;
    await notifications.notifyOnDirectMessageCreated.run(
        world.dmEvent(env, "msg-2"));
    expect(pushLogs().length).toBeGreaterThanOrEqual(4);
    expect(env.logText()).not.toContain(FAKE_EXPO_ACCESS_TOKEN);
  });
});
