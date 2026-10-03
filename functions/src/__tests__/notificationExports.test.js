/**
 * NPM-3a-i: the api codebase no longer exports the Community push senders.
 *
 * functions-notifications/ is the single Community sender (Kyle's K2).
 * onNewDirectMessage and onNewConnection pushed through FCM to a token that
 * on iOS is a raw APNs token and cannot be delivered; they were removed with
 * src/notifications/social.js. The four scheduled senders stay, untouched,
 * until NPM-3b.
 */

const notifications = require("../notifications");

describe("api codebase notification exports", () => {
  it("no longer includes onNewDirectMessage or onNewConnection", () => {
    expect(notifications.onNewDirectMessage).toBeUndefined();
    expect(notifications.onNewConnection).toBeUndefined();
  });

  it("still includes the four scheduled senders, and nothing else", () => {
    expect(Object.keys(notifications).sort()).toEqual([
      "sendDailyRhythm",
      "sendHabitReminders",
      "sendInsights",
      "sendMilestones",
    ]);
  });

  it("is what functions/index.js exports, with no Community sender", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
        path.join(__dirname, "..", "..", "index.js"), "utf8");
    expect(source).not.toMatch(/exports\.onNewDirectMessage\b/);
    expect(source).not.toMatch(/exports\.onNewConnection\b/);
    expect(fs.existsSync(
        path.join(__dirname, "..", "notifications", "social.js"))).toBe(false);
  });
});
