/**
 * Admin Cleanup Cloud Functions
 * Nightly suspension expiry and blocklist management.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const BATCH_LIMIT = 500;

// ---------------------------------------------------------------------------
// cleanupExpiredSuspensions — Nightly at 4 AM ET
// Lifts suspensions whose suspendedUntil timestamp has passed.
// ---------------------------------------------------------------------------
const cleanupExpiredSuspensions = onSchedule("0 4 * * *", async () => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const suspendedSnap = await db
    .collection("users")
    .where("moderationStatus", "==", "suspended")
    .where("suspendedUntil", "<=", now)
    .get();

  if (suspendedSnap.empty) {
    logger.info("cleanupExpiredSuspensions: no expired suspensions found");
    return;
  }

  const docs = suspendedSnap.docs;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    chunk.forEach((doc) => {
      batch.update(doc.ref, {
        moderationStatus: "active",
        suspendedUntil: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  logger.info(`cleanupExpiredSuspensions: unsuspended ${docs.length} user(s)`);
});

// ---------------------------------------------------------------------------
// updateModerationBlocklist — HTTPS Callable (admin only)
// Merges exactMatch, patternMatch, and severity into config/moderationBlocklist.
// ---------------------------------------------------------------------------
const updateModerationBlocklist = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const db = admin.firestore();
  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin only");
  }

  const {exactMatch, patternMatch, severity} = request.data;

  await db.doc("config/moderationBlocklist").set(
    {
      exactMatch,
      patternMatch,
      severity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  logger.info("Blocklist updated by admin", {adminId: uid});
  return {success: true};
});

module.exports = {
  cleanupExpiredSuspensions,
  updateModerationBlocklist,
};
