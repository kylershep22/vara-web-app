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

setGlobalOptions({maxInstances: 10});

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

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
      const text = (data.text || "").toString();
      if (!toUid || !fromUid) return;

      const fromName = await getUserDisplayName(fromUid);

      const title = "New message";
      const body = `${fromName}: ${text.slice(0, 120)}`;

      await createBellNotification({
        recipientId: toUid,
        type: "message",
        title,
        body,
        link: "/community?tab=messages", // adjust to your messages route
      });

      // Optional email
      await sendEmailIfConfigured(
          toUid,
          "You have a new message",
          `${fromName} sent: ${text}`,
      );
    },
);

