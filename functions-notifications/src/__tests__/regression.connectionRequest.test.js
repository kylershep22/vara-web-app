/**
 * NPM-3a-i regression test, connection-request path (RG4).
 *
 * The mobile app writes connections/{auto} as {requesterId, addresseeId,
 * participants, status: "pending", createdAt}. Today no function in this
 * codebase listens there, and the api codebase's onNewConnection reads a/b,
 * so a request produces no push for anyone. This test fails on the unchanged
 * code and must pass, unchanged, after the rewrite.
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

describe("NPM-3a-i connection-request regression", () => {
  it("RG4: a mobile-shape request sends exactly one push to the addressee", async () => {
    expect(typeof notifications.notifyOnConnectionRequestCreated)
        .toBe("function");
    await notifications.notifyOnConnectionRequestCreated.run(
        world.requestEvent(env),
    );
    const sent = env.sentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(world.RECIPIENT_TOKEN);
    expect(sent[0].title).toBe("New connection request");
    expect(sent[0].body)
        .toBe(`${world.SENDER_NAME} wants to connect. Open Vara to respond.`);
  });
});
