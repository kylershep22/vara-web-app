/**
 * RG8 (NPM-3a-i): account deletion removes the notifications documents
 * ADDRESSED TO the deleted user.
 *
 * The notifications codebase writes in-app bell documents keyed by a
 * recipientId field (functions-notifications/index.js createBellNotification),
 * and the sweep matched the notifications collection on userId only. Every
 * bell addressed to a deleted account therefore survived it. Same emulator
 * harness and production-data guard as deleteAccountSweep.test.js.
 */

const admin = require("firebase-admin");
const {deleteUserFirestoreData} = require("../lib/accountDeletion");

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. This suite deletes users and must " +
    "never reach a real project. Run it via `npm test` in functions/.",
  );
}

const projectId = process.env.GCLOUD_PROJECT || "vara-emulator";
if (!admin.apps.length) admin.initializeApp({projectId});
const db = admin.firestore();

jest.setTimeout(60000);

describe("RG8: deleteAccount sweeps notifications by recipientId", () => {
  it("deletes a bell addressed to the user and keeps a bystander's", async () => {
    const uid = `rg8-uid-${Date.now()}`;
    const bystander = `rg8-bystander-${Date.now()}`;

    // The exact shape createBellNotification writes: no userId field.
    const mine = await db.collection("notifications").add({
      recipientId: uid,
      type: "message",
      title: "New message",
      body: "Someone sent you a message.",
      link: "/community?tab=messages",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const theirs = await db.collection("notifications").add({
      recipientId: bystander,
      type: "message",
      title: "New message",
      body: "Someone sent you a message.",
      link: "/community?tab=messages",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Prove the seed landed, or the "is gone" assertion below is vacuous.
    expect((await mine.get()).exists).toBe(true);

    const {counts, failures} = await deleteUserFirestoreData(db, uid);

    expect(failures).toEqual([]);
    expect((await mine.get()).exists).toBe(false);
    expect(counts["notifications.recipientId"]).toBe(1);
    expect((await theirs.get()).exists).toBe(true);
  });
});
