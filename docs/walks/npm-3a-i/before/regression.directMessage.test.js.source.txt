/**
 * NPM-3a-i regression tests, direct-message path (RG1, RG2, RG3, RG5, RG6,
 * RG7).
 *
 * Written against the UNCHANGED functions-notifications/index.js, where every
 * one of them fails, and kept unchanged after the rewrite, where every one of
 * them must pass. They observe outputs only - what is handed to Expo, what is
 * written to Firestore, what reaches the mail client - so they do not care
 * how the sender is structured.
 */

/* global jest, describe, it, expect, beforeEach, afterEach */

const world = require("./helpers/world");

let env;
let notifications;

beforeEach(() => {
  jest.resetModules();
  env = require("./helpers/fakeEnv").install();
  world.seedDeliverable(env);
  notifications = require("../../index");
});

afterEach(() => {
  delete process.env.SENDGRID_API_KEY;
  jest.restoreAllMocks();
});

/**
 * Run the direct-message trigger once for an event.
 * @param {object} event
 * @return {Promise<*>}
 */
function runDm(event) {
  return notifications.notifyOnDirectMessageCreated.run(event);
}

describe("NPM-3a-i direct-message regressions", () => {
  it("RG1: the recipient's direct-message preference off sends nothing", async () => {
    env.seed(`notificationPreferences/${world.RECIPIENT}`, {
      allNotificationsEnabled: true,
      socialConnection: {directMessages: false, connectionRequests: true},
    });
    await runDm(world.dmEvent(env));
    expect(env.sentMessages()).toHaveLength(0);
  });

  it("RG2: the push says New message / {name} sent you a message., no text", async () => {
    await runDm(world.dmEvent(env));
    const sent = env.sentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(world.RECIPIENT_TOKEN);
    expect(sent[0].title).toBe("New message");
    expect(sent[0].body).toBe(`${world.SENDER_NAME} sent you a message.`);
    expect(JSON.stringify(sent)).not.toContain(world.MESSAGE_TEXT);
  });

  it("RG3: writes no notifications document and attempts no email", async () => {
    process.env.SENDGRID_API_KEY = "test-key-not-real";
    await runDm(world.dmEvent(env));
    const bells = env.writes.filter((w) => w.path.startsWith("notifications/"));
    expect(bells).toEqual([]);
    expect(env.mailSend).not.toHaveBeenCalled();
    expect(env.getUser).not.toHaveBeenCalled();
  });

  it("RG5: no accepted connection between the two sends nothing", async () => {
    env.store.delete("connections/conn-accepted");
    await runDm(world.dmEvent(env));
    expect(env.sentMessages()).toHaveLength(0);
  });

  it("RG6: the same event delivered twice sends once", async () => {
    const event = world.dmEvent(env);
    await runDm(event);
    await runDm(event);
    expect(env.sentMessages()).toHaveLength(1);
  });

  it("RG7: a suspended sender sends nothing", async () => {
    env.seed(`users/${world.SENDER}`, {
      displayName: world.SENDER_NAME,
      moderationStatus: "suspended",
      suspendedUntil: require("./helpers/fakeEnv")
          .timestamp(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await runDm(world.dmEvent(env));
    expect(env.sentMessages()).toHaveLength(0);
  });
});
