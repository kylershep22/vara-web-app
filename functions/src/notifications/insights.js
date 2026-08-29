/**
 * Insights & Learning Notification — Cloud Function
 * CRON: daily at 10 AM. Sends brain-health insight based on user's frequency preference.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {getFcmToken} = require("../lib/userFields");
const {isWithinQuietHours} = require("./utils/quietHours");
const {shouldSendNotification, getQuietTierMessage} = require("./notificationTier");

// Static content pool (22 items, ~8–11 weeks before repeat)
const INSIGHT_CONTENT_POOL = [
  "Focus often improves when there's less competing demand on your attention.",
  "Supporting brain health creates the conditions where habits can stick.",
  "Small changes work better when they respect how the brain functions.",
  "Recovery isn't a break from progress — it's part of how the brain sustains it.",
  "Consistency doesn't require perfection.",
  "Habits are easier to maintain when they work with your brain's energy and attention.",
  "Consistent focus habits strengthen prefrontal cortex pathways over time.",
  "Even 5 minutes of focused practice builds your brain's attention networks.",
  "Focus improves not just with effort, but with recovery between sessions.",
  "Your brain's clarity peaks when you pair focused work with intentional rest.",
  "Emotional regulation is a skill that strengthens with each mindful repetition.",
  "Recovery isn't passive — it's an active process your brain gets better at.",
  "Small regulation habits compound into greater emotional flexibility over time.",
  "Your nervous system adapts to the patterns you practice most consistently.",
  "Consistency rewires your brain's default patterns, making habits feel automatic.",
  "The most sustainable habits are the ones you can do even on your hardest days.",
  "Your brain rewards consistency itself — each completion strengthens the neural loop.",
  "Building momentum matters more than intensity. Show up, and the rest follows.",
  "Resilience is built through small, repeated energy management practices.",
  "Your body's energy systems adapt to consistent habits within weeks.",
  "Strategic recovery habits are as important as active energy-building ones.",
  "Energy resilience means bouncing back faster — and your habits train that response.",
];

function selectInsightForDate() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return INSIGHT_CONTENT_POOL[dayOfYear % INSIGHT_CONTENT_POOL.length];
}

/**
 * Determine if user should receive an insight today based on frequency preference.
 * twice_weekly = Tuesday, Friday; three_weekly = Monday, Wednesday, Friday.
 */
function shouldSendToday(frequency) {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
  if (frequency === "three_weekly") {
    return [1, 3, 5].includes(dayOfWeek); // Mon, Wed, Fri
  }
  // Default: twice_weekly
  return [2, 5].includes(dayOfWeek); // Tue, Fri
}

const sendInsights = onSchedule(
  {
    schedule: "every day 10:00",
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

    // Query users with insights enabled
    const prefsSnapshot = await db
      .collection("notificationPreferences")
      .where("allNotificationsEnabled", "==", true)
      .where("insightsLearning.enabled", "==", true)
      .get();

    if (prefsSnapshot.empty) {
      logger.info("No users with insights enabled");
      return;
    }

    const insight = selectInsightForDate();
    let sent = 0;
    let skipped = 0;

    for (const prefDoc of prefsSnapshot.docs) {
      const prefs = prefDoc.data();
      const userId = prefDoc.id;

      // Check frequency
      const frequency = prefs.insightsLearning?.frequency || "twice_weekly";
      if (!shouldSendToday(frequency)) {
        skipped++;
        continue;
      }

      // Check quiet hours
      if (isWithinQuietHours(prefs.quietHours)) {
        skipped++;
        continue;
      }

      // Check notification tier (de-escalation)
      const tierResult = await shouldSendNotification(userId, "insights");
      if (!tierResult.allowed) {
        skipped++;
        continue;
      }

      // Get FCM token
      const userSnap = await db.doc(`users/${userId}`).get();
      if (!userSnap.exists) continue;
      // MIGRATION_FALLBACK — token may be on userPrivate (new builds) or
      // still on users/{uid} (not yet updated). See src/lib/userFields.js.
      const fcmToken = await getFcmToken(userId);
      if (!fcmToken) {
        skipped++;
        continue;
      }

      // Use quiet-tier message if applicable
      const message = tierResult.tier === "quiet"
        ? getQuietTierMessage()
        : {title: "A brain-health insight for you", body: insight};

      const messageId = await sendNotification(
        fcmToken,
        message,
        {type: "system", category: "insights_learning"},
      );

      if (messageId) sent++;
    }

    logger.info(`Insights complete: ${sent} sent, ${skipped} skipped`);
  },
);

module.exports = {sendInsights};
