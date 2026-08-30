/**
 * Social & Connection Notifications — Cloud Functions
 * Firestore triggers for DMs and connection requests (real-time push).
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {getFcmToken} = require("../lib/userFields");
const {isWithinQuietHours} = require("./utils/quietHours");

/**
 * Trigger: new direct message created.
 * Sends push to the recipient if their DM preference is on.
 */
const onNewDirectMessage = onDocumentCreated(
  {
    document: "directMessages/{messageId}",
    region: "us-central1",
  },
  async (event) => {
    const db = admin.firestore();
    const message = event.data?.data();
    if (!message) return;

    const {receiverId, senderId, text} = message;
    if (!receiverId || !senderId) return;

    // Get receiver's notification preferences
    const prefsSnap = await db.doc(`notificationPreferences/${receiverId}`).get();
    if (!prefsSnap.exists) return;
    const prefs = prefsSnap.data();

    if (!prefs.allNotificationsEnabled || !prefs.socialConnection?.directMessages) return;
    if (isWithinQuietHours(prefs.quietHours)) return;

    // Get sender's display name
    const senderSnap = await db.doc(`users/${senderId}`).get();
    const senderName = senderSnap.exists ? senderSnap.data().displayName || "Someone" : "Someone";

    // Get receiver's FCM token
    const receiverSnap = await db.doc(`users/${receiverId}`).get();
    if (!receiverSnap.exists) return;
    // MIGRATION_FALLBACK — see src/lib/userFields.js.
    const fcmToken = await getFcmToken(receiverId);
    if (!fcmToken) return;

    const preview = text && text.length > 100 ? text.substring(0, 97) + "..." : (text || "");

    await sendNotification(
      fcmToken,
      {title: senderName, body: preview},
      {
        type: "message",
        category: "social_connection",
        conversationId: message.conversationId || "",
        senderId,
      },
    );

    logger.info(`DM notification sent to ${receiverId} from ${senderId}`);
  },
);

/**
 * Trigger: new connection request created.
 * Sends push to the recipient.
 */
const onNewConnection = onDocumentCreated(
  {
    document: "connections/{connectionId}",
    region: "us-central1",
  },
  async (event) => {
    const db = admin.firestore();
    const connection = event.data?.data();
    if (!connection || connection.status !== "pending") return;

    // Connection fields: { a: senderId, b: receiverId, ... }
    const senderId = connection.a;
    const receiverId = connection.b;
    if (!senderId || !receiverId) return;

    // Get receiver's notification preferences
    const prefsSnap = await db.doc(`notificationPreferences/${receiverId}`).get();
    if (!prefsSnap.exists) return;
    const prefs = prefsSnap.data();

    if (!prefs.allNotificationsEnabled || !prefs.socialConnection?.connectionRequests) return;
    if (isWithinQuietHours(prefs.quietHours)) return;

    // Get sender info
    const senderSnap = await db.doc(`users/${senderId}`).get();
    const senderName = senderSnap.exists ? senderSnap.data().displayName || "Someone" : "Someone";

    // Get receiver FCM token
    const receiverSnap = await db.doc(`users/${receiverId}`).get();
    if (!receiverSnap.exists) return;
    // MIGRATION_FALLBACK — see src/lib/userFields.js.
    const fcmToken = await getFcmToken(receiverId);
    if (!fcmToken) return;

    await sendNotification(
      fcmToken,
      {title: `${senderName} would like to connect`, body: "Tap to view their profile."},
      {type: "connection", category: "social_connection", senderId},
    );

    logger.info(`Connection request notification sent to ${receiverId} from ${senderId}`);
  },
);

module.exports = {onNewDirectMessage, onNewConnection};
