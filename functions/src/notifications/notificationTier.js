/**
 * Notification De-Escalation Tier Logic
 *
 * Tiers based on lastActiveAt on user document:
 * - active: opened app within 3 days → max 1 notification/day
 * - cooling: 4-14 days since last open → max 3/week
 * - quiet: 15-29 days since last open → max 1/week, single approved string
 * - silent: 30+ days → 0 notifications
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Get the notification tier for a user based on lastActiveAt.
 * @param {string} userId
 * @returns {Promise<{tier: string, allowed: boolean}>}
 */
async function getNotificationTier(userId) {
  try {
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

    if (!userDoc.exists) {
      return {tier: "active", allowed: true};
    }

    const lastActiveAt = userDoc.data().lastActiveAt;
    if (!lastActiveAt) {
      return {tier: "active", allowed: true};
    }

    const lastActiveMs = lastActiveAt.toMillis
        ? lastActiveAt.toMillis()
        : new Date(lastActiveAt).getTime();
    const daysSinceActive = Math.floor(
        (Date.now() - lastActiveMs) / DAY_MS,
    );

    if (daysSinceActive <= 3) {
      return {tier: "active", allowed: true};
    } else if (daysSinceActive <= 14) {
      return {tier: "cooling", allowed: true};
    } else if (daysSinceActive <= 29) {
      return {tier: "quiet", allowed: true};
    } else {
      return {tier: "silent", allowed: false};
    }
  } catch (err) {
    logger.warn("Error checking notification tier:", err.message);
    // Fail open — allow notification if tier check fails
    return {tier: "active", allowed: true};
  }
}

/**
 * Check if a notification should be sent based on tier and recent send history.
 * @param {string} userId
 * @param {string} category - e.g., 'dailyRhythm', 'insights', 'milestones', 'habitReminder'
 * @returns {Promise<{allowed: boolean, tier: string, reason: string}>}
 */
async function shouldSendNotification(userId, category) {
  const {tier, allowed} = await getNotificationTier(userId);

  if (!allowed) {
    return {allowed: false, tier, reason: "silent tier"};
  }

  const db = admin.firestore();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  try {
    if (tier === "active") {
      // Max 1/day total — check if any notification sent today
      const todayStart = admin.firestore.Timestamp.fromDate(
          new Date(todayStr + "T00:00:00Z"),
      );
      // Check the two main scheduled categories
      const [rhythmLog, habitLog] = await Promise.all([
        db.collection("notificationLog").doc(userId)
            .collection("dailyRhythm").doc(todayStr).get(),
        db.collection("notificationLog").doc(userId)
            .collection("habitReminder")
            .where("sentAt", ">=", todayStart)
            .limit(1)
            .get(),
      ]);

      if (rhythmLog.exists || !habitLog.empty) {
        return {allowed: false, tier, reason: "active - already sent today"};
      }
      return {allowed: true, tier, reason: "active - ok"};
    }

    if (tier === "cooling") {
      // Max 3/week — count sends in last 7 days
      const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
      const weekTimestamp = admin.firestore.Timestamp.fromDate(weekAgo);

      // Count across categories
      const categories = ["dailyRhythm", "insights", "milestones", "habitReminder"];
      let totalSent = 0;

      for (const cat of categories) {
        const logs = await db.collection("notificationLog").doc(userId)
            .collection(cat)
            .where("sentAt", ">=", weekTimestamp)
            .limit(3)
            .get();
        totalSent += logs.size;
        if (totalSent >= 3) break;
      }

      if (totalSent >= 3) {
        return {allowed: false, tier, reason: "cooling - 3/week limit"};
      }
      return {allowed: true, tier, reason: "cooling - ok"};
    }

    if (tier === "quiet") {
      // Max 1/week — same check but limit 1
      const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
      const weekTimestamp = admin.firestore.Timestamp.fromDate(weekAgo);

      const categories = ["dailyRhythm", "insights", "milestones", "habitReminder"];
      let totalSent = 0;

      for (const cat of categories) {
        const logs = await db.collection("notificationLog").doc(userId)
            .collection(cat)
            .where("sentAt", ">=", weekTimestamp)
            .limit(1)
            .get();
        totalSent += logs.size;
        if (totalSent >= 1) break;
      }

      if (totalSent >= 1) {
        return {allowed: false, tier, reason: "quiet - 1/week limit"};
      }
      return {allowed: true, tier, reason: "quiet - ok"};
    }
  } catch (err) {
    logger.warn("Error checking send history:", err.message);
    // Fail open on history check errors
    return {allowed: true, tier, reason: "error checking history - allowing"};
  }

  return {allowed: true, tier, reason: "unknown"};
}

/**
 * Get the quiet-tier notification content.
 * Only this message is sent to users in the quiet tier.
 */
function getQuietTierMessage() {
  return {
    title: "Vara",
    body: "Vara is here whenever you're ready.",
  };
}

module.exports = {
  getNotificationTier,
  shouldSendNotification,
  getQuietTierMessage,
};
