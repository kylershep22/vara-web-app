import { db } from "../../firebase";
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where,
  getDocs, getCountFromServer, orderBy, limit, startAfter, serverTimestamp
} from "firebase/firestore";

/** Check if a user has admin role */
export async function checkIsAdmin(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data().role === "admin";
}

/** Grant admin role to a user */
export async function grantAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "admin", updatedAt: serverTimestamp() });
}

/** Revoke admin role from a user */
export async function revokeAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "user", updatedAt: serverTimestamp() });
}

/** Search users by display name or email (case-insensitive client-side filter) */
export async function searchUsers(searchTerm, pageSize = 25) {
  const usersRef = collection(db, "users");
  const term = searchTerm.trim().toLowerCase();

  // Fetch users ordered by displayName, filter client-side for case-insensitive match
  const q = query(usersRef, orderBy("displayName"), limit(200));
  const snap = await getDocs(q);

  const users = snap.docs
    .filter(d => {
      const name = (d.data().displayName || "").toLowerCase();
      const email = (d.data().email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    })
    .slice(0, pageSize)
    .map(d => ({
      id: d.id,
      displayName: d.data().displayName,
      email: d.data().email,
      role: d.data().role || "user",
      moderationStatus: d.data().moderationStatus || "active",
      subscriptionType: d.data().subscription?.type || "unknown",
      createdAt: d.data().createdAt,
    }));

  return { users, lastDoc: null };
}

/** Get user detail for admin view (aggregated stats, no private content) */
export async function getAdminUserDetail(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();

  const [goalsSnap, habitsSnap, journalSnap, postsSnap, tasksSnap] = await Promise.all([
    getDocs(query(collection(db, "goals"), where("userId", "==", userId))),
    getDocs(query(collection(db, "habits"), where("userId", "==", userId))),
    getDocs(query(collection(db, "journalEntries"), where("userId", "==", userId))),
    getDocs(query(collection(db, "posts"), where("userId", "==", userId))),
    getDocs(query(collection(db, "tasks"), where("userId", "==", userId))),
  ]);

  const modHistorySnap = await getDocs(
    query(
      collection(db, "users", userId, "moderationHistory"),
      orderBy("timestamp", "desc")
    )
  );

  return {
    id: userId,
    displayName: userData.displayName,
    email: userData.email,
    avatar: userData.avatar || userData.photoURL,
    bio: userData.bio,
    role: userData.role || "user",
    moderationStatus: userData.moderationStatus || "active",
    suspendedUntil: userData.suspendedUntil,
    subscription: {
      type: userData.subscription?.type || "unknown",
      trialStartedAt: userData.subscription?.trialStartedAt,
      trialExpiresAt: userData.subscription?.trialExpiresAt,
      premiumStartedAt: userData.subscription?.premiumStartedAt,
      billingPeriod: userData.subscription?.billingPeriod,
    },
    createdAt: userData.createdAt,
    activityStats: {
      goals: goalsSnap.size,
      habits: habitsSnap.size,
      journalEntries: journalSnap.size,
      posts: postsSnap.size,
      tasks: tasksSnap.size,
    },
    moderationHistory: modHistorySnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })),
  };
}

/** Read a single analytics document */
export async function getAnalyticsDoc(docId) {
  const ref = doc(db, "adminAnalytics", docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Fetch the last N daily snapshot docs for trend computation.
 * Returns array sorted oldest-first.
 */
export async function getDailySnapshots(days = 7) {
  const snapshots = [];
  const now = new Date();
  for (let i = days; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ref = doc(db, "adminAnalytics", `daily-${dateStr}`);
    const snap = await getDoc(ref);
    if (snap.exists()) snapshots.push({ id: snap.id, ...snap.data() });
  }
  return snapshots;
}

/**
 * Client-side analytics aggregation.
 * Mirrors the Cloud Function logic but runs from the browser.
 * Writes results to adminAnalytics so both tabs can read them.
 */
export async function runClientAggregation() {
  const analyticsRef = (docId) => doc(db, "adminAnalytics", docId);
  const usersCol = collection(db, "users");

  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // 1. Rolling user metrics
  const [totalSnap, dauSnap, wauSnap, mauSnap] = await Promise.all([
    getCountFromServer(query(usersCol)),
    getCountFromServer(query(usersCol, where("lastActiveAt", ">=", oneDayAgo))),
    getCountFromServer(query(usersCol, where("lastActiveAt", ">=", sevenDaysAgo))),
    getCountFromServer(query(usersCol, where("lastActiveAt", ">=", thirtyDaysAgo))),
  ]);

  const totalUsers = totalSnap.data().count;
  const dau = dauSnap.data().count;
  const wau = wauSnap.data().count;
  const mau = mauSnap.data().count;

  // Retention: users created 7+ days ago who were active in last 7 days
  const [oldSnap, retainedSnap] = await Promise.all([
    getCountFromServer(query(usersCol, where("createdAt", "<=", sevenDaysAgo))),
    getCountFromServer(query(usersCol, where("createdAt", "<=", sevenDaysAgo), where("lastActiveAt", ">=", sevenDaysAgo))),
  ]);
  const oldCount = oldSnap.data().count;
  const retainedCount = retainedSnap.data().count;
  const retention7d = oldCount > 0 ? retainedCount / oldCount : 0;

  await setDoc(analyticsRef("rolling"), {
    totalUsers, dau, wau, mau, retention7d,
    updatedAt: serverTimestamp(),
  });

  // 2. Subscription metrics
  const [trialSnap, premiumSnap, coachingSnap, expiredSnap] = await Promise.all([
    getCountFromServer(query(usersCol, where("subscription.type", "==", "trial"))),
    getCountFromServer(query(usersCol, where("subscription.type", "==", "premium"))),
    getCountFromServer(query(usersCol, where("subscription.type", "==", "coaching"))),
    getCountFromServer(query(usersCol, where("subscription.type", "==", "expired"))),
  ]);

  const activeTrials = trialSnap.data().count;
  const paidUsers = premiumSnap.data().count;
  const coachingUsers = coachingSnap.data().count;
  const expiredUsers = expiredSnap.data().count;
  const totalSub = activeTrials + paidUsers + coachingUsers + expiredUsers;
  const conversionRate = totalSub > 0 ? paidUsers / totalSub : 0;

  await setDoc(analyticsRef("subscriptionMetrics"), {
    activeTrials, paidUsers, coachingUsers, expiredUsers,
    conversionRate, churnRate: totalSub > 0 ? expiredUsers / totalSub : 0,
    updatedAt: serverTimestamp(),
  });

  // 3. Feature adoption
  const featureCollections = [
    ["goals", "pctWithGoals"],
    ["habits", "pctWithHabits"],
    ["journalEntries", "pctWithJournal"],
    ["tasks", "pctWithTasks"],
    ["posts", "pctWithCommunity"],
  ];

  const adoption = {};
  let totalHabits = 0;

  await Promise.all(featureCollections.map(async ([colName, metricKey]) => {
    const snap = await getDocs(query(collection(db, colName), limit(500)));
    const uniqueUsers = new Set();
    snap.docs.forEach((d) => uniqueUsers.add(d.data().userId));
    adoption[metricKey] = totalUsers > 0 ? uniqueUsers.size / totalUsers : 0;
    if (colName === "habits") totalHabits = snap.size;
  }));

  adoption.avgHabitsPerUser = totalUsers > 0 ? totalHabits / totalUsers : 0;
  adoption.avgCompletionRate = null;

  await setDoc(analyticsRef("featureAdoption"), {
    ...adoption,
    updatedAt: serverTimestamp(),
  });

  // 4. Community vitals
  const [groupsSnap, postsSnap, challengePartSnap, connectionsSnap, acceptedSnap] = await Promise.all([
    getCountFromServer(query(collection(db, "groups"))),
    getCountFromServer(query(collection(db, "posts"))),
    getCountFromServer(query(collection(db, "challengeParticipants"))),
    getCountFromServer(query(collection(db, "connections"))),
    getCountFromServer(query(collection(db, "connections"), where("status", "==", "accepted"))),
  ]);

  const activeGroups = groupsSnap.data().count;
  const totalPosts = postsSnap.data().count;
  const totalConnections = connectionsSnap.data().count;
  const acceptedConnections = acceptedSnap.data().count;

  await setDoc(analyticsRef("communityVitals"), {
    activeGroups,
    avgPostsPerGroup: activeGroups > 0 ? totalPosts / activeGroups : 0,
    connectionAcceptRate: totalConnections > 0 ? acceptedConnections / totalConnections : 0,
    challengeParticipation: challengePartSnap.data().count,
    updatedAt: serverTimestamp(),
  });

  // 6. Habit health
  const activeHabitsSnap = await getDocs(query(collection(db, "habits"), where("active", "==", true), limit(500)));
  const activeHabits = activeHabitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const todayCompletionsSnap = await getDocs(
    query(collection(db, "habitCompletions"), where("dateISO", "==", todayStr), limit(500))
  );
  const todayCompletionCount = todayCompletionsSnap.size;
  const habitCompletionRate = activeHabits.length > 0 ? todayCompletionCount / activeHabits.length : 0;

  const streakBuckets = { "0": 0, "1-3": 0, "4-7": 0, "8-14": 0, "15-30": 0, "30+": 0 };
  activeHabits.forEach(h => {
    const s = h.streak || 0;
    if (s === 0) streakBuckets["0"]++;
    else if (s <= 3) streakBuckets["1-3"]++;
    else if (s <= 7) streakBuckets["4-7"]++;
    else if (s <= 14) streakBuckets["8-14"]++;
    else if (s <= 30) streakBuckets["15-30"]++;
    else streakBuckets["30+"]++;
  });

  const missedHabits = activeHabits.filter(h => (h.consecutiveMisses || 0) > 0 || h.missedYesterday);
  const bouncedBack = missedHabits.filter(h => {
    return todayCompletionsSnap.docs.some(c => c.data().habitId === h.id);
  });
  const bounceBackRate = missedHabits.length > 0 ? bouncedBack.length / missedHabits.length : 0;

  const catCounts = {};
  activeHabits.forEach(h => {
    const cat = h.category || "General";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  await setDoc(analyticsRef("habitHealth"), {
    avgCompletionRate: habitCompletionRate,
    bounceBackRate,
    streakDistribution: streakBuckets,
    topCategories,
    updatedAt: serverTimestamp(),
  });

  // 7. Wellness signal
  const todayCheckInsSnap = await getDocs(
    query(collection(db, "brainStateCheckIns"), where("date", "==", todayStr), limit(500))
  );
  const brainStateDistribution = {};
  let protocolCompletedCount = 0;
  todayCheckInsSnap.docs.forEach(d => {
    const data = d.data();
    const state = data.brainState || "unknown";
    brainStateDistribution[state] = (brainStateDistribution[state] || 0) + 1;
    if (data.protocolCompleted) protocolCompletedCount++;
  });
  const protocolCompletionRate = todayCheckInsSnap.size > 0
    ? protocolCompletedCount / todayCheckInsSnap.size : 0;

  const metricsSnap = await getDocs(
    query(collection(db, "brainMetrics"), where("date", ">=", todayStr.slice(0, 8) + "01"), limit(500))
  );
  let readinessSum = 0;
  let readinessCount = 0;
  metricsSnap.docs.forEach(d => {
    const score = d.data().readinessScore;
    if (score != null) { readinessSum += score; readinessCount++; }
  });
  const avgReadinessScore = readinessCount > 0 ? Math.round(readinessSum / readinessCount) : null;

  const brainStateCheckinRate = dau > 0 ? todayCheckInsSnap.size / dau : 0;

  await setDoc(analyticsRef("wellnessSignal"), {
    brainStateDistribution,
    protocolCompletionRate,
    avgReadinessScore,
    brainStateCheckinRate,
    updatedAt: serverTimestamp(),
  });

  // 8. Engagement heatmap (last 7 days)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeBuckets = ["morning", "afternoon", "evening"];
  const matrix = {};
  dayNames.forEach(d => timeBuckets.forEach(t => { matrix[`${d}_${t}`] = 0; }));

  function bucketTimestamp(ts) {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return null;
    const day = dayNames[date.getDay()];
    const hour = date.getHours();
    let bucket;
    if (hour >= 6 && hour < 12) bucket = "morning";
    else if (hour >= 12 && hour < 18) bucket = "afternoon";
    else bucket = "evening";
    return `${day}_${bucket}`;
  }

  const heatmapCollections = [
    ["habitCompletions", "createdAt"],
    ["brainStateCheckIns", "createdAt"],
    ["journalEntries", "createdAt"],
  ];

  await Promise.all(heatmapCollections.map(async ([colName, tsField]) => {
    const snap = await getDocs(
      query(collection(db, colName), where(tsField, ">=", sevenDaysAgo), limit(1000))
    );
    snap.docs.forEach(d => {
      const key = bucketTimestamp(d.data()[tsField]);
      if (key && matrix[key] != null) matrix[key]++;
    });
  }));

  const focusSnap = await getDocs(
    query(collection(db, "focusSessions"), where("startedAt", ">=", sevenDaysAgo), limit(1000))
  );
  focusSnap.docs.forEach(d => {
    const key = bucketTimestamp(d.data().startedAt);
    if (key && matrix[key] != null) matrix[key]++;
  });

  await setDoc(analyticsRef("engagementHeatmap"), {
    matrix,
    periodDays: 7,
    updatedAt: serverTimestamp(),
  });

  // 9. Lifecycle funnel
  const onboardedSnap = await getCountFromServer(
    query(usersCol, where("hasCompletedOnboarding", "==", true))
  );
  const onboardingComplete = onboardedSnap.data().count;

  const habitsUserSnap = await getDocs(query(collection(db, "habits"), limit(500)));
  const usersWithHabits = new Set();
  habitsUserSnap.docs.forEach(d => usersWithHabits.add(d.data().userId));
  const firstHabit = usersWithHabits.size;

  const oldUsers30Snap = await getCountFromServer(
    query(usersCol, where("createdAt", "<=", thirtyDaysAgo))
  );
  const retained30Snap = await getCountFromServer(
    query(usersCol, where("createdAt", "<=", thirtyDaysAgo), where("lastActiveAt", ">=", thirtyDaysAgo))
  );
  const retained30d = retained30Snap.data().count;

  const onboardingCompletionRate = totalUsers > 0 ? onboardingComplete / totalUsers : 0;

  await setDoc(analyticsRef("lifecycleFunnel"), {
    signup: totalUsers,
    onboardingComplete,
    firstHabit,
    active7d: wau,
    retained30d,
    updatedAt: serverTimestamp(),
  });

  // 10. Journal metrics
  const recentJournalSnap = await getDocs(
    query(collection(db, "journalEntries"), where("createdAt", ">=", thirtyDaysAgo), limit(500))
  );
  const moodDistribution = {};
  const journalUsersThisWeek = new Set();
  recentJournalSnap.docs.forEach(d => {
    const data = d.data();
    const mood = data.mood || "unknown";
    moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;
    const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
    if (ts >= sevenDaysAgo) journalUsersThisWeek.add(data.userId);
  });
  const journalingRate = wau > 0 ? journalUsersThisWeek.size / wau : 0;

  const todayReflectionsSnap = await getCountFromServer(
    query(collection(db, "dailyReflections"), where("date", "==", todayStr))
  );
  const reflectionCompletionRate = dau > 0 ? todayReflectionsSnap.data().count / dau : 0;

  await setDoc(analyticsRef("journalMetrics"), {
    moodDistribution,
    journalingRate,
    reflectionCompletionRate,
    updatedAt: serverTimestamp(),
  });

  // 11. Daily snapshot (for trend comparisons)
  await setDoc(analyticsRef(`daily-${todayStr}`), {
    date: todayStr,
    totalUsers,
    dau,
    wau,
    retention7d,
    habitCompletionRate,
    brainStateCheckinRate,
    onboardingCompletionRate,
    conversionRate,
    funnelCounts: { signup: totalUsers, onboardingComplete, firstHabit, active7d: wau, retained30d },
    updatedAt: serverTimestamp(),
  });

  // 5. Meta
  await setDoc(analyticsRef("meta"), {
    lastRunAt: serverTimestamp(),
    status: "success",
    source: "client",
  });
}
