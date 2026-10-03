/**
 * NPM-3a-ii regression test RG14 (Kyle's II-D4 and II-D17).
 *
 * Both Community pushes carry the recipient's UID as recipientId, so the
 * phone can refuse a push that is not for the account signed in on it. The
 * phone never infers ownership from a payload without one (II-D17).
 *
 * Observes only what is handed to Expo, like the NPM-3a-i regressions.
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
  jest.restoreAllMocks();
});

describe("NPM-3a-ii RG14: recipientId in both Community payloads", () => {
  it("a direct-message push carries recipientId equal to the recipient's UID",
      async () => {
        await notifications.notifyOnDirectMessageCreated.run(
            world.dmEvent(env));
        const sent = env.sentMessages();
        expect(sent).toHaveLength(1);
        expect(sent[0].data.recipientId).toBe(world.RECIPIENT);
      });

  it("a connection-request push carries recipientId equal to the recipient's UID",
      async () => {
        await notifications.notifyOnConnectionRequestCreated.run(
            world.requestEvent(env));
        const sent = env.sentMessages();
        expect(sent).toHaveLength(1);
        expect(sent[0].data.recipientId).toBe(world.RECIPIENT);
      });
});
