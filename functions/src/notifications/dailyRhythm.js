/**
 * Daily Rhythm Notification — Cloud Function
 * CRON: every 15 minutes, checks users whose reminder time falls in the current window.
 * Sends one FCM push per user per day.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {isWithinQuietHours} = require("./utils/quietHours");

const DAILY_RHYTHM_MESSAGES = {
  morning: [
    {title: "Good morning", body: "Your morning routine is ready whenever you are."},
    {title: "A small moment", body: "Your morning routine is here when you're ready."},
  ],
  evening: [
    {title: "Good evening", body: "Your evening routine is ready whenever you are."},
    {title: "Wind down", body: "A small moment for your evening routine, if it feels right."},
  ],
  default: [
    {title: "Your routine is ready", body: "A small moment for yourself, whenever you're ready."},
  ],
};

function getTimeOfDay(hour) {
  if (hour < 12) return "morning";
  if (hour >= 17) return "evening";
  return "default";
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Scheduled function: runs every 15 minutes.
 * Queries users whose dailyRhythm.reminderTime falls in the current 15-min window.
 */
const sendDailyRhythm = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    timeoutSeconds: 120,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    // 15-minute window: [currentMinute, currentMinute + 14]
    const windowEnd = currentMinute + 14;

    logger.info(`Daily rhythm check: ${currentHour}:${currentMinute} – ${currentHour}:${windowEnd}`);

    // Check feature flag
    try {
      const configSnap = await db.doc("config/notifications").get();
      const config = configSnap.exists ? configSnap.data() : {};
      if (!config.serverPushEnabled) {
        logger.info("Server push disabled via feature flag");
        return;
      }
    } catch (err) {
      logger.warn("Could not read feature flag, skipping:", err);
      return;
    }

    // Query notification preferences where daily rhythm is enabled at this hour
    const prefsSnapshot = await db
      .collection("notificationPreferences")
      .where("allNotificationsEnabled", "==", true)
      .where("dailyRhythm.enabled", "==", true)
      .where("dailyRhythm.reminderTime.hour", "==", currentHour)
      .get();

    if (prefsSnapshot.empty) {
      logger.info("No users to notify at this hour");
      return;
    }

    let sent = 0;
    let skipped = 0;

    for (const prefDoc of prefsSnapshot.docs) {
      const prefs = prefDoc.data();
      const userId = prefDoc.id;

      // Check minute within 15-minute window
      const userMinute = prefs.dailyRhythm?.reminderTime?.minute ?? 0;
      if (userMinute < currentMinute || userMinute > windowEnd) {
        skipped++;
        continue;
      }

      // Check quiet hours
      if (isWithinQuietHours(prefs.quietHours)) {
        skipped++;
        continue;
      }

      // Check for already-sent today
      const today = now.toISOString().split("T")[0];
      const sentRef = db.doc(`notificationLog/${userId}/dailyRhythm/${today}`);
      const sentSnap = await sentRef.get();
      if (sentSnap.exists) {
        skipped++;
        continue;
      }

      // Get user's FCM token
      const userSnap = await db.doc(`users/${userId}`).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) {
        skipped++;
        continue;
      }

      // Pick message and send
      const timeOfDay = getTimeOfDay(currentHour);
      const message = pickRandom(DAILY_RHYTHM_MESSAGES[timeOfDay]);
      const messageId = await sendNotification(fcmToken, message, {
        type: "daily_reminder",
        category: "daily_rhythm",
      });

      if (messageId) {
        // Log to prevent duplicate sends today
        await sentRef.set({sentAt: admin.firestore.FieldValue.serverTimestamp()});
        sent++;
      }
    }

    logger.info(`Daily rhythm complete: ${sent} sent, ${skipped} skipped`);
  },
);

module.exports = {sendDailyRhythm};
