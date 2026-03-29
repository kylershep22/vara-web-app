/**
 * Habit Reminder Notification — Cloud Function
 * CRON: every 15 minutes, checks habits with reminders due in current window.
 * Sends FCM push only if the habit has NOT been completed today.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {isWithinQuietHours} = require("./utils/quietHours");

const sendHabitReminders = onSchedule(
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
      const windowEnd = currentMinute + 14;
      const todayISO = now.toISOString().split("T")[0];

      logger.info(`Habit reminder check: ${currentHour}:${currentMinute}`);

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

      // Query habits with reminders at this hour
      const habitsSnapshot = await db
          .collection("habits")
          .where("reminderEnabled", "==", true)
          .where("active", "==", true)
          .where("reminderTime.hour", "==", currentHour)
          .get();

      if (habitsSnapshot.empty) {
        logger.info("No habit reminders at this hour");
        return;
      }

      let sent = 0;
      let skipped = 0;

      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        const habitId = habitDoc.id;

        // Check minute within 15-minute window
        const habitMinute = habit.reminderTime?.minute ?? 0;
        if (habitMinute < currentMinute || habitMinute > windowEnd) {
          skipped++;
          continue;
        }

        // Check for duplicate send today
        const logRef = db.doc(
            `notificationLog/${habit.userId}/` +
            `habitReminder/${habitId}_${todayISO}`,
        );
        const logSnap = await logRef.get();
        if (logSnap.exists) {
          skipped++;
          continue;
        }

        // Check if habit was completed today
        const completionSnapshot = await db
            .collection("habitCompletions")
            .where("habitId", "==", habitId)
            .where("dateISO", "==", todayISO)
            .limit(1)
            .get();

        if (!completionSnapshot.empty) {
          skipped++;
          continue;
        }

        // Get user data for FCM token and quiet hours
        const userSnap = await db.doc(`users/${habit.userId}`).get();
        if (!userSnap.exists) continue;
        const userData = userSnap.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken) {
          skipped++;
          continue;
        }

        // Check quiet hours from notification preferences
        const prefsSnap = await db
            .doc(`notificationPreferences/${habit.userId}`)
            .get();
        if (prefsSnap.exists) {
          const prefs = prefsSnap.data();
          if (isWithinQuietHours(prefs.quietHours)) {
            skipped++;
            continue;
          }
        }

        // Send notification
        const habitName = habit.name || habit.title || "your habit";
        const messageId = await sendNotification(
            fcmToken,
            {
              title: `Time for ${habitName}`,
              body: `Your ${habitName} reminder is ready whenever you are.`,
            },
            {
              type: "habit_reminder",
              habitId: habitId,
            },
        );

        if (messageId) {
          await logRef.set({
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          sent++;
        }
      }

      logger.info(
          `Habit reminders complete: ${sent} sent, ${skipped} skipped`,
      );
    },
);

module.exports = {sendHabitReminders};
