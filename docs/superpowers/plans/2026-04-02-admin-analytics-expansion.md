# Admin Analytics Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the admin dashboard Overview (8 trend cards) and Analytics (7 sections with funnel, heatmap, wellness, habits, adoption, community, journal) tabs using client-side aggregation with daily snapshots.

**Architecture:** Extend `runClientAggregation()` in `admin.service.js` to compute all new metrics and write daily snapshots. New reusable UI components in `src/components/admin/` render the data. Overview reads snapshots for trend comparison; Analytics reads dedicated analytics docs.

**Tech Stack:** React 19, Tailwind CSS, recharts (already installed), lucide-react (already installed), Firebase Firestore client SDK.

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/components/admin/OverviewCard.jsx` | Reusable card: big number, trend arrow, subtitle |
| `src/components/admin/LifecycleFunnel.jsx` | Horizontal funnel with 5 stages and conversion rates |
| `src/components/admin/EngagementHeatmap.jsx` | 7x3 day/time grid with color intensity cells |
| `src/components/admin/WellnessSignalCard.jsx` | Brain state donut chart + protocol/readiness stats |
| `src/components/admin/HabitHealthCard.jsx` | Completion rate, streak bar chart, top categories |
| `src/components/admin/JournalMetricsCard.jsx` | Mood bar chart + journaling/reflection stats |

### Modified Files
| File | Changes |
|---|---|
| `src/services/db/admin.service.js` | Expand `runClientAggregation()` with new metrics + daily snapshot + `getDailySnapshots()` helper |
| `src/pages/Admin/OverviewTab.jsx` | Replace 4 cards with 8 `OverviewCard` instances, add trend logic |
| `src/pages/Admin/AnalyticsTab.jsx` | Add funnel, heatmap, wellness, habit health, journal sections; enhance feature adoption |

---

## Task 1: Expand Aggregation Service

**Files:**
- Modify: `src/services/db/admin.service.js`

This task adds all new metric computations and the daily snapshot write to `runClientAggregation()`, plus a `getDailySnapshots()` helper for trend computation.

- [ ] **Step 1: Add `getDailySnapshots` helper**

Add this function after the existing `getAnalyticsDoc` function in `src/services/db/admin.service.js`:

```javascript
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
```

- [ ] **Step 2: Add date helper at top of `runClientAggregation`**

Inside `runClientAggregation()`, after the existing `thirtyDaysAgo` line, add a `todayStr` constant and a helper for the daily snapshot:

```javascript
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
```

- [ ] **Step 3: Add habit health aggregation**

After the existing "5. Meta" section in `runClientAggregation()`, add (before the meta write):

```javascript
  // 6. Habit health
  const activeHabitsSnap = await getDocs(query(collection(db, "habits"), where("active", "==", true), limit(500)));
  const activeHabits = activeHabitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const todayCompletionsSnap = await getDocs(
    query(collection(db, "habitCompletions"), where("dateISO", "==", todayStr), limit(500))
  );
  const todayCompletionCount = todayCompletionsSnap.size;
  const habitCompletionRate = activeHabits.length > 0 ? todayCompletionCount / activeHabits.length : 0;

  // Streak distribution
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

  // Bounce-back rate
  const missedHabits = activeHabits.filter(h => (h.consecutiveMisses || 0) > 0 || h.missedYesterday);
  const bouncedBack = missedHabits.filter(h => {
    return todayCompletionsSnap.docs.some(c => c.data().habitId === h.id);
  });
  const bounceBackRate = missedHabits.length > 0 ? bouncedBack.length / missedHabits.length : 0;

  // Top categories
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
```

- [ ] **Step 4: Add wellness signal aggregation**

```javascript
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

  // Brain readiness from brainMetrics (last 7 days)
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
```

- [ ] **Step 5: Add engagement heatmap aggregation**

```javascript
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

  // Focus sessions use startedAt
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
```

- [ ] **Step 6: Add lifecycle funnel aggregation**

```javascript
  // 9. Lifecycle funnel
  const onboardedSnap = await getCountFromServer(
    query(usersCol, where("hasCompletedOnboarding", "==", true))
  );
  const onboardingComplete = onboardedSnap.data().count;

  // Users with at least one habit
  const habitsUserSnap = await getDocs(query(collection(db, "habits"), limit(500)));
  const usersWithHabits = new Set();
  habitsUserSnap.docs.forEach(d => usersWithHabits.add(d.data().userId));
  const firstHabit = usersWithHabits.size;

  // 30-day retention
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
```

- [ ] **Step 7: Add journal metrics aggregation**

```javascript
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
```

- [ ] **Step 8: Add daily snapshot write**

Add this at the very end of `runClientAggregation()`, just before the meta write:

```javascript
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
```

- [ ] **Step 9: Verify build compiles**

Run: `npx react-scripts build 2>&1 | tail -5`
Expected: "The build folder is ready to be deployed."

- [ ] **Step 10: Commit**

```bash
git add src/services/db/admin.service.js
git commit -m "feat(admin): expand aggregation with habit health, wellness, heatmap, funnel, journal, daily snapshots"
```

---

## Task 2: OverviewCard Component

**Files:**
- Create: `src/components/admin/OverviewCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Reusable overview card with big number, trend arrow, and subtitle.
 * @param {object} props
 * @param {React.ElementType} props.icon - Lucide icon component
 * @param {string} props.title - Card label
 * @param {string} props.value - Big number to display
 * @param {string} [props.subtitle] - Context line below the value
 * @param {number} [props.trendPct] - Percentage change vs 7-day avg (decimal, e.g. 0.12 = +12%)
 * @param {boolean} [props.urgent] - Red styling for alerts
 * @param {boolean} [props.invertTrend] - If true, down is good (e.g. moderation queue)
 */
export default function OverviewCard({ icon: Icon, title, value, subtitle, trendPct, urgent, invertTrend }) {
  let TrendIcon = Minus;
  let trendColor = "text-muted-sage-gray";
  let trendLabel = "";

  if (trendPct != null && Math.abs(trendPct) >= 0.05) {
    const isUp = trendPct > 0;
    const isGood = invertTrend ? !isUp : isUp;
    TrendIcon = isUp ? TrendingUp : TrendingDown;
    trendColor = isGood ? "text-emerald-600" : "text-red-500";
    trendLabel = `${isUp ? "+" : ""}${(trendPct * 100).toFixed(1)}%`;
  } else if (trendPct != null) {
    trendLabel = "flat";
  }

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <div className="flex items-center gap-vara-sm mb-vara-sm">
        <Icon size={20} className={urgent ? "text-red-500" : "text-evergreen-teal"} />
        <span className="text-vara-xs text-muted-sage-gray font-medium">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-vara-2xl font-bold ${urgent ? "text-red-500" : "text-soft-charcoal"}`}>
          {value}
        </span>
        {trendLabel && (
          <span className={`inline-flex items-center gap-0.5 text-vara-xs font-medium ${trendColor}`}>
            <TrendIcon size={14} />
            {trendLabel}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-vara-xs text-muted-sage-gray mt-vara-xs">{subtitle}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx react-scripts build 2>&1 | tail -5`
Expected: "The build folder is ready to be deployed."

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/OverviewCard.jsx
git commit -m "feat(admin): add OverviewCard component with trend arrows"
```

---

## Task 3: Rewrite OverviewTab with 8 Cards + Trends

**Files:**
- Modify: `src/pages/Admin/OverviewTab.jsx`

- [ ] **Step 1: Rewrite OverviewTab**

Replace the entire contents of `src/pages/Admin/OverviewTab.jsx` with:

```jsx
import React, { useState, useEffect } from "react";
import { Users, Activity, CheckCircle2, Brain, UserCheck, BarChart3, CreditCard, Shield } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { getAnalyticsDoc, getDailySnapshots, runClientAggregation } from "../../services/db/admin.service";
import { getModerationStats } from "../../services/db/adminModeration.service";
import OverviewCard from "../../components/admin/OverviewCard";

function computeTrend(currentValue, snapshots, field) {
  if (!snapshots || snapshots.length < 2) return null;
  const values = snapshots.map(s => s[field]).filter(v => v != null);
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return currentValue > 0 ? 1 : null;
  return (currentValue - avg) / avg;
}

export default function OverviewTab() {
  const [rolling, setRolling] = useState(null);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState(null);
  const [wellnessSignal, setWellnessSignal] = useState(null);
  const [habitHealth, setHabitHealth] = useState(null);
  const [lifecycleFunnel, setLifecycleFunnel] = useState(null);
  const [moderationStats, setModerationStats] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAll() {
    const [rollingDoc, subDoc, wellDoc, habitDoc, funnelDoc, modStats, snaps] = await Promise.all([
      getAnalyticsDoc("rolling"),
      getAnalyticsDoc("subscriptionMetrics"),
      getAnalyticsDoc("wellnessSignal"),
      getAnalyticsDoc("habitHealth"),
      getAnalyticsDoc("lifecycleFunnel"),
      getModerationStats(),
      getDailySnapshots(7),
    ]);
    return { rollingDoc, subDoc, wellDoc, habitDoc, funnelDoc, modStats, snaps };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data = await fetchAll();
        if (!data.rollingDoc) {
          try { await runClientAggregation(); data = await fetchAll(); } catch {}
        }
        if (!cancelled) {
          setRolling(data.rollingDoc);
          setSubscriptionMetrics(data.subDoc);
          setWellnessSignal(data.wellDoc);
          setHabitHealth(data.habitDoc);
          setLifecycleFunnel(data.funnelDoc);
          setModerationStats(data.modStats);
          setSnapshots(data.snaps);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("OverviewTab fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      try {
        const triggerFn = httpsCallable(functions, "triggerAggregation");
        await triggerFn();
      } catch {
        await runClientAggregation();
      }
      const data = await fetchAll();
      setRolling(data.rollingDoc);
      setSubscriptionMetrics(data.subDoc);
      setWellnessSignal(data.wellDoc);
      setHabitHealth(data.habitDoc);
      setLifecycleFunnel(data.funnelDoc);
      setModerationStats(data.modStats);
      setSnapshots(data.snaps);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="text-muted-sage-gray text-vara-sm py-vara-lg">Loading overview...</div>;
  }

  const hasData = rolling || subscriptionMetrics || moderationStats;

  const refreshButton = (
    <div className="flex justify-end">
      <button onClick={handleRefresh} disabled={refreshing}
        className="inline-flex items-center gap-vara-sm px-vara-base py-2 text-vara-sm font-medium text-evergreen-teal border border-evergreen-teal rounded-vara-lg hover:bg-dew-sage-light transition-colors disabled:opacity-50">
        {refreshing ? "Refreshing..." : "Refresh Analytics"}
      </button>
    </div>
  );

  if (!hasData) {
    return (
      <div className="space-y-vara-base">
        {refreshButton}
        <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
          No analytics data yet. Click Refresh Analytics to generate.
        </div>
      </div>
    );
  }

  const totalUsers = rolling?.totalUsers ?? 0;
  const dau = rolling?.dau ?? 0;
  const habitRate = habitHealth?.avgCompletionRate;
  const checkinRate = wellnessSignal?.brainStateCheckinRate;
  const onboardingRate = totalUsers > 0 && lifecycleFunnel
    ? lifecycleFunnel.onboardingComplete / totalUsers : null;
  const retention = rolling?.retention7d;
  const conversion = subscriptionMetrics?.conversionRate;

  // Compute new-this-week from snapshots
  const oldestSnap = snapshots[0];
  const newThisWeek = oldestSnap?.totalUsers != null ? totalUsers - oldestSnap.totalUsers : null;

  const cards = [
    {
      icon: Users, title: "Total Users",
      value: totalUsers.toLocaleString(),
      subtitle: newThisWeek != null ? `+${newThisWeek} this week` : null,
      trendPct: computeTrend(totalUsers, snapshots, "totalUsers"),
    },
    {
      icon: Activity, title: "Daily Active Users",
      value: dau.toLocaleString(),
      subtitle: `${dau} of ${totalUsers} total`,
      trendPct: computeTrend(dau, snapshots, "dau"),
    },
    {
      icon: CheckCircle2, title: "Habit Completion Rate",
      value: habitRate != null ? `${(habitRate * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(habitRate, snapshots, "habitCompletionRate"),
    },
    {
      icon: Brain, title: "Brain State Check-in",
      value: checkinRate != null ? `${(checkinRate * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(checkinRate, snapshots, "brainStateCheckinRate"),
    },
    {
      icon: UserCheck, title: "Onboarding Completion",
      value: onboardingRate != null ? `${(onboardingRate * 100).toFixed(1)}%` : "--",
      subtitle: lifecycleFunnel ? `${lifecycleFunnel.onboardingComplete} completed, ${totalUsers - lifecycleFunnel.onboardingComplete} pending` : null,
      trendPct: computeTrend(onboardingRate, snapshots, "onboardingCompletionRate"),
    },
    {
      icon: BarChart3, title: "7-Day Retention",
      value: retention != null ? `${(retention * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(retention, snapshots, "retention7d"),
    },
    {
      icon: CreditCard, title: "Trial Conversion",
      value: conversion != null ? `${(conversion * 100).toFixed(1)}%` : "--",
      subtitle: subscriptionMetrics?.activeTrials != null ? `${subscriptionMetrics.activeTrials} active trials` : null,
      trendPct: computeTrend(conversion, snapshots, "conversionRate"),
    },
    {
      icon: Shield, title: "Moderation Queue",
      value: moderationStats?.pendingCount?.toString() ?? "--",
      subtitle: moderationStats?.urgentCount > 0 ? `${moderationStats.urgentCount} urgent` : null,
      urgent: moderationStats?.urgentCount > 0,
    },
  ];

  return (
    <div className="space-y-vara-base">
      {refreshButton}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-vara-base">
        {cards.map((card) => (
          <OverviewCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx react-scripts build 2>&1 | tail -5`
Expected: "The build folder is ready to be deployed."

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin/OverviewTab.jsx
git commit -m "feat(admin): rewrite OverviewTab with 8 trend cards"
```

---

## Task 4: LifecycleFunnel Component

**Files:**
- Create: `src/components/admin/LifecycleFunnel.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";

const STAGES = [
  { key: "signup", label: "Signup" },
  { key: "onboardingComplete", label: "Onboarding" },
  { key: "firstHabit", label: "First Habit" },
  { key: "active7d", label: "7-Day Active" },
  { key: "retained30d", label: "30-Day Retained" },
];

function conversionColor(rate) {
  if (rate >= 0.7) return "bg-emerald-500";
  if (rate >= 0.4) return "bg-amber-400";
  return "bg-red-400";
}

export default function LifecycleFunnel({ data }) {
  if (!data) return null;

  const maxCount = data.signup || 1;

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        User Lifecycle Funnel
      </h3>
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const count = data[stage.key] ?? 0;
          const prevCount = idx === 0 ? count : (data[STAGES[idx - 1].key] ?? 1);
          const convRate = prevCount > 0 ? count / prevCount : 0;
          const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-vara-sm font-medium text-soft-charcoal">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-vara-sm font-semibold text-soft-charcoal">{count.toLocaleString()}</span>
                  {idx > 0 && (
                    <span className={`text-vara-xs px-1.5 py-0.5 rounded text-white ${conversionColor(convRate)}`}>
                      {(convRate * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${idx === 0 ? "bg-evergreen-teal" : conversionColor(convRate)}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/LifecycleFunnel.jsx
git commit -m "feat(admin): add LifecycleFunnel component"
```

---

## Task 5: EngagementHeatmap Component

**Files:**
- Create: `src/components/admin/EngagementHeatmap.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BUCKETS = [
  { key: "morning", label: "Morning (6a-12p)" },
  { key: "afternoon", label: "Afternoon (12p-6p)" },
  { key: "evening", label: "Evening (6p-12a)" },
];

function intensityColor(value, max) {
  if (max === 0 || value === 0) return "bg-gray-100";
  const ratio = value / max;
  if (ratio >= 0.75) return "bg-teal-600";
  if (ratio >= 0.5) return "bg-teal-400";
  if (ratio >= 0.25) return "bg-teal-200";
  return "bg-teal-100";
}

export default function EngagementHeatmap({ data }) {
  if (!data?.matrix) return null;

  const matrix = data.matrix;
  const allValues = Object.values(matrix);
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Engagement by Day & Time
      </h3>
      <p className="text-vara-xs text-muted-sage-gray mb-vara-base">Last 7 days — darker = more activity</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-vara-xs text-muted-sage-gray font-medium text-left pr-3 pb-2" />
              {TIME_BUCKETS.map(t => (
                <th key={t.key} className="text-vara-xs text-muted-sage-gray font-medium text-center pb-2 px-2">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td className="text-vara-xs font-medium text-soft-charcoal pr-3 py-1">{day}</td>
                {TIME_BUCKETS.map(t => {
                  const val = matrix[`${day}_${t.key}`] || 0;
                  return (
                    <td key={t.key} className="px-2 py-1">
                      <div
                        className={`h-8 rounded ${intensityColor(val, maxVal)} flex items-center justify-center`}
                        title={`${day} ${t.label}: ${val} actions`}
                      >
                        <span className="text-vara-xs font-medium text-soft-charcoal/70">{val || ""}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/EngagementHeatmap.jsx
git commit -m "feat(admin): add EngagementHeatmap component"
```

---

## Task 6: WellnessSignalCard Component

**Files:**
- Create: `src/components/admin/WellnessSignalCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BRAIN_STATES } from "../../constants/brainStateProtocols";

const STATE_COLORS = {};
BRAIN_STATES.forEach(s => { STATE_COLORS[s.state] = s.color; });

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

export default function WellnessSignalCard({ data }) {
  if (!data) return null;

  const distribution = data.brainStateDistribution || {};
  const pieData = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => ({
      name: BRAIN_STATES.find(s => s.state === state)?.label || state,
      value: count,
      color: STATE_COLORS[state] || "#9CA3AF",
    }));

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Wellness Signal
      </h3>

      {pieData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="mt-vara-sm space-y-0">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Protocol Completion</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.protocolCompletionRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm">
          <span className="text-vara-sm text-muted-sage-gray">Avg Brain Readiness</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">
            {data.avgReadinessScore != null ? `${data.avgReadinessScore}/100` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/WellnessSignalCard.jsx
git commit -m "feat(admin): add WellnessSignalCard with brain state donut"
```

---

## Task 7: HabitHealthCard Component

**Files:**
- Create: `src/components/admin/HabitHealthCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

const STREAK_ORDER = ["0", "1-3", "4-7", "8-14", "15-30", "30+"];

export default function HabitHealthCard({ data }) {
  if (!data) return null;

  const streakData = data.streakDistribution
    ? STREAK_ORDER.map(bucket => ({
        name: bucket,
        count: data.streakDistribution[bucket] || 0,
      }))
    : [];

  const topCategories = data.topCategories || [];

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Habit Health
      </h3>

      <div className="space-y-0 mb-vara-sm">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Avg Completion Rate</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.avgCompletionRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Bounce-Back Rate</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.bounceBackRate)}</span>
        </div>
      </div>

      {streakData.length > 0 && (
        <>
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Streak Distribution (days)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={streakData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2A7C6F" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {topCategories.length > 0 && (
        <div className="mt-vara-sm">
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Top Categories</p>
          {topCategories.map((cat, idx) => (
            <div key={idx} className="flex justify-between items-center py-1">
              <span className="text-vara-xs text-soft-charcoal">{cat.name}</span>
              <span className="text-vara-xs font-medium text-muted-sage-gray">{cat.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/HabitHealthCard.jsx
git commit -m "feat(admin): add HabitHealthCard with streaks and categories"
```

---

## Task 8: JournalMetricsCard Component

**Files:**
- Create: `src/components/admin/JournalMetricsCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MOOD_ORDER = ["great", "good", "okay", "low", "difficult"];
const MOOD_COLORS = {
  great: "#10B981",
  good: "#6BB8A4",
  okay: "#9CA3AF",
  low: "#FBBF24",
  difficult: "#F87171",
};

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

export default function JournalMetricsCard({ data }) {
  if (!data) return null;

  const moodData = data.moodDistribution
    ? MOOD_ORDER.map(mood => ({
        name: mood.charAt(0).toUpperCase() + mood.slice(1),
        count: data.moodDistribution[mood] || 0,
        color: MOOD_COLORS[mood] || "#9CA3AF",
      })).filter(d => d.count > 0)
    : [];

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Journal & Reflection
      </h3>

      {moodData.length > 0 && (
        <>
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Mood Distribution (30 days)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={moodData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {moodData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      <div className="mt-vara-sm space-y-0">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Journaling Rate (7d)</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.journalingRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm">
          <span className="text-vara-sm text-muted-sage-gray">Reflection Completion</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.reflectionCompletionRate)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/JournalMetricsCard.jsx
git commit -m "feat(admin): add JournalMetricsCard with mood distribution"
```

---

## Task 9: Rewrite AnalyticsTab with 7 Sections

**Files:**
- Modify: `src/pages/Admin/AnalyticsTab.jsx`

- [ ] **Step 1: Rewrite AnalyticsTab**

Replace the entire contents of `src/pages/Admin/AnalyticsTab.jsx` with:

```jsx
import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getAnalyticsDoc, runClientAggregation } from "../../services/db/admin.service";
import LifecycleFunnel from "../../components/admin/LifecycleFunnel";
import EngagementHeatmap from "../../components/admin/EngagementHeatmap";
import WellnessSignalCard from "../../components/admin/WellnessSignalCard";
import HabitHealthCard from "../../components/admin/HabitHealthCard";
import JournalMetricsCard from "../../components/admin/JournalMetricsCard";

const CHART_COLORS = ["#2A7C6F", "#A8D5BA", "#6BB8A4", "#D4E8D0", "#4A9E8E", "#C1DABE"];

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-vara-sm border-b border-divider last:border-b-0">
      <span className="text-vara-sm text-muted-sage-gray">{label}</span>
      <span className="text-vara-sm font-medium text-soft-charcoal">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">{title}</h3>
      {children}
    </div>
  );
}

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

const ALL_DOC_IDS = [
  "rolling", "subscriptionMetrics", "featureAdoption", "communityVitals",
  "wellnessSignal", "habitHealth", "engagementHeatmap", "lifecycleFunnel", "journalMetrics",
];

export default function AnalyticsTab() {
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.all(ALL_DOC_IDS.map(id => getAnalyticsDoc(id)));
      const map = {};
      ALL_DOC_IDS.forEach((id, i) => { map[id] = results[i]; });
      return map;
    }

    (async () => {
      try {
        let data = await fetchAll();
        if (!data.rolling) {
          try { await runClientAggregation(); data = await fetchAll(); } catch {}
        }
        if (!cancelled) setDocs(data);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("AnalyticsTab fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="text-muted-sage-gray text-vara-sm py-vara-lg">Loading analytics...</div>;
  }

  const hasData = Object.values(docs).some(d => d != null);
  if (!hasData) {
    return (
      <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
        No analytics data yet. Use the Overview tab's Refresh Analytics button to generate.
      </div>
    );
  }

  const { rolling, subscriptionMetrics, featureAdoption, communityVitals } = docs;

  // Subscription pie data
  const subPieData = subscriptionMetrics
    ? [
        { name: "Trial", value: subscriptionMetrics.activeTrials || 0 },
        { name: "Premium", value: subscriptionMetrics.paidUsers || 0 },
        { name: "Coaching", value: subscriptionMetrics.coachingUsers || 0 },
        { name: "Expired", value: subscriptionMetrics.expiredUsers || 0 },
      ].filter(d => d.value > 0)
    : [];

  // Feature adoption — enhanced with more features, sorted descending
  const adoptionBarData = featureAdoption
    ? [
        { name: "Habits", pct: (featureAdoption.pctWithHabits || 0) * 100 },
        { name: "Goals", pct: (featureAdoption.pctWithGoals || 0) * 100 },
        { name: "Journal", pct: (featureAdoption.pctWithJournal || 0) * 100 },
        { name: "Tasks", pct: (featureAdoption.pctWithTasks || 0) * 100 },
        { name: "Community", pct: (featureAdoption.pctWithCommunity || 0) * 100 },
      ].sort((a, b) => b.pct - a.pct)
    : [];

  // Community — posts this week
  const postsThisWeek = communityVitals?.postsThisWeek;

  return (
    <div className="space-y-vara-base">
      {/* Row 1: Full-width sections */}
      <LifecycleFunnel data={docs.lifecycleFunnel} />
      <EngagementHeatmap data={docs.engagementHeatmap} />

      {/* Row 2: Half-width grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base">
        {/* Wellness Signal */}
        <WellnessSignalCard data={docs.wellnessSignal} />

        {/* Habit Health */}
        <HabitHealthCard data={docs.habitHealth} />

        {/* Feature Adoption */}
        {featureAdoption && (
          <SectionCard title="Feature Adoption">
            <StatRow label="Avg Habits per User" value={featureAdoption.avgHabitsPerUser?.toFixed(1) ?? "--"} />
            {adoptionBarData.length > 0 && (
              <div className="mt-vara-sm">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={adoptionBarData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={v => `${v.toFixed(1)}%`} />
                    <Bar dataKey="pct" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        )}

        {/* Subscriptions */}
        {subscriptionMetrics && (
          <SectionCard title="Subscriptions">
            <StatRow label="Conversion Rate" value={fmtPct(subscriptionMetrics.conversionRate)} />
            <StatRow label="Active Trials" value={subscriptionMetrics.activeTrials?.toLocaleString() ?? "--"} />
            <StatRow label="Paid Users" value={subscriptionMetrics.paidUsers?.toLocaleString() ?? "--"} />
            <StatRow label="Churn Rate" value={fmtPct(subscriptionMetrics.churnRate)} />
            {subPieData.length > 0 && (
              <div className="mt-vara-sm">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={subPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {subPieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        )}

        {/* Community Vitals */}
        {communityVitals && (
          <SectionCard title="Community Vitals">
            <StatRow label="Active Groups" value={communityVitals.activeGroups?.toLocaleString() ?? "--"} />
            <StatRow label="Avg Posts per Group" value={communityVitals.avgPostsPerGroup?.toFixed(1) ?? "--"} />
            <StatRow label="Connection Accept Rate" value={fmtPct(communityVitals.connectionAcceptRate)} />
            <StatRow label="Challenge Participation" value={communityVitals.challengeParticipation?.toLocaleString() ?? "--"} />
          </SectionCard>
        )}

        {/* Journal & Reflection */}
        <JournalMetricsCard data={docs.journalMetrics} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx react-scripts build 2>&1 | tail -5`
Expected: "The build folder is ready to be deployed."

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin/AnalyticsTab.jsx
git commit -m "feat(admin): rewrite AnalyticsTab with 7 sections — funnel, heatmap, wellness, habits, adoption, subscriptions, community, journal"
```

---

## Task 10: Final Build Verification & Integration Commit

- [ ] **Step 1: Full build check**

Run: `npx react-scripts build 2>&1 | tail -10`
Expected: "The build folder is ready to be deployed." with no warnings about missing imports.

- [ ] **Step 2: Verify all new files exist**

Run: `ls -la src/components/admin/`
Expected: 6 files — `OverviewCard.jsx`, `LifecycleFunnel.jsx`, `EngagementHeatmap.jsx`, `WellnessSignalCard.jsx`, `HabitHealthCard.jsx`, `JournalMetricsCard.jsx`

- [ ] **Step 3: Verify no lint errors**

Run: `npx react-scripts build 2>&1 | grep -i "warning\|error" | head -20`
Expected: No errors. Warnings about unused variables are acceptable but should be minimal.
