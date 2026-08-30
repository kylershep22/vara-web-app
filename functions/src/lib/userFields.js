/**
 * MIGRATION_FALLBACK — server-side read-through for the userPrivate migration
 * (slice 2 of 4).
 *
 * WHY THIS EXISTS. Slice 2 moves the push tokens off users/{uid}, which every
 * authenticated account can read, onto the owner-only userPrivate/{uid}. The
 * client writes the new location ONLY — there is deliberately no client
 * dual-write for tokens, because leaving a fresh token on the public document
 * would defeat the point of moving it.
 *
 * That makes the senders the load-bearing half. A user on a new build has their
 * token only in userPrivate; a user who has not updated has it only on
 * users/{uid}. Reading one location would silently stop delivering to half the
 * install base — silently, because a missing token is an early `return`, not an
 * error. So every sender reads through here: userPrivate first, users/{uid} as
 * the fallback.
 *
 * The Admin SDK bypasses security rules, so reaching the owner-only document
 * from here is fine and needs no rule carve-out.
 *
 * SLICE 4 DELETES THIS FILE and its call sites read userPrivate directly.
 */

const admin = require("firebase-admin");

/**
 * Read one field for a user, preferring the private document.
 *
 * @param {string} userId
 * @param {string} field - field name, present on either document
 * @return {Promise<*>} the value, or undefined when neither document has it
 */
async function getUserField(userId, field) {
  const db = admin.firestore();
  const [privateSnap, publicSnap] = await Promise.all([
    db.collection("userPrivate").doc(userId).get(),
    db.collection("users").doc(userId).get(),
  ]);

  const privateValue = privateSnap.exists ?
    privateSnap.data()[field] :
    undefined;
  if (privateValue !== undefined && privateValue !== null) return privateValue;

  return publicSnap.exists ? publicSnap.data()[field] : undefined;
}

/**
 * The FCM token to push to, or undefined if the user has none anywhere.
 *
 * Named rather than inlined at six call sites so slice 4 has one thing to
 * repoint and the senders keep reading as they did.
 *
 * @param {string} userId
 * @return {Promise<string|undefined>}
 */
async function getFcmToken(userId) {
  return getUserField(userId, "fcmToken");
}

/**
 * Merge a user's two documents, private winning, for the callers that need
 * several fields at once. Shallow: no field the senders read is a nested map.
 *
 * Skips the private store's own bookkeeping keys so they cannot shadow the
 * public document's — `createdAt` especially, which on users/{uid} is the
 * account creation time and on userPrivate is merely when the private document
 * was first written.
 *
 * @param {string} userId
 * @return {Promise<object|null>}
 */
async function getMergedUser(userId) {
  const db = admin.firestore();
  const [privateSnap, publicSnap] = await Promise.all([
    db.collection("userPrivate").doc(userId).get(),
    db.collection("users").doc(userId).get(),
  ]);

  if (!privateSnap.exists && !publicSnap.exists) return null;

  const publicData = publicSnap.exists ? publicSnap.data() : {};
  const privateData = privateSnap.exists ? {...privateSnap.data()} : {};
  delete privateData.uid;
  delete privateData.createdAt;
  delete privateData.updatedAt;

  return {...publicData, ...privateData};
}

module.exports = {getUserField, getFcmToken, getMergedUser};
