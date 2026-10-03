/**
 * notifyOnInviteCreated: characterization, not endorsement.
 *
 * Kyle's ruling K3: "leave `notifyOnInviteCreated` unchanged only because
 * Step 0 proved both ends are web-only. Record it as dormant legacy web
 * infrastructure; do not imply it was reviewed as part of mobile V1."
 *
 * So this pins what the function does TODAY - nothing more. It triggers on
 * connectionInvites, which only the dormant web app writes
 * (src/pages/Profile/ProfilePage.jsx), writes one bell document, sends no
 * push, and emails only when SENDGRID_API_KEY is present at runtime (Kyle
 * confirmed it is not). Its job here is to fail if the NPM-3a-i restructure
 * changes that behaviour by accident.
 */

/* global jest, describe, it, expect, beforeEach, afterEach */

const {SERVER_TIMESTAMP} = require("./helpers/fakeEnv");

let env;
let notifications;

beforeEach(() => {
  jest.resetModules();
  env = require("./helpers/fakeEnv").install();
  env.seed("users/web-from", {displayName: "Web Sender"});
  notifications = require("../../index");
});

afterEach(() => {
  delete process.env.SENDGRID_API_KEY;
  jest.restoreAllMocks();
});

/**
 * Seed an invite and run the trigger.
 * @param {object} data
 * @return {Promise<*>}
 */
async function runInvite(data) {
  env.seed("connectionInvites/inv-1", data);
  return notifications.notifyOnInviteCreated.run(
      env.event("connectionInvites/inv-1", {inviteId: "inv-1"}),
  );
}

describe("notifyOnInviteCreated (dormant legacy web infrastructure)", () => {
  it("writes exactly one bell document in today's shape and no push", async () => {
    await runInvite({from: "web-from", to: "web-to", status: "pending"});
    const bells = env.writes.filter((w) => w.path.startsWith("notifications/"));
    expect(bells).toHaveLength(1);
    expect(bells[0].op).toBe("add");
    expect(bells[0].data).toEqual({
      recipientId: "web-to",
      type: "invite",
      title: "New connection request",
      body: "Web Sender sent you a connection request.",
      link: "/community",
      read: false,
      createdAt: SERVER_TIMESTAMP,
    });
    expect(env.sentMessages()).toHaveLength(0);
    expect(env.mailSend).not.toHaveBeenCalled();
  });

  it("emails only when SENDGRID_API_KEY is present at runtime", async () => {
    process.env.SENDGRID_API_KEY = "test-key-not-real";
    await runInvite({from: "web-from", to: "web-to", status: "pending"});
    expect(env.mailSend).toHaveBeenCalledTimes(1);
    expect(env.mailSend.mock.calls[0][0]).toEqual({
      to: "web-to@example.test",
      from: "no-reply@vara.app",
      subject: "You have a new connection request",
      text: "Web Sender sent you a connection request.",
    });
  });

  it("does nothing for a non-pending invite or a missing party", async () => {
    await runInvite({from: "web-from", to: "web-to", status: "accepted"});
    await runInvite({from: "web-from", status: "pending"});
    expect(env.writes.filter((w) => w.path.startsWith("notifications/")))
        .toEqual([]);
  });

  it("falls back to Someone when the sender has no profile", async () => {
    await runInvite({from: "no-profile", to: "web-to", status: "pending"});
    const bells = env.writes.filter((w) => w.path.startsWith("notifications/"));
    expect(bells[0].data.body).toBe("Someone sent you a connection request.");
  });
});
