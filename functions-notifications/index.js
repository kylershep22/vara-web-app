/* eslint-disable max-len */
/**
 * Notification Functions (codebase: notifications)
 * - Triggers:
 *   1) on new connection invite -> notify recipient
 *   2) on new direct message    -> notify recipient
 *
 * Email is optional. If you later set the SENDGRID_API_KEY secret and
 * install @sendgrid/mail, the function will send email as well.
 */

const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} =
  require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const {Expo} = require("expo-server-sdk");

setGlobalOptions({maxInstances: 10});

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Initialize Expo SDK
const expo = new Expo();

/**
 * Get a user's display name (fallbacks to 'Someone').
 * @param {string} uid
 * @return {Promise<string>}
 */
async function getUserDisplayName(uid) {
  try {
    const snap = await db.doc(`users/${uid}`).get();
    if (snap.exists) {
      const d = snap.data() || {};
      return d.displayName || "Someone";
    }
  } catch (e) {
    console.error("getUserDisplayName error", e);
  }
  return "Someone";
}

/**
 * Attempt to get a user's email from Firebase Auth.
 * @param {string} uid
 * @return {Promise<string|null>}
 */
async function getUserEmail(uid) {
  try {
    const rec = await admin.auth().getUser(uid);
    return rec.email || null;
  } catch (e) {
    console.warn("getUserEmail fallback (no email)", e);
    return null;
  }
}

/**
 * Write an in-app bell notification.
 * @param {object} n
 * @param {string} n.recipientId
 * @param {string} n.type         e.g., 'invite' | 'message'
 * @param {string} n.title
 * @param {string} n.body
 * @param {string=} n.link        optional deeplink path
 * @return {Promise<void>}
 */
async function createBellNotification(n) {
  const payload = {
    recipientId: n.recipientId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link || "",
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection("notifications").add(payload);
}

/**
 * Send an Expo push notification to a user's device.
 * @param {string} toUid - The user ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object=} data - Additional data to send with notification
 * @return {Promise<void>}
 */
async function sendPushNotification(toUid, title, body, data = {}) {
  try {
    // MIGRATION_FALLBACK — userPrivate first, users/{uid} as the fallback.
    //
    // Slice 2 of the userPrivate migration moved expoPushToken to the
    // owner-only userPrivate/{uid}, written by the client with NO dual-write
    // (a fresh token left on the world-readable profile would defeat the move).
    // A user on a new build therefore has it only privately; one who has not
    // updated has it only publicly. Reading a single location would silently
    // stop delivering to half the install base — silently, because a missing
    // token is an early return here, not an error.
    //
    // Inlined rather than imported from functions/src/lib/userFields.js: this
    // is a SEPARATE deployed codebase with its own package.json and
    // node_modules, so it cannot reach across. Slice 4 removes both copies.
    const [privateSnap, publicSnap] = await Promise.all([
      db.doc(`userPrivate/${toUid}`).get(),
      db.doc(`users/${toUid}`).get(),
    ]);
    if (!privateSnap.exists && !publicSnap.exists) {
      console.log(`User ${toUid} not found for push notification`);
      return;
    }

    const privateToken = privateSnap.exists ? privateSnap.data().expoPushToken : undefined;
    const publicToken = publicSnap.exists ? publicSnap.data().expoPushToken : undefined;
    const pushToken = privateToken || publicToken;

    if (!pushToken) {
      console.log(`No push token for user ${toUid}`);
      return;
    }

    // Verify the token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token for user ${toUid}: ${pushToken}`);
      return;
    }

    // Construct the notification message
    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "default",
    };

    // Send the notification
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log(`Push notification sent to ${toUid}:`, ticket);
  } catch (error) {
    console.error(`Error sending push notification to ${toUid}:`, error);
  }
}

/**
 * Optionally send an email via SendGrid.
 * Requires:
 *   1) Install dep in this folder:
 *      npm i @sendgrid/mail
 *   2) Add secret:
 *      firebase functions:secrets:set SENDGRID_API_KEY
 *   3) (optional) Set MAIL_FROM env var in your hosting/build system,
 *      or edit the fallback below.
 * This function no-ops if the secret is not present.
 * @param {string} toUid
 * @param {string} subject
 * @param {string} text
 * @return {Promise<void>}
 */
async function sendEmailIfConfigured(toUid, subject, text) {
  // Only attempt if the secret is available at runtime
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;

  const to = await getUserEmail(toUid);
  if (!to) return;

  // Lazy-require to avoid hard dependency unless configured
  // eslint-disable-next-line global-require
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(apiKey);

  const from = process.env.MAIL_FROM || "no-reply@vara.app";
  try {
    await sgMail.send({to, from, subject, text});
  } catch (e) {
    console.error("sendEmailIfConfigured error", e);
  }
}

/**
 * When a new connection invite is created, notify the recipient.
 * Expects document shape:
 * { from: uid, to: uid, status: 'pending'|'accepted'|..., createdAt: ts }
 */
exports.notifyOnInviteCreated = onDocumentCreated(
    "connectionInvites/{inviteId}",
    async (event) => {
      const data = event.data ? event.data.data() : null;
      if (!data) return;

      const toUid = data.to;
      const fromUid = data.from;
      const status = data.status || "pending";
      if (!toUid || !fromUid || status !== "pending") return;

      const fromName = await getUserDisplayName(fromUid);

      const title = "New connection request";
      const body = `${fromName} sent you a connection request.`;

      await createBellNotification({
        recipientId: toUid,
        type: "invite",
        title,
        body,
        link: "/community", // adjust if you have a dedicated invites screen
      });

      // Optional email
      await sendEmailIfConfigured(
          toUid,
          "You have a new connection request",
          body,
      );
    },
);

/**
 * When a new direct message is created, notify the receiver.
 * Expects document shape:
 * { conversationId, senderId, receiverId, text, createdAt: ts }
 */
exports.notifyOnDirectMessageCreated = onDocumentCreated(
    "directMessages/{messageId}",
    async (event) => {
      const data = event.data ? event.data.data() : null;
      if (!data) return;

      const toUid = data.receiverId;
      const fromUid = data.senderId;
      const conversationId = data.conversationId;
      const text = (data.text || "").toString();
      if (!toUid || !fromUid) return;

      const fromName = await getUserDisplayName(fromUid);

      const title = "New message";
      const body = `${fromName}: ${text.slice(0, 120)}`;

      // Create in-app notification
      await createBellNotification({
        recipientId: toUid,
        type: "message",
        title,
        body,
        link: "/community?tab=messages", // adjust to your messages route
      });

      // Send push notification to user's device
      await sendPushNotification(
          toUid,
          title,
          body,
          {
            type: "message",
            conversationId,
            senderId: fromUid,
          },
      );

      // Optional email
      await sendEmailIfConfigured(
          toUid,
          "You have a new message",
          `${fromName} sent: ${text}`,
      );
    },
);

