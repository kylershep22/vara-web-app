/**
 * Milestones & Reflection Notifications — Cloud Function
 * CRON: daily. Checks account age against calendar-time thresholds.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {isWithinQuietHours} = require("./utils/quietHours");

const TIME_MILESTONES = [
  {key: "1_week", days: 7, title: "One week with Vara", body: "You've been building your routine for a week. How's it feeling?"},
  {key: "1_month", days: 30, title: "A month with Vara", body: "A month of supporting your brain health. Take a moment to notice what's shifted."},
  {key: "3_months", days: 90, title: "Three months", body: "Three months of showing up for yourself. What's felt most useful?"},
];

const sendMilestones = onSchedule(
  {
    schedule: "every day 18:00",
    region: "us-central1",
    timeoutSeconds: 120,
    timeZone: "America/New_York",
  },
  async () => {
    const db = admin.firestore();

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

    // Query users with milestones enabled
    const prefsSnapshot = await db
      .collection("notificationPreferences")
      .where("allNotificationsEnabled", "==", true)
      .where("milestonesReflection.enabled", "==", true)
      .get();

    if (prefsSnapshot.empty) {
      logger.info("No users with milestones enabled");
      return;
    }

    const now = new Date();
    let sent = 0;

    for (const prefDoc of prefsSnapshot.docs) {
      const prefs = prefDoc.data();
      const userId = prefDoc.id;

      if (isWithinQuietHours(prefs.quietHours)) continue;

      // Get user doc for createdAt and FCM token
      const userSnap = await db.doc(`users/${userId}`).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      const createdAt = userData.createdAt?.toDate?.();
      if (!createdAt) continue;

      const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      // Check each milestone
      for (const milestone of TIME_MILESTONES) {
        if (daysSinceCreated !== milestone.days) continue;

        // Check if already sent
        const logRef = db.doc(`notificationLog/${userId}/milestones/${milestone.key}`);
        const logSnap = await logRef.get();
        if (logSnap.exists) continue;

        const messageId = await sendNotification(
          fcmToken,
          {title: milestone.title, body: milestone.body},
          {type: "system", category: "milestones_reflection", milestone: milestone.key},
        );

        if (messageId) {
          await logRef.set({sentAt: admin.firestore.FieldValue.serverTimestamp()});
          sent++;
        }
      }
    }

    logger.info(`Milestones complete: ${sent} sent`);
  },
);

module.exports = {sendMilestones};
