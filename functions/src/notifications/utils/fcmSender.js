/**
 * FCM Sender Utility
 * Wraps admin.messaging() with error handling and logging.
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

/**
 * Send a notification via FCM to a user's device.
 * @param {string} fcmToken - The user's FCM token
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 * @returns {Promise<string|null>} Message ID or null on failure
 */
async function sendNotification(fcmToken, notification, data = {}) {
  if (!fcmToken) return null;

  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)]),
      ),
      android: {
        priority: "normal",
        notification: {channelId: "default"},
      },
      apns: {
        payload: {aps: {sound: "default"}},
      },
    });
    return messageId;
  } catch (error) {
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      logger.warn("Invalid FCM token, should be cleaned up:", fcmToken.slice(0, 20));
    } else {
      logger.error("FCM send error:", error);
    }
    return null;
  }
}

module.exports = {sendNotification};
