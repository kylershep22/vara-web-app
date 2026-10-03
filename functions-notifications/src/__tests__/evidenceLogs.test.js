/**
 * NPM-3a-i walk evidence (Kyle's ruling S3-4): every invocation writes
 * exactly one "received" line first and exactly one outcome line last, the
 * "sent" line only after Expo accepts the request, and no line on any path
 * carries message text, names, push tokens or the access token. Also pins
 * the access-token trim (B5) and malformed preferences (S3-1, B6).
 */

/* global jest, describe, it, expect, beforeEach, afterEach */

const world = require("./helpers/world");
const {FAKE_EXPO_ACCESS_TOKEN} = require("./helpers/fakeEnv");

let env;
let notifications;

beforeEach(() => {
  jest.resetModules();
  env = require("./helpers/fakeEnv").install();
  world.seedDeliverable(env);
  notifications = require("../../index");
});

afterEach(() => {
  delete process.env.EXPO_ACCESS_TOKEN;
  jest.restoreAllMocks();
});

/** @return {Array<object>} every community_push line, with its level */
function lines() {
  return env.logs
      .filter((l) => l.args[0] === "community_push")
      .map((l) => Object.assign({level: l.level}, l.args[1]));
}

/**
 * @param {object=} overrides
 * @param {string=} id
 * @return {Promise<*>}
 */
function runDm(overrides, id) {
  return notifications.notifyOnDirectMessageCreated.run(
      world.dmEvent(env, id, overrides));
}

/**
 * @param {object=} overrides
 * @param {string=} id
 * @return {Promise<*>}
 */
function runRequest(overrides, id) {
  return notifications.notifyOnConnectionRequestCreated.run(
      world.requestEvent(env, id, overrides));
}

// Each path, set up and run once. The outcome and reason are what the
// outcome line must say.
const PATHS = [
  ["sent", () => runDm(undefined, "e-sent"), "sent", "sent"],
  ["ineligible: shape", () => runDm({receiverId: world.SENDER}, "e-shape"),
    "ineligible", "shape_ignored"],
  ["ineligible: preference off", () => {
    env.seed(`notificationPreferences/${world.RECIPIENT}`,
        {socialConnection: {directMessages: false}});
    return runDm(undefined, "e-pref");
  }, "ineligible", "preference_off"],
  ["ineligible: failed read", () => {
    env.failures.get.add(`users/${world.SENDER}`);
    return runDm(undefined, "e-read");
  }, "ineligible", "actor_read_failed"],
  ["duplicate", async () => {
    env.seed(`notificationLog/${world.RECIPIENT}/community/e-dup`,
        {kind: "direct_message"});
    return runDm(undefined, "e-dup");
  }, "duplicate", "duplicate_event"],
  ["config missing", () => {
    delete process.env.EXPO_ACCESS_TOKEN;
    return runDm(undefined, "e-config");
  }, "config_missing", "expo_access_token_missing"],
  ["send failed: error ticket", () => {
    env.expoSend.mockImplementationOnce(async () => [{status: "error",
      message: `${world.RECIPIENT_TOKEN} is not registered`,
      details: {error: "DeviceNotRegistered",
        expoPushToken: world.RECIPIENT_TOKEN}}]);
    return runDm(undefined, "e-ticket");
  }, "send_failed", "expo_ticket_error"],
  ["send failed: thrown", () => {
    env.expoSend.mockImplementationOnce(async () => {
      throw Object.assign(new Error("401"), {code: "UNAUTHORIZED"});
    });
    return runDm(undefined, "e-throw");
  }, "send_failed", "expo_send_failed"],
  ["send failed: marker", () => {
    env.failures.create.add(
        `notificationLog/${world.RECIPIENT}/community/e-marker`);
    return runDm(undefined, "e-marker");
  }, "send_failed", "marker_failed"],
  ["connection request sent", () => runRequest(undefined, "e-req"),
    "sent", "sent"],
];

describe("B1 and B2: one received line first, one outcome line last", () => {
  // Mutations: drop or duplicate the received line; log outcomes more than
  // once; write the outcome before the work is done.
  it.each(PATHS)("%s", async (label, run, outcome) => {
    await run();
    const all = lines();
    expect(all).toHaveLength(2);
    expect(all[0].stage).toBe("received");
    expect(all[0].eventId).toMatch(/^e-/);
    expect(["direct_message", "connection_request"]).toContain(all[0].kind);
    expect(Object.keys(all[0]).sort())
        .toEqual(["eventId", "kind", "level", "stage"]);
    expect(all[1].stage).toBe("outcome");
    expect(all[1].outcome).toBe(outcome);
    expect(all[1].eventId).toBe(all[0].eventId);
  });

  it.each(PATHS.filter((p) => p[2] !== "sent"))(
      "%s: the outcome line names the reason code", async (label, run, o, reason) => {
        await run();
        expect(lines()[1].reason).toBe(reason);
      });

  it("an unexpected throw still ends with exactly one outcome line", async () => {
    const event = world.dmEvent(env, "e-boom");
    event.data.data = () => {
      throw Object.assign(new Error("boom"), {code: "INTERNAL"});
    };
    await notifications.notifyOnDirectMessageCreated.run(event);
    const all = lines();
    expect(all.map((l) => l.stage)).toEqual(["received", "outcome"]);
    expect(all[1].outcome).toBe("send_failed");
    expect(all[1].reason).toBe("unexpected_error");
  });

  it("send failures carry Expo's error code", async () => {
    env.expoSend.mockImplementationOnce(async () => [{status: "error",
      details: {error: "MessageRateExceeded"}}]);
    await runDm(undefined, "e-code");
    expect(lines()[1].code).toBe("MessageRateExceeded");
  });
});

describe("B3: the sent line", () => {
  // Mutation: write sent before the response, or on an error ticket, or add
  // the actor's ID to it.
  it("carries exactly the event type, event ID, recipient ID and ticket ID", async () => {
    env.expoSend.mockImplementationOnce(async (messages) =>
      messages.map(() => ({status: "ok", id: "ticket-xyz"})));
    await runDm(undefined, "e-ticket-id");
    const sent = lines()[1];
    expect(sent).toEqual({
      level: "info",
      stage: "outcome",
      outcome: "sent",
      kind: "direct_message",
      eventId: "e-ticket-id",
      recipientId: world.RECIPIENT,
      ticketId: "ticket-xyz",
    });
    expect(JSON.stringify(sent)).not.toContain(world.SENDER);
  });

  it("is written only after Expo has answered", async () => {
    let sentLinesWhileSending;
    let receivedLinesWhileSending;
    env.expoSend.mockImplementationOnce(async (messages) => {
      sentLinesWhileSending = lines().filter((l) => l.outcome === "sent").length;
      receivedLinesWhileSending =
        lines().filter((l) => l.stage === "received").length;
      return messages.map(() => ({status: "ok", id: "t"}));
    });
    await runDm(undefined, "e-order");
    // The received line is written at the start, before any work.
    expect(receivedLinesWhileSending).toBe(1);
    expect(sentLinesWhileSending).toBe(0);
    expect(lines()[1].outcome).toBe("sent");
  });

  it("an error ticket is send_failed, never sent", async () => {
    env.expoSend.mockImplementationOnce(async () => [{status: "error",
      details: {error: "DeviceNotRegistered"}}]);
    await runDm(undefined, "e-err");
    expect(lines().some((l) => l.outcome === "sent")).toBe(false);
  });
});

describe("B4: no line on any path names a person or carries a secret", () => {
  // Mutation: put the text, the sender's name, the push token or the
  // access token into any line.
  it("across every path", async () => {
    env.seed(`users/${world.SENDER}`, {displayName: "Distinctive Name Q"});
    for (const [, run] of PATHS) {
      process.env.EXPO_ACCESS_TOKEN = FAKE_EXPO_ACCESS_TOKEN;
      env.failures.get.clear();
      env.failures.create.clear();
      await run();
    }
    const text = JSON.stringify(lines());
    expect(lines().length).toBe(PATHS.length * 2);
    expect(text).not.toContain(world.MESSAGE_TEXT);
    expect(text).not.toContain("Distinctive Name Q");
    expect(text).not.toContain(world.SENDER_NAME);
    expect(text).not.toContain(world.RECIPIENT_TOKEN);
    expect(text).not.toContain("ExponentPushToken");
    expect(text).not.toContain(FAKE_EXPO_ACCESS_TOKEN);
    expect(env.logText()).not.toContain(FAKE_EXPO_ACCESS_TOKEN);
  });
});

describe("B5: the access token is trimmed before use", () => {
  // Mutation: hand the untrimmed value to the Expo client.
  it("leading and trailing whitespace is removed", async () => {
    process.env.EXPO_ACCESS_TOKEN = `  ${FAKE_EXPO_ACCESS_TOKEN}\n`;
    await runDm(undefined, "e-trim");
    expect(env.expoClients).toEqual([{accessToken: FAKE_EXPO_ACCESS_TOKEN}]);
  });
});

describe("B6: preferences (S3-1)", () => {
  /**
   * @param {object} prefs the recipient's preferences document
   * @return {Promise<object>} the outcome line
   */
  async function outcomeFor(prefs) {
    env.seed(`notificationPreferences/${world.RECIPIENT}`, prefs);
    await runDm(undefined, "e-b6");
    return lines()[1];
  }

  // Mutation: coerce a malformed value to enabled.
  it.each([
    ["null", null],
    ["a string", "true"],
    ["a number", 1],
    ["an object", {on: true}],
  ])("a value that is %s sends nothing and logs an error", async (label, value) => {
    const out = await outcomeFor({socialConnection: {directMessages: value}});
    expect(env.sentMessages()).toHaveLength(0);
    expect(out.level).toBe("error");
    expect(out.outcome).toBe("ineligible");
    expect(out.reason).toBe("preference_malformed");
  });

  it.each([
    ["socialConnection null", {socialConnection: null}],
    ["socialConnection a string", {socialConnection: "on"}],
  ])("%s sends nothing and logs an error", async (label, prefs) => {
    const out = await outcomeFor(prefs);
    expect(env.sentMessages()).toHaveLength(0);
    expect(out.reason).toBe("preference_malformed");
  });

  it.each([
    ["no document", undefined],
    ["no socialConnection", {allNotificationsEnabled: true}],
    ["no key", {socialConnection: {connectionRequests: false}}],
    ["literal true", {socialConnection: {directMessages: true}}],
  ])("%s sends", async (label, prefs) => {
    if (prefs) env.seed(`notificationPreferences/${world.RECIPIENT}`, prefs);
    await runDm(undefined, "e-b6-on");
    expect(env.sentMessages()).toHaveLength(1);
  });

  it("literal false sends nothing, as an info-level ineligible outcome", async () => {
    const out = await outcomeFor({socialConnection: {directMessages: false}});
    expect(env.sentMessages()).toHaveLength(0);
    expect(out.level).toBe("info");
    expect(out.reason).toBe("preference_off");
  });
});
