# Admin Analytics Expansion — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Approach:** Hybrid client-side aggregation with daily snapshots

---

## Goal

Expand the admin dashboard's Overview and Analytics tabs with meaningful widgets that surface engagement health, wellness signal, and growth/conversion metrics. Build for scale (thousands of users) while being useful with the current beta user base (~15 users).

---

## Overview Tab — 8 Cards with Trend Indicators

The Overview tab is the "glance and know" view. 8 cards in a 2x4 grid (2 columns desktop, stacks on mobile). Each card shows a **big number**, a **trend arrow with percentage change vs 7-day rolling average**, and a **one-line subtitle** with context.

### Row 1 — User Health

| Card | Value Source | Subtitle | Trend |
|---|---|---|---|
| **Total Users** | `getCountFromServer(users)` | "+X new this week" | vs 7-day rolling avg |
| **Daily Active Users** | `users` where `lastActiveAt >= 24h ago` | "X of Y total" | vs 7-day rolling avg |

### Row 2 — Engagement

| Card | Value Source | Subtitle | Trend |
|---|---|---|---|
| **Habit Completion Rate** | Today's `habitCompletions` / active habits due today | "X of Y habits completed" | vs 7-day rolling avg |
| **Brain State Check-in Rate** | Today's `brainStateCheckIns` / DAU | "X of Y users checked in" | vs 7-day rolling avg |

### Row 3 — Growth

| Card | Value Source | Subtitle | Trend |
|---|---|---|---|
| **Onboarding Completion** | `users` where `hasCompletedOnboarding == true` / total | "X completed, Y pending" | vs 7-day rolling avg |
| **7-Day Retention** | Users created 7+ days ago AND active in last 7 days / users created 7+ days ago | "X of Y retained" | vs 7-day rolling avg |

### Row 4 — Monetization & Safety

| Card | Value Source | Subtitle | Trend |
|---|---|---|---|
| **Trial Conversion** | Premium users / (premium + expired + trial) | "X active trials" | vs 7-day rolling avg |
| **Moderation Queue** | `moderationQueue` where `status == "pending"` | "X urgent" (red if > 0) | No trend (point-in-time) |

### Trend Arrow Behavior

- Computed by reading last 7 `daily-YYYY-MM-DD` snapshots, averaging the value, comparing today's value to that average.
- Green up arrow if current > avg by 5%+, red down arrow if current < avg by 5%+, gray flat dash otherwise.
- If fewer than 2 snapshots exist, trend arrows do not render — just the current value.

---

## Analytics Tab — 7 Sections

Two-column grid. Sections marked "full-width" span both columns.

### 1. User Lifecycle Funnel (full-width)

Horizontal funnel visualization showing user drop-off at each stage:

```
Signup → Onboarding Complete → First Habit Created → 7-Day Active → 30-Day Retained
```

- Each step shows the **count** and **conversion rate from previous step**.
- Color coding: green (>70% conversion), amber (40-70%), red (<40%).
- Data source: `users` collection with targeted count queries per stage.

**Funnel stage definitions:**
- **Signup**: All docs in `users` collection
- **Onboarding Complete**: `hasCompletedOnboarding == true`
- **First Habit Created**: Users who have at least 1 doc in `habits`
- **7-Day Active**: Created 7+ days ago AND `lastActiveAt >= 7 days ago`
- **30-Day Retained**: Created 30+ days ago AND `lastActiveAt >= 30 days ago`

### 2. Engagement Heatmap (full-width)

A 7x3 grid showing activity intensity by day-of-week and time-of-day:

| | Morning (6a-12p) | Afternoon (12p-6p) | Evening (6p-12a) |
|---|---|---|---|
| Mon | cell | cell | cell |
| Tue | cell | cell | cell |
| Wed | cell | cell | cell |
| Thu | cell | cell | cell |
| Fri | cell | cell | cell |
| Sat | cell | cell | cell |
| Sun | cell | cell | cell |

- Intensity = count of actions in that time slot over the last 7 days.
- Actions counted: `habitCompletions.createdAt`, `brainStateCheckIns.createdAt`, `journalEntries.createdAt`, `focusSessions.startedAt`.
- Color scale: white (0) → light teal → dark teal (max).
- Tooltip on hover shows exact count.

### 3. Wellness Signal (half-width)

**Brain State Distribution** — Donut chart (recharts `PieChart`) showing today's check-ins broken down by state (wired/foggy/okay/clear/energized). Each slice uses the state's brand color from `BRAIN_STATES` constant.

**Stat rows below the chart:**
- **Protocol Completion Rate**: % of today's check-ins where `protocolCompleted == true`
- **Avg Brain Readiness Score**: Mean `readinessScore` from `brainMetrics` for the last 7 days

Data sources: `brainStateCheckIns` (today), `brainMetrics` (last 7 days).

### 4. Habit Health (half-width)

**Stat rows:**
- **Avg Completion Rate**: Total `habitCompletions` today / total active habits due today, across all users
- **Bounce-Back Rate**: Users whose `consecutiveMisses` was >0 and then completed / total users who missed (from `habits` collection)

**Streak Distribution** — Horizontal bar chart showing how many users have streaks in each bucket: 0, 1-3, 4-7, 8-14, 15-30, 30+. Data from `habits.streak` field.

**Top Categories** — Simple ranked list of the 5 most common `habits.category` values with counts.

### 5. Feature Adoption (half-width)

Enhanced version of the existing bar chart. Bars for each active feature, sorted by adoption rate descending:

- Habits, Goals, Journal, Tasks, Focus Sessions, Community (posts), Brain Health (brainMetrics), Masterclass

Each bar = % of total users who have at least 1 doc in that feature's collection. Uses `getCountFromServer` with `where("userId", "==", uid)` per feature — but since that's per-user, instead query distinct `userId` values from each collection (capped at `limit(500)` for efficiency, counting unique userIds client-side).

### 6. Community Vitals (half-width)

**Stat rows:**
- **Active Groups**: Count of `groups` collection
- **Avg Posts per Group**: `posts` count / `groups` count
- **Connection Accept Rate**: `connections` where `status == "accepted"` / total `connections`
- **Challenge Participation**: Count of `challengeParticipants`
- **Content This Week**: `posts` where `createdAt >= 7 days ago`

### 7. Journal & Reflection (half-width)

**Mood Distribution** — Bar chart showing count of journal entries by mood value (great/good/okay/low/difficult) from the last 30 days. Uses `journalEntries` where `createdAt >= 30 days ago`, grouped by `mood` field.

**Stat rows:**
- **Journaling Rate**: Users with at least 1 `journalEntries` doc in the last 7 days / WAU
- **Reflection Completion Rate**: `dailyReflections` docs today / DAU

---

## Data Layer

### Daily Snapshot Strategy

Each aggregation run (triggered by "Refresh Analytics" button or auto on first load):

1. Computes all current metrics from live Firestore data.
2. Writes latest values to existing `adminAnalytics` docs (`rolling`, `subscriptionMetrics`, `featureAdoption`, `communityVitals`).
3. Writes to new analytics docs (`wellnessSignal`, `habitHealth`, `engagementHeatmap`, `lifecycleFunnel`, `journalMetrics`).
4. Saves a **daily snapshot** to `adminAnalytics/daily-YYYY-MM-DD` containing all Overview card values plus funnel counts. Overwrites if already exists for today.

### New `adminAnalytics` Documents

| Doc ID | Fields |
|---|---|
| `wellnessSignal` | `brainStateDistribution` (object: state → count), `protocolCompletionRate` (decimal), `avgReadinessScore` (number 0-100), `updatedAt` |
| `habitHealth` | `avgCompletionRate` (decimal), `bounceBackRate` (decimal), `streakDistribution` (object: bucket → count), `topCategories` (array of {name, count}), `updatedAt` |
| `engagementHeatmap` | `matrix` (object: `"Mon_morning"` → count, etc.), `periodDays` (7), `updatedAt` |
| `lifecycleFunnel` | `signup` (count), `onboardingComplete` (count), `firstHabit` (count), `active7d` (count), `retained30d` (count), `updatedAt` |
| `journalMetrics` | `moodDistribution` (object: mood → count), `journalingRate` (decimal), `reflectionCompletionRate` (decimal), `updatedAt` |
| `daily-YYYY-MM-DD` | `date`, `totalUsers`, `dau`, `habitCompletionRate`, `brainStateCheckinRate`, `onboardingCompletionRate`, `retention7d`, `conversionRate`, `funnelCounts` (object), `updatedAt` |

### Query Efficiency

All queries use time bounds to avoid full-collection scans:
- `getCountFromServer()` for counts (no doc downloads)
- `where("createdAt", ">=", sevenDaysAgo)` for recent activity
- `limit(500)` + client-side unique counting for feature adoption
- Engagement heatmap: only last 7 days of timestamps

### Firestore Security Rules

Already updated: `adminAnalytics` allows admin reads and writes (deployed).

---

## UI Components

### New Components

| Component | Location | Purpose |
|---|---|---|
| `OverviewCard` | `src/components/admin/OverviewCard.jsx` | Reusable card with value, trend arrow, subtitle |
| `LifecycleFunnel` | `src/components/admin/LifecycleFunnel.jsx` | Horizontal funnel visualization |
| `EngagementHeatmap` | `src/components/admin/EngagementHeatmap.jsx` | 7x3 day/time grid with color intensity |
| `WellnessSignalCard` | `src/components/admin/WellnessSignalCard.jsx` | Brain state donut + stat rows |
| `HabitHealthCard` | `src/components/admin/HabitHealthCard.jsx` | Completion rate, streaks bar chart, categories |
| `JournalMetricsCard` | `src/components/admin/JournalMetricsCard.jsx` | Mood bar chart + stat rows |

### Modified Components

| Component | Changes |
|---|---|
| `OverviewTab.jsx` | Replace 4 cards with 8 `OverviewCard` instances, add trend computation |
| `AnalyticsTab.jsx` | Add 3 new sections (funnel, heatmap, journal), enhance existing sections |

### Existing Components (Reused)

- `SectionCard` from `AnalyticsTab.jsx` — wraps each Analytics section
- `StatRow` from `AnalyticsTab.jsx` — individual stat lines
- recharts `PieChart`, `BarChart`, `ResponsiveContainer` — already installed

---

## Dependencies

- **recharts** — Already in `package.json`, used by current Analytics tab. No new libraries needed.
- **lucide-react** — Already used. Provides `TrendingUp`, `TrendingDown`, `Minus` icons for trend arrows.

---

## Out of Scope

- Individual user drilldowns / user-level analytics
- Real-time streaming / live updates
- Cloud Function deployment
- Changes to user-facing features
- Email/notification alerts on metric thresholds
- Data export / CSV download
