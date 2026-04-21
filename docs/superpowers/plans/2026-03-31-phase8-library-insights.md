# Phase 8: Library & Insights Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Discover hub page, enhance Insights with heatmap/sparklines/narrative, and add WeekInsightCard to the dashboard.

**Architecture:** Three independent features: (1) Discover hub — new page with category cards replacing 4 sidebar links with 1; (2) Insights enhancements — HabitHeatmap, SparklineTrendCard, NarrativeRecap components added to existing Insights page; (3) WeekInsightCard — new hook, constants, and component added to Dashboard. All features are independent and can be built in parallel.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react, SVG for charts

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Discover.jsx` | Create | Hub page with category cards |
| `src/components/insights/HabitHeatmap.jsx` | Create | 30-day completion heatmap |
| `src/components/insights/SparklineTrendCard.jsx` | Create | Metric + sparkline + trend |
| `src/components/insights/NarrativeRecap.jsx` | Create | AI weekly summary |
| `src/hooks/useWeeklyCorrelations.js` | Create | 7-day data aggregation hook |
| `src/constants/weekInsightTemplates.js` | Create | Insight selection logic |
| `src/components/dashboard/WeekInsightCard.jsx` | Create | Dashboard insight card |
| `src/pages/Insights.jsx` | Modify | Add heatmap, sparklines, narrative |
| `src/pages/Dashboard.jsx` | Modify | Add WeekInsightCard |
| `src/components/layout/SidebarLayout.jsx` | Modify | Replace 4 wellness links with 1 Discover |
| `src/App.js` | Modify | Add /discover route |

---

### Task 1: Discover Hub Page

**Files:**
- Create: `src/pages/Discover.jsx`

- [ ] **Step 1: Create the page**

```jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import { Wind, Moon, Activity, GraduationCap, Compass } from "lucide-react";

const CATEGORIES = [
  { id: "breathwork", label: "Breathwork", desc: "Guided breathing for calm and clarity", icon: Wind, color: "text-evergreen-teal bg-teal-50 border-teal-200", path: "/library/breathwork" },
  { id: "sleep", label: "Sleep", desc: "Tools for restful, restorative sleep", icon: Moon, color: "text-silver-sage bg-sage-50 border-sage-200", path: "/library/sleep" },
  { id: "movement", label: "Movement", desc: "Body-based practices for energy and focus", icon: Activity, color: "text-amber-600 bg-amber-50 border-amber-200", path: "/library/movement" },
  { id: "masterclass", label: "Masterclass", desc: "Deep dives into wellness science", icon: GraduationCap, color: "text-rose-600 bg-rose-50 border-rose-200", path: "/masterclass" },
];

export default function Discover() {
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">
        <div className="flex items-center gap-3 mb-2">
          <Compass size={28} className="text-evergreen-teal" />
          <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Discover</h1>
        </div>
        <p className="text-vara-sm text-muted-sage-gray mb-vara-lg">
          Science-backed tools for your brain & body
        </p>

        {/* Featured card */}
        <div className="bg-gradient-to-br from-evergreen-teal to-silver-sage rounded-vara-lg p-vara-lg mb-vara-lg text-white">
          <h2 className="text-lg font-semibold mb-2">Your Wellness Library</h2>
          <p className="text-sm opacity-90">
            Explore breathwork, sleep tools, movement practices, and expert-led masterclasses — all designed to support your daily rhythm.
          </p>
        </div>

        {/* Category grid */}
        <h3 className="text-vara-base font-semibold text-soft-charcoal mb-4">Browse by Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map(({ id, label, desc, icon: Icon, color, path }) => (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="text-left bg-white rounded-vara-lg border border-divider p-vara-lg hover:shadow-vara-md transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${color} border flex items-center justify-center mb-3`}>
                <Icon size={24} />
              </div>
              <h4 className="font-semibold text-soft-charcoal group-hover:text-evergreen-teal transition-colors">
                {label}
              </h4>
              <p className="text-sm text-muted-sage-gray mt-1">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Discover.jsx
git commit -m "feat(web): add Discover hub page with category cards"
```

---

### Task 2: Insight Visualization Components

**Files:**
- Create: `src/components/insights/HabitHeatmap.jsx`
- Create: `src/components/insights/SparklineTrendCard.jsx`
- Create: `src/components/insights/NarrativeRecap.jsx`

- [ ] **Step 1: Create HabitHeatmap**

```jsx
import React from "react";

const COLORS = ["#f3f4f6", "#d1e7dd", "#a3cfbb", "#1B5E57", "#0f3d38"];

function getColor(count) {
  if (count === 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count === 2) return COLORS[2];
  if (count === 3) return COLORS[3];
  return COLORS[4];
}

/**
 * 30-day habit completion heatmap.
 * Props:
 *   data — array of { date: string (YYYY-MM-DD), count: number }
 */
export default function HabitHeatmap({ data = [] }) {
  const dataMap = new Map(data.map((d) => [d.date, d.count]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: iso, count: dataMap.get(iso) || 0 });
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-soft-charcoal mb-3">Habit Heatmap</h4>
      <div className="grid grid-cols-6 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.count} completions`}
            className="w-full aspect-square rounded-sm"
            style={{ backgroundColor: getColor(day.count) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-sage-gray">
        <span>Less</span>
        {COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SparklineTrendCard**

```jsx
import React from "react";

function Sparkline({ points, width = 80, height = 24 }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="#1B5E57"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Metric card with sparkline and trend indicator.
 * Props:
 *   label   — metric name
 *   value   — current value number
 *   points  — array of 7 numbers for sparkline
 *   trend   — 'improving' | 'steady' | 'needs_attention'
 */
export default function SparklineTrendCard({ label, value, points = [], trend = "steady" }) {
  const trendConfig = {
    improving: { label: "Improving", color: "text-evergreen-teal" },
    steady: { label: "Steady", color: "text-muted-sage-gray" },
    needs_attention: { label: "Needs attention", color: "text-amber-600" },
  };
  const t = trendConfig[trend] || trendConfig.steady;

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-4">
      <p className="text-xs text-muted-sage-gray mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-soft-charcoal">{value}</span>
        <Sparkline points={points} />
      </div>
      <p className={`text-xs mt-2 font-medium ${t.color}`}>{t.label}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create NarrativeRecap**

```jsx
import React, { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

const CACHE_KEY = "vara_narrative_recap";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * AI narrative recap of the week/month.
 * Props:
 *   userId    — current user UID
 *   timeframe — 'week' | 'month'
 */
export default function NarrativeRecap({ userId, timeframe = "week" }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    // Check cache
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.userId === userId && cached.timeframe === timeframe && Date.now() - cached.timestamp < CACHE_TTL) {
        setNarrative(cached.text);
        setLoading(false);
        return;
      }
    } catch { /* ignore */ }

    // Fetch from API
    async function fetchNarrative() {
      try {
        const res = await fetch("/api/journal-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, timeframe }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.summary || data?.reply || null;
          setNarrative(text);
          if (text) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, timeframe, text, timestamp: Date.now() }));
          }
        }
      } catch { /* non-critical */ }
      setLoading(false);
    }
    fetchNarrative();
  }, [userId, timeframe]);

  if (loading) {
    return (
      <div className="bg-white rounded-vara-lg border border-divider p-vara-lg animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    );
  }

  if (!narrative) {
    return (
      <div className="bg-white rounded-vara-lg border border-divider p-vara-lg text-center">
        <BookOpen size={24} className="mx-auto mb-2 text-muted-sage-gray/40" />
        <p className="text-sm text-muted-sage-gray">
          Keep tracking your habits and journaling — your weekly narrative will appear here once there's enough data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg">
      <h4 className="text-sm font-semibold text-soft-charcoal flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-evergreen-teal" />
        Your {timeframe === "week" ? "Weekly" : "Monthly"} Recap
      </h4>
      <p className="text-sm text-soft-charcoal leading-relaxed">{narrative}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/insights/HabitHeatmap.jsx src/components/insights/SparklineTrendCard.jsx src/components/insights/NarrativeRecap.jsx
git commit -m "feat(web): add HabitHeatmap, SparklineTrendCard, NarrativeRecap"
```

---

### Task 3: WeekInsightCard (Hook + Constants + Component)

**Files:**
- Create: `src/hooks/useWeeklyCorrelations.js`
- Create: `src/constants/weekInsightTemplates.js`
- Create: `src/components/dashboard/WeekInsightCard.jsx`

- [ ] **Step 1: Create useWeeklyCorrelations hook**

```js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function getDayRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

export function useWeeklyCorrelations(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    async function load() {
      try {
        const dates = getDayRange(7);
        const startDate = dates[0];

        // Habit completions
        const hcSnap = await getDocs(
          query(collection(db, "habitCompletions"), where("userId", "==", userId), where("dateISO", ">=", startDate))
        );
        const completionsByDay = new Map();
        hcSnap.docs.forEach((d) => {
          const date = d.data().dateISO;
          completionsByDay.set(date, (completionsByDay.get(date) || 0) + 1);
        });

        // Journal entries
        const jeSnap = await getDocs(
          query(collection(db, "journalEntries"), where("userId", "==", userId))
        );
        const journalDays = new Set();
        jeSnap.docs.forEach((d) => {
          const ts = d.data().createdAt?.toDate?.();
          if (ts) {
            const iso = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
            if (dates.includes(iso)) journalDays.add(iso);
          }
        });

        // Focus sessions
        const fsSnap = await getDocs(
          query(collection(db, "focusSessions"), where("userId", "==", userId))
        );
        let focusMinutes = 0;
        fsSnap.docs.forEach((d) => {
          const ts = d.data().startedAt?.toDate?.();
          if (ts) {
            const iso = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
            if (dates.includes(iso) && d.data().completed) focusMinutes += (d.data().durationMinutes || 25);
          }
        });

        // Compute stats
        const completionCounts = dates.map((d) => completionsByDay.get(d) || 0);
        const totalCompletions = completionCounts.reduce((a, b) => a + b, 0);
        const bestDayIdx = completionCounts.indexOf(Math.max(...completionCounts));
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const bestDay = new Date(dates[bestDayIdx] + "T00:00:00");

        setData({
          totalCompletions,
          completionCounts,
          journalDays: journalDays.size,
          focusMinutes,
          bestDay: dayLabels[bestDay.getDay()],
          dates,
        });
      } catch (err) {
        console.error("Weekly correlations error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  return { data, loading };
}
```

- [ ] **Step 2: Create weekInsightTemplates**

```js
/**
 * Insight selection templates — priority-ordered.
 * Each template has a `check` function that returns { headline, detail } or null.
 */
export const WEEK_INSIGHT_TEMPLATES = [
  {
    id: "high_completions",
    check: (data) => {
      if (data.totalCompletions >= 14) {
        return {
          headline: "Strong week — you're building momentum",
          detail: `${data.totalCompletions} habit completions this week. Consistency is compounding.`,
        };
      }
      return null;
    },
  },
  {
    id: "journal_mood",
    check: (data) => {
      if (data.journalDays >= 3) {
        return {
          headline: "Journaling is paying off",
          detail: `You journaled ${data.journalDays} days this week. Written reflection strengthens self-awareness.`,
        };
      }
      return null;
    },
  },
  {
    id: "focus_sessions",
    check: (data) => {
      if (data.focusMinutes >= 50) {
        return {
          headline: "Deep work gains",
          detail: `${data.focusMinutes} minutes of focused time this week. Your attention muscle is growing.`,
        };
      }
      return null;
    },
  },
  {
    id: "best_day",
    check: (data) => {
      if (data.totalCompletions >= 5) {
        return {
          headline: `${data.bestDay} was your best day`,
          detail: "Look for patterns — what made that day click? Lean into it.",
        };
      }
      return null;
    },
  },
  {
    id: "getting_started",
    check: (data) => {
      if (data.totalCompletions > 0) {
        return {
          headline: "Every step counts",
          detail: `${data.totalCompletions} completions this week. You're showing up — that's what matters most.`,
        };
      }
      return null;
    },
  },
];

export function selectInsight(data) {
  if (!data) return null;
  for (const template of WEEK_INSIGHT_TEMPLATES) {
    const result = template.check(data);
    if (result) return { id: template.id, ...result };
  }
  return null;
}
```

- [ ] **Step 3: Create WeekInsightCard**

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWeeklyCorrelations } from "../../hooks/useWeeklyCorrelations";
import { selectInsight } from "../../constants/weekInsightTemplates";

const DISMISS_KEY = "vara_week_insight_dismissed";

export default function WeekInsightCard() {
  const { user } = useAuth();
  const { data, loading } = useWeeklyCorrelations(user?.uid);
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    // Auto-expire weekly
    const parsed = JSON.parse(stored);
    return Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000;
  });

  if (loading || dismissed) return null;

  const insight = selectInsight(data);
  if (!insight) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
    setDismissed(true);
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border-l-[3px] border-l-evergreen-teal border border-divider p-vara-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="text-evergreen-teal mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-soft-charcoal">{insight.headline}</p>
            <p className="text-sm text-muted-sage-gray mt-1">{insight.detail}</p>
            <button
              onClick={() => navigate("/insights")}
              className="text-xs text-evergreen-teal hover:underline mt-2 inline-block"
            >
              See your full week story
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-sage-gray hover:text-soft-charcoal flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWeeklyCorrelations.js src/constants/weekInsightTemplates.js src/components/dashboard/WeekInsightCard.jsx
git commit -m "feat(web): add WeekInsightCard with correlations hook and templates"
```

---

### Task 4: Wire into Dashboard, Insights, Sidebar, Routes

**Files:**
- Modify: `src/pages/Dashboard.jsx` — Add WeekInsightCard
- Modify: `src/components/layout/SidebarLayout.jsx` — Replace wellness links with single Discover
- Modify: `src/App.js` — Add /discover route

- [ ] **Step 1: Add WeekInsightCard to Dashboard**

In `src/pages/Dashboard.jsx`, import and render after the DailyReflectionCard:

```js
import WeekInsightCard from "../components/dashboard/WeekInsightCard";
```

Add in the card stack, before the WeeklyHabitsTracker:
```jsx
{/* 3.5 Week Insight */}
<WeekInsightCard />
```

- [ ] **Step 2: Update SidebarLayout**

Replace the Wellness section's 4 separate links (`/library`, `/library/breathwork`, `/library/sleep`, `/library/movement`, `/masterclass`) with a single Discover entry:

Find the wellness section items and replace with:
```js
{ path: "/discover", label: "Discover", icon: Compass },
```

Add `Compass` to the lucide-react import.

- [ ] **Step 3: Add /discover route to App.js**

Add import:
```js
import Discover from './pages/Discover';
```

Add route:
```jsx
<Route path="/discover" element={<ProtectedRoute><ErrorBoundary level="feature" featureName="Discover"><Discover /></ErrorBoundary></ProtectedRoute>} />
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx src/components/layout/SidebarLayout.jsx src/App.js
git commit -m "feat(web): wire Discover route, WeekInsightCard, update sidebar nav"
```

---

### Task 5: Build Verification

- [ ] **Step 1: Build**

```bash
npx react-scripts build 2>&1 | tail -15
```
