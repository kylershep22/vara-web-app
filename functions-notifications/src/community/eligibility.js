/**
 * Community push delivery eligibility: the single decision point for whether
 * a Community event may produce a push.
 *
 * Both events go through checkDeliveryEligibility, in a fixed order that
 * stops at the first "no":
 *   1. event shape
 *   2. actor status (and the actor's display name, from the same read)
 *   3. direct messages only: an accepted connection between the two
 *   4. the recipient's Community preference
 *   5. the recipient's Expo push token
 *
 * THIS IS WHERE BLOCKING GOES. A later slice adds "neither user has blocked
 * the other" here, so both events inherit it.
 *
 * WHAT THIS NEVER READS: allNotificationsEnabled (Kyle's ruling 7: Community
 * preferences are independent of General), quiet hours (ruling 9) and
 * serverPushEnabled (D1: Community pushes do not read that flag).
 *
 * READ FAILURES ARE NOT ABSENCE (K6 and ruling 3). A document that does not
 * exist is an authoritative answer; a read that throws is not. Every failed
 * or indeterminate read stops the push with an error-level reason.
 */

const {Expo} = require("expo-server-sdk");

/**
 * @param {*} value
 * @return {boolean} a non-empty string
 */
function isId(value) {
  return typeof value === "string" && value.length > 0;
}

/**
 * Event kinds. parse() returns null for any shape this sender does not
 * handle - including legacy shapes - which is "send nothing", not an error.
 */
const KINDS = {
  direct_message: {
    preference: "directMessages",
    requiresConnection: true,
    /**
     * The shape mobile's sendDirectMessage writes.
     * @param {object} data
     * @return {object|null}
     */
    parse(data) {
      if (!data) return null;
      const {senderId, receiverId, conversationId} = data;
      if (!isId(senderId) || !isId(receiverId)) return null;
      if (senderId === receiverId) return null;
      if (!isId(conversationId)) return null;
      return {actorId: senderId, recipientId: receiverId, conversationId};
    },
  },
  connection_request: {
    preference: "connectionRequests",
    requiresConnection: false,
    /**
     * The shape mobile's sendConnectionRequest writes, created pending.
     * @param {object} data
     * @return {object|null}
     */
    parse(data) {
      if (!data) return null;
      const {requesterId, addresseeId, status} = data;
      if (!isId(requesterId) || !isId(addresseeId)) return null;
      if (requesterId === addresseeId) return null;
      if (status !== "pending") return null;
      return {actorId: requesterId, recipientId: addresseeId};
    },
  },
};

/**
 * @param {*} value a Firestore Timestamp, or anything else
 * @return {number} epoch ms, or NaN when it is not a timestamp
 */
function toMillis(value) {
  return value && typeof value.toMillis === "function" ?
    value.toMillis() : NaN;
}

/**
 * Mirror of isActiveUser() in firestore.rules (lines 46 to 57 at 7e8750b):
 *
 *   function isActiveUser() {
 *     let userPath =
 *       /databases/$(database)/documents/users/$(request.auth.uid);
 *     return !exists(userPath)
 *       || !('moderationStatus' in get(userPath).data)
 *       || get(userPath).data.moderationStatus == null
 *       || get(userPath).data.moderationStatus == 'active'
 *       || (get(userPath).data.moderationStatus == 'suspended'
 *           && get(userPath).data.suspendedUntil != null
 *           && get(userPath).data.suspendedUntil < request.time);
 *   }
 *
 * A missing suspendedUntil, or one that is not a timestamp, cannot compare
 * as earlier than now in the rules either, so both count as still suspended.
 * 'banned' and any other status are inactive.
 *
 * @param {object|undefined} userData undefined when the document is absent
 * @param {number} nowMs
 * @return {boolean}
 */
function isActiveUser(userData, nowMs) {
  if (userData === undefined) return true;
  if (!("moderationStatus" in userData)) return true;
  const status = userData.moderationStatus;
  if (status === null || status === "active") return true;
  if (status !== "suspended") return false;
  const until = toMillis(userData.suspendedUntil);
  return !Number.isNaN(until) && until < nowMs;
}

/**
 * Display name for a push: trimmed, at most 50 characters, "Someone" when
 * empty or missing. Counts code points, so an emoji is never split in half.
 * @param {object|undefined} userData
 * @return {string}
 */
function pushDisplayName(userData) {
  const raw = userData && typeof userData.displayName === "string" ?
    userData.displayName.trim() : "";
  if (!raw) return "Someone";
  return Array.from(raw).slice(0, 50).join("");
}

/**
 * Whether an accepted connection exists between two users, in the shape the
 * mobile app writes: {requesterId, addresseeId, participants, status}.
 *
 * THE QUERY: connections where participants array-contains the SENDER. It is
 * scoped to the sender's own connections (never the whole collection) and is
 * a single-field array-contains, which Firestore indexes automatically, so it
 * needs no composite index. The status and the other party are checked here,
 * in code, over that bounded sender-specific result set.
 *
 * @param {object} db
 * @param {string} senderId
 * @param {string} recipientId
 * @return {Promise<boolean>}
 */
async function hasAcceptedConnection(db, senderId, recipientId) {
  const snap = await db.collection("connections")
      .where("participants", "array-contains", senderId)
      .get();
  return snap.docs.some((doc) => {
    const c = doc.data() || {};
    if (c.status !== "accepted") return false;
    if (!Array.isArray(c.participants)) return false;
    if (!c.participants.includes(recipientId)) return false;
    return (c.requesterId === senderId && c.addresseeId === recipientId) ||
      (c.requesterId === recipientId && c.addresseeId === senderId);
  });
}

/**
 * The recipient's choice for one Community preference.
 * @param {object} snap notificationPreferences/{recipient} snapshot
 * @param {string} field directMessages | connectionRequests
 * @return {string} on | off | malformed
 */
function preferenceState(snap, field) {
  // Authoritative absence of the document: the Community defaults, which
  // are on for both (K6).
  if (!snap.exists) return "on";
  const data = snap.data() || {};
  const social = data.socialConnection;
  if (social === undefined) return "on";
  if (social === null || typeof social !== "object" || Array.isArray(social)) {
    return "malformed";
  }
  const value = social[field];
  if (value === undefined || value === true) return "on";
  if (value === false) return "off";
  return "malformed";
}

/**
 * Decide whether a Community event may produce a push.
 *
 * @param {object} db Firestore (Admin SDK)
 * @param {object} input
 * @param {string} input.kind direct_message | connection_request
 * @param {object|undefined} input.data the triggering document's data
 * @param {number=} input.nowMs for tests
 * @return {Promise<object>} {ok: true, ...} with everything the send needs,
 *   or {ok: false, level, reason, actorId?, recipientId?}
 */
async function checkDeliveryEligibility(db, input) {
  const kind = KINDS[input.kind];
  if (!kind) return {ok: false, level: "error", reason: "unknown_kind"};

  // 1. Event shape.
  const parsed = kind.parse(input.data);
  if (!parsed) return {ok: false, level: "info", reason: "shape_ignored"};
  const {actorId, recipientId} = parsed;
  const no = (level, reason, code) =>
    ({ok: false, level, reason, code, actorId, recipientId});

  // 2. Actor status, and the actor's name from the same read.
  let actorData;
  try {
    const actorSnap = await db.doc(`users/${actorId}`).get();
    actorData = actorSnap.exists ? actorSnap.data() || {} : undefined;
  } catch (err) {
    return no("error", "actor_read_failed", err.code);
  }
  const now = typeof input.nowMs === "number" ? input.nowMs : Date.now();
  if (!isActiveUser(actorData, now)) return no("info", "actor_inactive");

  // 3. Direct messages only: an accepted connection.
  if (kind.requiresConnection) {
    let connected;
    try {
      connected = await hasAcceptedConnection(db, actorId, recipientId);
    } catch (err) {
      return no("error", "connection_read_failed", err.code);
    }
    if (!connected) return no("info", "not_connected");
  }

  // 4. The recipient's Community preference.
  let preference;
  try {
    const prefSnap = await db.doc(`notificationPreferences/${recipientId}`)
        .get();
    preference = preferenceState(prefSnap, kind.preference);
  } catch (err) {
    return no("error", "preference_read_failed", err.code);
  }
  if (preference === "malformed") return no("error", "preference_malformed");
  if (preference === "off") return no("info", "preference_off");

  // 5. The recipient's Expo token, from userPrivate only (ruling 5).
  let token;
  try {
    const tokenSnap = await db.doc(`userPrivate/${recipientId}`).get();
    token = tokenSnap.exists ? (tokenSnap.data() || {}).expoPushToken :
      undefined;
  } catch (err) {
    return no("error", "token_read_failed", err.code);
  }
  if (token === undefined || token === null) {
    return no("info", "token_missing");
  }
  if (!Expo.isExpoPushToken(token)) return no("info", "token_malformed");

  return {
    ok: true,
    actorId,
    recipientId,
    actorName: pushDisplayName(actorData),
    token,
    parsed,
  };
}

module.exports = {
  checkDeliveryEligibility,
  isActiveUser,
  pushDisplayName,
  hasAcceptedConnection,
  preferenceState,
};
