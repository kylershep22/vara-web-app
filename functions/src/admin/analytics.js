/**
 * Analytics Aggregation Cloud Functions
 * Nightly (3 AM ET) and weekly (Sunday 3 AM ET) aggregation of app-wide metrics.
 * Results are written to the `adminAnalytics` collection (flat, no subcollections).
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// ---------------------------------------------------------------------------
// Helper: shared aggregation logic
// ---------------------------------------------------------------------------

async function runAggregation() {
  const db = admin.firestore();
  const now = new Date();
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;

  // Time boundaries
  const oneDayAgo = Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));
  const sevenDaysAgo = Timestamp.fromDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
  const thirtyDaysAgo = Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));
  const fourteenDaysAgo = Timestamp.fromDate(new Date(now - 14 * 24 * 60 * 60 * 1000));

  const analyticsRef = db.collection("adminAnalytics");

  // -----------------------------------------------------------------------
  // 1. Total users
  // -----------------------------------------------------------------------
  const usersCol = db.collection("users");
  const totalUsersSnap = await usersCol.count().get();
  const totalUsers = totalUsersSnap.data().count;

  // -----------------------------------------------------------------------
  // 2. Rolling — DAU, WAU, MAU, retention
  // -----------------------------------------------------------------------
  const dauSnap = await usersCol
    .where("lastActiveAt", ">=", oneDayAgo)
    .count()
    .get();
  const dau = dauSnap.data().count;

  const wauSnap = await usersCol
    .where("lastActiveAt", ">=", sevenDaysAgo)
    .count()
    .get();
  const wau = wauSnap.data().count;

  const mauSnap = await usersCol
    .where("lastActiveAt", ">=", thirtyDaysAgo)
    .count()
    .get();
  const mau = mauSnap.data().count;

  // Retention: users created 7+ days ago who were active in last 7 days
  const oldUsersSnap = await usersCol
    .where("createdAt", "<=", sevenDaysAgo)
    .count()
    .get();
  const oldUsersCount = oldUsersSnap.data().count;

  const retainedSnap = await usersCol
    .where("createdAt", "<=", sevenDaysAgo)
    .where("lastActiveAt", ">=", sevenDaysAgo)
    .count()
    .get();
  const retainedCount = retainedSnap.data().count;

  const retention7d = oldUsersCount > 0
    ? Math.round((retainedCount / oldUsersCount) * 10000) / 100
    : 0;

  await analyticsRef.doc("rolling").set({
    totalUsers,
    dau,
    wau,
    mau,
    retention7d,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Rolling metrics written", {totalUsers, dau, wau, mau, retention7d});

  // -----------------------------------------------------------------------
  // 3. Daily snapshot
  // -----------------------------------------------------------------------
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const newSignupsSnap = await usersCol
    .where("createdAt", ">=", oneDayAgo)
    .count()
    .get();
  const newSignups = newSignupsSnap.data().count;

  const postsCreatedSnap = await db.collection("posts")
    .where("createdAt", ">=", oneDayAgo)
    .count()
    .get();
  const postsCreated = postsCreatedSnap.data().count;

  await analyticsRef.doc(`daily-${dateStr}`).set({
    date: dateStr,
    newSignups,
    dau,
    postsCreated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Daily snapshot written", {date: dateStr, newSignups, dau, postsCreated});

  // -----------------------------------------------------------------------
  // 4. Feature adoption
  // -----------------------------------------------------------------------
  const featureCollections = {
    goals: "pctWithGoals",
    habits: "pctWithHabits",
    journalEntries: "pctWithJournal",
    posts: "pctWithPosts",
    tasks: "pctWithTasks",
  };

  const adoption = {};
  let totalHabits = 0;

  for (const [colName, metricKey] of Object.entries(featureCollections)) {
    const snapshot = await db.collection(colName).select("userId").get();
    const uniqueUsers = new Set();
    snapshot.docs.forEach((doc) => uniqueUsers.add(doc.data().userId));
    const pct = totalUsers > 0
      ? Math.round((uniqueUsers.size / totalUsers) * 10000) / 100
      : 0;
    adoption[metricKey] = pct;

    if (colName === "habits") {
      totalHabits = snapshot.size;
    }
  }

  adoption.avgHabitsPerUser = totalUsers > 0
    ? Math.round((totalHabits / totalUsers) * 100) / 100
    : 0;
  adoption.avgCompletionRate = null; // Complex calculation — deferred

  await analyticsRef.doc("featureAdoption").set({
    ...adoption,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Feature adoption written", adoption);

  // -----------------------------------------------------------------------
  // 5. Subscription metrics
  // -----------------------------------------------------------------------
  const trialSnap = await usersCol
    .where("subscription.type", "==", "trial")
    .count()
    .get();
  const premiumSnap = await usersCol
    .where("subscription.type", "==", "premium")
    .count()
    .get();
  const coachingSnap = await usersCol
    .where("subscription.type", "==", "coaching")
    .count()
    .get();
  const expiredSnap = await usersCol
    .where("subscription.type", "==", "expired")
    .count()
    .get();

  // Conversion rate: users whose trial started 7-14 days ago → now premium/coaching
  const trialCohortSnap = await usersCol
    .where("subscription.trialStartedAt", ">=", fourteenDaysAgo)
    .where("subscription.trialStartedAt", "<=", sevenDaysAgo)
    .get();

  let convertedCount = 0;
  trialCohortSnap.docs.forEach((doc) => {
    const subType = doc.data().subscription?.type;
    if (subType === "premium" || subType === "coaching") {
      convertedCount++;
    }
  });

  const conversionRate = trialCohortSnap.size > 0
    ? Math.round((convertedCount / trialCohortSnap.size) * 10000) / 100
    : 0;

  await analyticsRef.doc("subscriptionMetrics").set({
    trial: trialSnap.data().count,
    premium: premiumSnap.data().count,
    coaching: coachingSnap.data().count,
    expired: expiredSnap.data().count,
    conversionRate,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Subscription metrics written", {conversionRate});

  // -----------------------------------------------------------------------
  // 6. Community vitals
  // -----------------------------------------------------------------------
  const activeGroupsSnap = await db.collection("groups").count().get();
  const activeGroups = activeGroupsSnap.data().count;

  const totalPostsSnap = await db.collection("posts").count().get();
  const totalPosts = totalPostsSnap.data().count;

  const avgPostsPerGroup = activeGroups > 0
    ? Math.round((totalPosts / activeGroups) * 100) / 100
    : 0;

  const challengeParticipantsSnap = await db.collection("challengeParticipants")
    .count()
    .get();
  const challengeParticipation = challengeParticipantsSnap.data().count;

  await analyticsRef.doc("communityVitals").set({
    activeGroups,
    avgPostsPerGroup,
    challengeParticipation,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Community vitals written", {activeGroups, avgPostsPerGroup, challengeParticipation});

  // -----------------------------------------------------------------------
  // 7. Meta
  // -----------------------------------------------------------------------
  await analyticsRef.doc("meta").set({
    lastRunAt: FieldValue.serverTimestamp(),
    status: "success",
  });

  logger.info("Analytics aggregation complete");
}

// ---------------------------------------------------------------------------
// Scheduled Cloud Functions
// ---------------------------------------------------------------------------

/**
 * Nightly aggregation — runs every day at 3 AM ET.
 */
const aggregateAnalytics = onSchedule(
  {schedule: "0 3 * * *", timeZone: "America/New_York"},
  async (event) => {
    logger.info("Starting nightly analytics aggregation");
    await runAggregation();
  },
);

/**
 * Full weekly aggregation — runs every Sunday at 3 AM ET.
 * Same logic as nightly; ensures weekly roll-up is fresh.
 */
const aggregateAnalyticsFull = onSchedule(
  {schedule: "0 3 * * 0", timeZone: "America/New_York"},
  async (event) => {
    logger.info("Starting weekly full analytics aggregation");
    await runAggregation();
  },
);

/**
 * Callable: manually trigger analytics aggregation (admin-only).
 */
const {onCall, HttpsError} = require("firebase-functions/v2/https");

const triggerAggregation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  // Verify admin role
  const adminDoc = await admin.firestore()
    .doc(`users/${request.auth.uid}`)
    .get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  logger.info("Manual analytics aggregation triggered by", request.auth.uid);
  await runAggregation();
  return {success: true, message: "Analytics aggregation complete"};
});

module.exports = {
  aggregateAnalytics,
  aggregateAnalyticsFull,
  triggerAggregation,
};
