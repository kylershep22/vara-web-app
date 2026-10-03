/**
 * NPM-3a-i Community push sender: the rules beyond the eight regressions.
 *
 * Every test here names the mutation it exists to catch. The positive
 * controls (a deliverable world sends exactly one push) are what stop the
 * "sends nothing" tests from passing vacuously.
 */

/* global jest, describe, it, expect, beforeEach, afterEach */

const world = require("./helpers/world");
const {timestamp} = require("./helpers/fakeEnv");

const DAY = 24 * 60 * 60 * 1000;

let env;
let notifications;

beforeEach(() => {
  jest.resetModules();
  env = require("./helpers/fakeEnv").install();
  world.seedDeliverable(env);
  notifications = require("../../index");
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * @param {object=} overrides fields on the direct message
 * @param {string=} id
 * @return {Promise<*>}
 */
function runDm(overrides, id) {
  return notifications.notifyOnDirectMessageCreated.run(
      world.dmEvent(env, id, overrides));
}

/**
 * @param {object=} overrides fields on the connection document
 * @param {string=} id
 * @return {Promise<*>}
 */
function runRequest(overrides, id) {
  return notifications.notifyOnConnectionRequestCreated.run(
      world.requestEvent(env, id, overrides));
}

/** @return {Array<object>} the structured community_push log payloads */
function pushLogs() {
  // The outcome line of each invocation (src/community/log.js). The
  // received lines are pinned in evidenceLogs.test.js.
  return env.logs
      .filter((l) => l.args[0] === "community_push" &&
        l.args[1] && l.args[1].stage === "outcome")
      .map((l) => Object.assign({level: l.level}, l.args[1]));
}

/** @return {Array<string>} reason codes logged at error level */
function errorReasons() {
  return pushLogs().filter((l) => l.level === "error").map((l) => l.reason);
}

/**
 * Seed the recipient's preferences document.
 * @param {object} data
 */
function seedPrefs(data) {
  env.seed(`notificationPreferences/${world.RECIPIENT}`, data);
}

describe("controls", () => {
  it("a deliverable direct message sends exactly one push", async () => {
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
    expect(errorReasons()).toEqual([]);
  });

  it("a deliverable connection request sends exactly one push", async () => {
    await runRequest();
    expect(env.sentMessages()).toHaveLength(1);
    expect(errorReasons()).toEqual([]);
  });
});

describe("independence from General, quiet hours and the server flag", () => {
  // Mutation: read allNotificationsEnabled and stop when it is false.
  it("General off still sends", async () => {
    seedPrefs({
      allNotificationsEnabled: false,
      socialConnection: {directMessages: true, connectionRequests: true},
    });
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(2);
  });

  // Mutation: stop when stored quietHours.enabled is true.
  it("stored quiet hours covering every minute of the day still send", async () => {
    seedPrefs({
      quietHours: {
        enabled: true,
        startTime: {hour: 0, minute: 0},
        endTime: {hour: 23, minute: 59},
      },
    });
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(2);
  });

  // Mutation: read config/notifications.serverPushEnabled and require true.
  it.each([
    ["missing", undefined],
    ["false", {serverPushEnabled: false}],
    ["true", {serverPushEnabled: true}],
  ])("serverPushEnabled %s: both events still send", async (label, config) => {
    if (config) env.seed("config/notifications", config);
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(2);
  });
});

describe("the duplicate marker", () => {
  // Mutation: continue to the send when marker creation fails.
  it("a marker that cannot be created sends nothing and logs an error", async () => {
    env.failures.create.add(
        `notificationLog/${world.RECIPIENT}/community/msg-1`);
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(["marker_failed"]);
  });

  // Mutation: write the marker anywhere but the recipient's community log.
  it("is written at notificationLog/{recipient}/community/{eventId}", async () => {
    await runDm(undefined, "msg-77");
    await runRequest(undefined, "conn-77");
    const markers = env.writes.filter((w) => w.op === "create")
        .map((w) => w.path);
    expect(markers).toEqual([
      `notificationLog/${world.RECIPIENT}/community/msg-77`,
      `notificationLog/${world.RECIPIENT}/community/conn-77`,
    ]);
  });

  // Mutation: send before writing the marker.
  it("is written before the send", async () => {
    let markerAtSend;
    env.expoSend.mockImplementationOnce(async (messages) => {
      markerAtSend = env.store.has(
          `notificationLog/${world.RECIPIENT}/community/msg-1`);
      return messages.map(() => ({status: "ok", id: "t"}));
    });
    await runDm();
    expect(markerAtSend).toBe(true);
  });
});

describe("accepted connection (direct messages only)", () => {
  // Mutation: drop the status === "accepted" check.
  it("a pending-only connection sends no direct-message push", async () => {
    env.seed("connections/conn-accepted", {
      requesterId: world.SENDER,
      addresseeId: world.RECIPIENT,
      participants: [world.SENDER, world.RECIPIENT],
      status: "pending",
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
  });

  // Mutation: accept a connection between the sender and somebody else.
  it("an accepted connection with a third user does not count", async () => {
    env.seed("connections/conn-accepted", {
      requesterId: world.SENDER,
      addresseeId: "someone-else",
      participants: [world.SENDER, "someone-else"],
      status: "accepted",
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
  });

  it("counts a connection the recipient requested", async () => {
    env.seed("connections/conn-accepted", {
      requesterId: world.RECIPIENT,
      addresseeId: world.SENDER,
      participants: [world.RECIPIENT, world.SENDER],
      status: "accepted",
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
  });

  // Mutation: query connections without the sender scope.
  it("only ever queries connections scoped by the sender", async () => {
    await runDm();
    expect(env.queries).toEqual([{
      path: "connections",
      filters: [["participants", "array-contains", world.SENDER]],
      limit: undefined,
    }]);
  });

  // Mutation: treat a failed connection read as "connected".
  it("a failed connection read sends nothing and logs an error", async () => {
    env.failures.query.add("connections");
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(["connection_read_failed"]);
  });

  it("a connection request does not need an existing connection", async () => {
    env.store.delete("connections/conn-accepted");
    await runRequest();
    expect(env.sentMessages()).toHaveLength(1);
  });
});

describe("actor status (mirrors isActiveUser in firestore.rules)", () => {
  /**
   * @param {object} fields extra fields on the actor's users document
   */
  function seedActor(fields) {
    env.seed(`users/${world.SENDER}`,
        Object.assign({displayName: world.SENDER_NAME}, fields));
  }

  // Mutation: treat a failed actor read as an absent document (active).
  it("a failed actor-status read sends nothing and logs an error", async () => {
    env.failures.get.add(`users/${world.SENDER}`);
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(["actor_read_failed", "actor_read_failed"]);
  });

  // Mutation: treat a suspended actor as active for connection requests.
  it("a suspended requester causes no connection-request push", async () => {
    seedActor({
      moderationStatus: "suspended",
      suspendedUntil: timestamp(Date.now() + DAY),
    });
    await runRequest();
    expect(env.sentMessages()).toHaveLength(0);
  });

  // Mutation: treat every 'suspended' as inactive regardless of expiry.
  it("an expired suspension counts as active, as in the rules", async () => {
    seedActor({
      moderationStatus: "suspended",
      suspendedUntil: timestamp(Date.now() - DAY),
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
  });

  // Mutation: treat a suspension with no end as expired.
  it("a suspension with no suspendedUntil stays inactive", async () => {
    seedActor({moderationStatus: "suspended"});
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
  });

  // Mutation: only check for "suspended".
  it("a banned actor sends nothing", async () => {
    seedActor({moderationStatus: "banned"});
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(0);
  });

  it.each([
    ["absent field", {}],
    ["null", {moderationStatus: null}],
    ["active", {moderationStatus: "active"}],
  ])("moderationStatus %s is active", async (label, fields) => {
    env.seed(`users/${world.SENDER}`,
        Object.assign({displayName: world.SENDER_NAME}, fields));
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
  });

  it("an actor with no users document is active and named Someone", async () => {
    env.store.delete(`users/${world.SENDER}`);
    await runDm();
    expect(env.sentMessages()[0].body).toBe("Someone sent you a message.");
  });
});

describe("recipient preferences", () => {
  it("a missing preferences document sends (Community defaults on)", async () => {
    expect(env.store.has(`notificationPreferences/${world.RECIPIENT}`))
        .toBe(false);
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(2);
  });

  it("a preferences document without socialConnection sends", async () => {
    seedPrefs({allNotificationsEnabled: true});
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
  });

  // Mutation: treat a failed preferences read as document absence.
  it("a failed preferences read sends nothing and logs an error", async () => {
    env.failures.get.add(`notificationPreferences/${world.RECIPIENT}`);
    await runDm();
    await runRequest();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(
        ["preference_read_failed", "preference_read_failed"]);
  });

  // Mutation: treat a non-boolean preference value as on.
  it("a malformed preference value sends nothing and logs an error", async () => {
    seedPrefs({socialConnection: {directMessages: null}});
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(["preference_malformed"]);
  });

  // Mutation: read the directMessages field for connection requests.
  it("connection-request preference off sends nothing", async () => {
    seedPrefs({
      socialConnection: {directMessages: true, connectionRequests: false},
    });
    await runRequest();
    expect(env.sentMessages()).toHaveLength(0);
    await runDm();
    expect(env.sentMessages()).toHaveLength(1);
  });
});

describe("the Expo token", () => {
  // Mutation: log a missing token at error level.
  it("a missing token sends nothing and logs no error", async () => {
    env.store.delete(`userPrivate/${world.RECIPIENT}`);
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual([]);
    expect(pushLogs().map((l) => l.reason)).toEqual(["token_missing"]);
  });

  // Mutation: treat a failed token read as a missing token.
  it("a failed token read sends nothing and logs an error", async () => {
    env.failures.get.add(`userPrivate/${world.RECIPIENT}`);
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual(["token_read_failed"]);
  });

  // Mutation: fall back to users/{uid}.expoPushToken.
  it("a token present only on users/{uid} is ignored", async () => {
    env.store.delete(`userPrivate/${world.RECIPIENT}`);
    env.seed(`users/${world.RECIPIENT}`, {
      displayName: "Riley Recipient",
      expoPushToken: "ExponentPushToken[legacy-public-token]",
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
  });

  // Mutation: drop the Expo token shape check.
  it("a malformed token (the raw APNs hex) sends nothing, no error", async () => {
    env.seed(`userPrivate/${world.RECIPIENT}`, {
      expoPushToken: "a".repeat(64),
      fcmToken: "b".repeat(64),
    });
    await runDm();
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual([]);
  });
});

describe("the sender's name", () => {
  /**
   * @param {*} displayName
   * @return {Promise<string>} the body of the one push sent
   */
  async function bodyFor(displayName) {
    env.seed(`users/${world.SENDER}`, {displayName});
    await runDm();
    return env.sentMessages()[0].body;
  }

  // Mutation: remove the 50-character clamp.
  it("is trimmed and cut to 50 characters", async () => {
    const long = `  ${"x".repeat(60)}  `;
    expect(await bodyFor(long)).toBe(`${"x".repeat(50)} sent you a message.`);
  });

  it("never splits a character made of two code units", async () => {
    const name = `${"y".repeat(49)}😀😀`;
    expect(await bodyFor(name)).toBe(`${"y".repeat(49)}😀 sent you a message.`);
  });

  // Mutation: remove the Someone fallback.
  it.each([["empty", ""], ["whitespace", "   "], ["not a string", 42]])(
      "is Someone when %s", async (label, value) => {
        expect(await bodyFor(value)).toBe("Someone sent you a message.");
      });
});

describe("event shape", () => {
  // Mutation: remove the senderId !== receiverId check. The sender is given
  // an accepted "connection" with themselves so the connection rule cannot
  // mask the mutation.
  it("a message to yourself sends nothing", async () => {
    env.seed(`userPrivate/${world.SENDER}`,
        {expoPushToken: "ExponentPushToken[sender-token]"});
    env.seed("connections/self", {
      requesterId: world.SENDER,
      addresseeId: world.SENDER,
      participants: [world.SENDER, world.SENDER],
      status: "accepted",
    });
    await runDm({receiverId: world.SENDER});
    expect(env.sentMessages()).toHaveLength(0);
    expect(pushLogs().map((l) => l.reason)).toEqual(["shape_ignored"]);
  });

  // Mutation: remove the requesterId !== addresseeId check. The sender is
  // given a token so that a missing token cannot mask the mutation.
  it("a connection request to yourself sends nothing", async () => {
    env.seed(`userPrivate/${world.SENDER}`,
        {expoPushToken: "ExponentPushToken[sender-token]"});
    await runRequest({addresseeId: world.SENDER,
      participants: [world.SENDER, world.SENDER]});
    expect(env.sentMessages()).toHaveLength(0);
    expect(pushLogs().map((l) => l.reason)).toEqual(["shape_ignored"]);
  });

  // Mutation: drop the status === "pending" check.
  it("a connection created as accepted sends nothing", async () => {
    await runRequest({status: "accepted"});
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual([]);
  });

  // Mutation: fall back to the legacy a/b fields.
  it("a legacy-shape connection sends nothing and is not an error", async () => {
    env.seed("connections/legacy", {
      a: world.SENDER, b: world.RECIPIENT, status: "pending",
    });
    await notifications.notifyOnConnectionRequestCreated.run(
        env.event("connections/legacy", {connectionId: "legacy"}));
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual([]);
  });

  it("a direct message missing receiverId or conversationId sends nothing", async () => {
    await runDm({receiverId: undefined}, "m-a");
    await runDm({conversationId: undefined}, "m-b");
    expect(env.sentMessages()).toHaveLength(0);
    expect(errorReasons()).toEqual([]);
  });
});

describe("the push itself", () => {
  // Mutation: add a badge, change the sound, or change the data keys.
  it("direct message: default sound, no badge, fixed data", async () => {
    await runDm(undefined, "msg-9");
    const [message] = env.sentMessages();
    expect(message.sound).toBe("default");
    expect("badge" in message).toBe(false);
    expect(message.data).toEqual({
      type: "direct_message",
      conversationId: "conv-1",
      messageId: "msg-9",
      senderId: world.SENDER,
    });
  });

  it("connection request: default sound, no badge, fixed data", async () => {
    await runRequest(undefined, "conn-9");
    const [message] = env.sentMessages();
    expect(message.sound).toBe("default");
    expect("badge" in message).toBe(false);
    expect(message.data).toEqual({
      type: "connection_request",
      connectionId: "conn-9",
      requesterId: world.SENDER,
    });
  });

  it("an Expo error ticket is logged with Expo's code only", async () => {
    env.expoSend.mockImplementationOnce(async () => [{
      status: "error",
      message: `${world.RECIPIENT_TOKEN} is not a registered recipient`,
      details: {error: "DeviceNotRegistered",
        expoPushToken: world.RECIPIENT_TOKEN},
    }]);
    await runDm();
    const errors = pushLogs().filter((l) => l.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toBe("expo_ticket_error");
    expect(errors[0].code).toBe("DeviceNotRegistered");
    expect(env.logText()).not.toContain(world.RECIPIENT_TOKEN);
  });

  it("an Expo send that throws is logged and not retried", async () => {
    env.expoSend.mockImplementationOnce(async () => {
      throw Object.assign(new Error("network"), {code: "ECONNRESET"});
    });
    await runDm();
    expect(env.expoSend).toHaveBeenCalledTimes(1);
    expect(errorReasons()).toEqual(["expo_send_failed"]);
  });
});

describe("logs", () => {
  // Mutation: put the actor's name, the token or the text in a log entry.
  it("never contain message text, display names or tokens", async () => {
    env.seed(`users/${world.SENDER}`, {displayName: "Distinctive Name Q"});
    await runDm(undefined, "m-1");
    await runDm(undefined, "m-1");
    await runRequest();
    env.failures.get.add(`userPrivate/${world.RECIPIENT}`);
    await runDm(undefined, "m-2");
    expect(pushLogs().length).toBeGreaterThanOrEqual(4);
    const text = env.logText();
    expect(text).not.toContain(world.MESSAGE_TEXT);
    expect(text).not.toContain("Distinctive Name Q");
    expect(text).not.toContain(world.RECIPIENT_TOKEN);
    expect(text).not.toContain("ExponentPushToken");
  });

  it("carry only fixed keys: IDs, a reason code and an error code", async () => {
    env.store.delete(`userPrivate/${world.RECIPIENT}`);
    await runDm(undefined, "m-keys");
    const entries = pushLogs();
    expect(entries).toHaveLength(1);
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(
          ["actorId", "code", "eventId", "kind", "level", "outcome", "reason",
            "recipientId", "stage"]);
    }
  });
});

describe("exports", () => {
  it("are exactly the two Community senders and the legacy invite", () => {
    expect(Object.keys(notifications).sort()).toEqual([
      "notifyOnConnectionRequestCreated",
      "notifyOnDirectMessageCreated",
      "notifyOnInviteCreated",
    ]);
  });
});
