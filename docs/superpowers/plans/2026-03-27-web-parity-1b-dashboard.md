# Web-Mobile Parity Phase 1B: Dashboard & Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web dashboard with a card-based layout matching mobile's information architecture, including all 11 dashboard cards.

**Architecture:** Replace `src/pages/Dashboard.jsx` and its `useDashboard` hook with a new card-stack layout. Each card is a self-contained component in `src/components/dashboard/`. The existing Firestore data layer is reused. New cards (Morning Check-In, Wellness Score, Week Insight, etc.) use the services built in Plan 1A.

**Tech Stack:** React 19, Tailwind CSS (Vara design tokens), Firestore, localStorage

**Spec:** `docs/superpowers/specs/2026-03-27-web-mobile-parity-phase1-design.md` (Section 1)

**Depends on:** Plan 1A (correlation engine, wellness score service, copy constants, navigation) must be completed first.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/dashboard/WelcomeBackCard.jsx` | Return-after-absence card with lapse education |
| `src/components/dashboard/MorningCheckInCard.jsx` | Energy + mood daily check-in |
| `src/components/dashboard/WeeklyHabitsCard.jsx` | 7-day habit grid (replaces HabitTrackerWeekly) |
| `src/components/dashboard/NextBestActionCard.jsx` | Intelligent single recommendation |
| `src/components/dashboard/QuickActionsRow.jsx` | Journal + Focus shortcut buttons |
| `src/components/dashboard/FourThreeTwoOneCard.jsx` | 4-3-2-1 daily practice |
| `src/components/dashboard/WeekInsightCard.jsx` | Correlation-driven insight teaser |
| `src/components/dashboard/BrainHealthEducationCard.jsx` | Daily rotating brain fact + tip |
| `src/components/dashboard/AIDailyPlanCard.jsx` | AI-generated daily plan |
| `src/components/dashboard/WellnessScoreCard.jsx` | Circular gauge with pillar breakdown |
| `src/components/dashboard/WellnessScoreBreakdown.jsx` | Modal showing pillar details |
| `src/components/dashboard/BrainHealthInsightStrip.jsx` | Single-line rotating insight |
| `src/hooks/useDashboardV2.js` | New dashboard data hook (replaces useDashboard) |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Dashboard.jsx` | Full rewrite to render new card stack |

### Preserved Files (no changes)

| File | Reason |
|------|--------|
| `src/components/dashboard/HabitEditModal.jsx` | Still used for editing habits from dashboard |
| `src/components/dashboard/HabitCreateModal.jsx` | Still used for creating habits |
| `src/components/dashboard/GoalEditModal.jsx` | Still used for editing goals |
| `src/components/dashboard/GoalCreateModal.jsx` | Still used for creating goals |
| `src/components/dashboard/GoalProgressModal.jsx` | Still used for progress updates |

---

## Task 1: Create WelcomeBackCard

**Files:**
- Create: `src/components/dashboard/WelcomeBackCard.jsx`

- [ ] **Step 1: Read the mobile WelcomeBackCard for reference**

Read `mobile/src/components/dashboard/WelcomeBackCard.tsx` to understand the exact logic: 48hr threshold, copy pool, auto-dismiss timer, "Why habits can be hard" expandable section.

- [ ] **Step 2: Create the web component**

Create `src/components/dashboard/WelcomeBackCard.jsx`:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Info, X, ChevronRight } from 'lucide-react';
import { getLapseMessage } from '../../constants/lapseEducation';

const HEADINGS = ['Good to see you.', 'Welcome back.', "You're here."];
const BODIES = ['Nothing to catch up on. Just today.', 'Pick up wherever feels right.', "Whenever you're ready."];

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

export default function WelcomeBackCard({ onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  // Random heading/body selected once on mount
  const headingRef = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]);
  const bodyRef = useRef(BODIES[Math.floor(Math.random() * BODIES.length)]);

  // Lapse counter for rotating education messages
  const lapseCount = parseInt(localStorage.getItem('vara_lapse_count') || '0', 10);
  const lapseMessage = getLapseMessage(lapseCount);

  useEffect(() => {
    // Increment lapse count for next time
    localStorage.setItem('vara_lapse_count', String(lapseCount + 1));

    // Auto-dismiss after 6 seconds (unless expanded)
    timerRef.current = setTimeout(() => {
      if (!expanded) handleDismiss();
    }, 6000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Cancel auto-dismiss when expanded
  useEffect(() => {
    if (expanded && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [expanded]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div
      className="bg-white rounded-vara-lg p-6 shadow-vara-md border border-divider cursor-pointer transition-all duration-300"
      onClick={!expanded ? handleDismiss : undefined}
    >
      <h3 className="text-lg font-semibold text-evergreen-teal mb-1">{headingRef.current}</h3>
      <p className="text-sm text-muted-sage-gray">{bodyRef.current}</p>

      {!expanded && (
        <button
          className="flex items-center gap-1 mt-3 text-sm font-semibold text-evergreen-teal hover:underline"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
        >
          Why habits can be hard <ChevronRight size={14} />
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-light">
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-muted-sage-gray" />
            <span className="text-xs font-semibold text-muted-sage-gray">Why habits can be hard</span>
          </div>
          <p className="text-sm text-soft-charcoal leading-relaxed">{lapseMessage}</p>
          <button
            className="mt-2 self-end text-xs text-muted-sage-gray hover:text-soft-charcoal"
            onClick={(e) => { e.stopPropagation(); setExpanded(false); handleDismiss(); }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
```

**Visibility logic:** The parent (Dashboard) checks `localStorage` for `vara_last_app_open_date`. If more than 48 hours ago, show this card. Update the timestamp on mount.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WelcomeBackCard.jsx
git commit -m "feat(web): add WelcomeBackCard with lapse education"
```

---

## Task 2: Create MorningCheckInCard

**Files:**
- Create: `src/components/dashboard/MorningCheckInCard.jsx`

- [ ] **Step 1: Read the mobile MorningCheckIn for reference**

Read `mobile/src/components/dashboard/MorningCheckIn.tsx`.

- [ ] **Step 2: Create the web component**

Two-step inline form:
1. Energy level (1-5): Exhausted / Tired / Okay / Good / Energized
2. Mood (1-5): Rough / Low / Okay / Good / Great

After both selected, auto-saves via `saveMorningCheckIn()` from `src/services/wellnessScore.service.js` (created in Plan 1A).

Shows completed state once saved: "Morning check-in: {energy label} energy, {mood emoji} mood"

Use Tailwind styling matching Vara design tokens. Energy uses battery-style icons, mood uses emoji text.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/MorningCheckInCard.jsx
git commit -m "feat(web): add MorningCheckInCard component"
```

---

## Task 3: Create WeeklyHabitsCard

**Files:**
- Create: `src/components/dashboard/WeeklyHabitsCard.jsx`

- [ ] **Step 1: Read the existing HabitTrackerWeekly for patterns**

Read `src/components/dashboard/HabitTrackerWeekly.jsx` to understand the current web grid approach. The new component adapts this to match mobile's simpler design.

- [ ] **Step 2: Create the new component**

7-day grid showing up to 5 habits with completion dots. Click dot to toggle completion. Shows habit name on left, 7 date columns. Today highlighted with teal background. Completed = filled teal circle, incomplete = empty circle.

Data comes from parent via props: `habits`, `completions`, `onToggle(habitId, date)`.

No streak counter (mobile doesn't show streaks on dashboard). Link to "/habits" for full view.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WeeklyHabitsCard.jsx
git commit -m "feat(web): add WeeklyHabitsCard matching mobile design"
```

---

## Task 4: Create Remaining Dashboard Cards

**Files:**
- Create: `src/components/dashboard/NextBestActionCard.jsx`
- Create: `src/components/dashboard/QuickActionsRow.jsx`
- Create: `src/components/dashboard/FourThreeTwoOneCard.jsx`
- Create: `src/components/dashboard/WeekInsightCard.jsx`
- Create: `src/components/dashboard/BrainHealthEducationCard.jsx`
- Create: `src/components/dashboard/AIDailyPlanCard.jsx`
- Create: `src/components/dashboard/BrainHealthInsightStrip.jsx`

- [ ] **Step 1: Read mobile equivalents for each card**

Read these mobile files for reference:
- `mobile/src/components/dashboard/NextBestActionCard.tsx`
- `mobile/src/components/dashboard/BrainHealthEducationCard.tsx`
- `mobile/src/components/dashboard/BrainHealthInsightStrip.tsx`

- [ ] **Step 2: Create NextBestActionCard**

Single intelligent recommendation card. Shows icon + headline + subtitle + reason + CTA button. Selection logic mirrors mobile's `nextAction.service.ts` (checks wellness score pillars, time of day, incomplete habits, journal recency).

- [ ] **Step 3: Create QuickActionsRow**

Two buttons: "Journal" (navigates to /journal) and "Focus" (navigates to /focus). Use `useNavigate()` from react-router-dom. Styled as Vara teal outline buttons.

- [ ] **Step 4: Create FourThreeTwoOneCard**

Expandable card for 4-3-2-1 daily practice tracking. Reads/writes `fourThreeTwoOne/{userId}_{date}` in Firestore. Contains 4 text inputs: 4 moments of joy, 3 ways fueled mind/body, 2 intentions, 1 thing to let go. Collapsed shows completion status, expanded shows the form.

- [ ] **Step 5: Create WeekInsightCard**

Port from mobile's `WeekInsightCard.tsx`. Uses `selectWeekInsight()` from Plan 1A's constants. Shows headline, supporting text, and "See your full week story" link to /insights. Teal left accent bar. Dismiss button.

- [ ] **Step 6: Create BrainHealthEducationCard**

Daily rotating fact + tip from `EDUCATION_CARD_ITEMS` in `brainInsightsCopy.js` (Plan 1A). Day-of-year rotation. Shows pillar label, title, fact, tip, and "Learn more" link.

- [ ] **Step 7: Create AIDailyPlanCard**

Generate/view daily plan. "Generate Plan" button calls `/api/generate-daily-plan`. Shows loading state during generation. Displays plan text in a styled card. Expandable/collapsible.

- [ ] **Step 8: Create BrainHealthInsightStrip**

Single-line rotating insight from `INSIGHT_STRIP_MESSAGES` (Plan 1A). Leaf icon + message text. Light sage background.

- [ ] **Step 9: Commit all cards**

```bash
git add src/components/dashboard/NextBestActionCard.jsx src/components/dashboard/QuickActionsRow.jsx src/components/dashboard/FourThreeTwoOneCard.jsx src/components/dashboard/WeekInsightCard.jsx src/components/dashboard/BrainHealthEducationCard.jsx src/components/dashboard/AIDailyPlanCard.jsx src/components/dashboard/BrainHealthInsightStrip.jsx
git commit -m "feat(web): add remaining dashboard cards matching mobile"
```

---

## Task 5: Create WellnessScoreCard and Breakdown Modal

**Files:**
- Create: `src/components/dashboard/WellnessScoreCard.jsx`
- Create: `src/components/dashboard/WellnessScoreBreakdown.jsx`

- [ ] **Step 1: Read mobile wellness score components**

Read `mobile/src/components/dashboard/WellnessScoreCard.tsx` and `mobile/src/components/dashboard/WellnessScoreBreakdown.tsx`.

- [ ] **Step 2: Create WellnessScoreCard**

SVG circular gauge (0-100). Color-coded: red (<40), amber (40-69), teal (70+). Shows score number in center, trend arrow (up/down/stable). Refresh button. Click opens breakdown modal.

Opt-in flow: If user hasn't enabled wellness score, show an opt-in prompt card instead ("Track your wellness score?") with enable button.

Uses `getWellnessScore()` and `calculateWellnessScore()` from `wellnessScore.service.js` (Plan 1A).

- [ ] **Step 3: Create WellnessScoreBreakdown**

Modal overlay (centered on web, not bottom sheet). Shows:
- Overall score with color
- 4 pillar bars: Foundation (40%), Consistency (30%), Mind (20%), Growth (10%)
- Each pillar shows individual score and contributing components
- "Incomplete Actions" section listing missing data sources
- Close button

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/WellnessScoreCard.jsx src/components/dashboard/WellnessScoreBreakdown.jsx
git commit -m "feat(web): add WellnessScoreCard with pillar breakdown modal"
```

---

## Task 6: Create Dashboard Data Hook

**Files:**
- Create: `src/hooks/useDashboardV2.js`

- [ ] **Step 1: Read the existing useDashboard.js and mobile useDashboard.ts**

Read `src/hooks/useDashboard.js` (current web) and `mobile/src/hooks/useDashboard.ts` (mobile source of truth) to understand what data each card needs.

- [ ] **Step 2: Create useDashboardV2**

New hook that aggregates data for all 11 dashboard cards. Returns:

```javascript
{
  // User
  user, userName, greeting, formattedDate, today,

  // Loading
  dataLoading, refreshing,

  // Welcome Back
  showWelcomeBack, setShowWelcomeBack,

  // Morning Check-In
  morningCheckIn, morningCheckInLoading, showMorningCheckIn,
  handleMorningCheckInComplete,

  // Habits
  habits, weeklyCompletions, handleHabitToggle,

  // Goals (for quick view)
  goals,

  // Tasks (for quick view)
  tasks,

  // Daily Plan
  dailyPlan, generatingPlan, handleGenerateDailyPlan,
  isPlanExpanded, setIsPlanExpanded,

  // Wellness Score
  wellnessScore, wellnessScoreLoading, wellnessScoreEnabled,
  showScoreBreakdown, setShowScoreBreakdown,
  handleRefreshWellnessScore, handleWellnessScoreEnable,

  // 4-3-2-1
  fourThreeTwoOneEntry, handleFourThreeTwoOneChange,

  // Visible days (for weekly habits grid)
  visibleDays,
}
```

Uses:
- `useAuth()` for user
- `useWeeklyCorrelations()` from Plan 1A for week insight data
- `getWellnessScore()` / `calculateWellnessScore()` from Plan 1A
- `getMorningCheckIn()` / `saveMorningCheckIn()` from Plan 1A
- Firestore queries for habits, goals, tasks (same patterns as existing useDashboard)

Welcome-back logic: Check `vara_last_app_open_date` in localStorage. If > 48 hours, set `showWelcomeBack = true`. Update timestamp on mount.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDashboardV2.js
git commit -m "feat(web): add useDashboardV2 hook for new dashboard"
```

---

## Task 7: Rewrite Dashboard Page

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Read the current Dashboard.jsx**

Read `src/pages/Dashboard.jsx` in full.

- [ ] **Step 2: Rewrite with new card layout**

Replace the entire Dashboard page content. Keep the SidebarLayout wrapper and ErrorBoundary pattern.

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useDashboardV2 } from '../hooks/useDashboardV2';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';

// Cards
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import MorningCheckInCard from '../components/dashboard/MorningCheckInCard';
import WeeklyHabitsCard from '../components/dashboard/WeeklyHabitsCard';
import NextBestActionCard from '../components/dashboard/NextBestActionCard';
import QuickActionsRow from '../components/dashboard/QuickActionsRow';
import FourThreeTwoOneCard from '../components/dashboard/FourThreeTwoOneCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import BrainHealthEducationCard from '../components/dashboard/BrainHealthEducationCard';
import AIDailyPlanCard from '../components/dashboard/AIDailyPlanCard';
import WellnessScoreCard from '../components/dashboard/WellnessScoreCard';
import WellnessScoreBreakdown from '../components/dashboard/WellnessScoreBreakdown';
import BrainHealthInsightStrip from '../components/dashboard/BrainHealthInsightStrip';
```

Layout structure:
```jsx
<SidebarLayout>
  <div className="max-w-4xl mx-auto px-vara-base py-vara-lg">
    {/* Header */}
    <h1>{greeting}, {userName}</h1>
    <p>{formattedDate}</p>

    {/* Cards in 2-column responsive grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base mt-vara-lg">
      {/* Full-width cards span both columns */}
      {showWelcomeBack && <div className="lg:col-span-2"><WelcomeBackCard /></div>}
      {showMorningCheckIn && <div className="lg:col-span-2"><MorningCheckInCard /></div>}
      <div className="lg:col-span-2"><WeeklyHabitsCard /></div>

      {/* Single-column cards */}
      <NextBestActionCard />
      <QuickActionsRow />

      {/* Full-width cards */}
      <div className="lg:col-span-2"><FourThreeTwoOneCard /></div>
      {weekInsight && <div className="lg:col-span-2"><WeekInsightCard /></div>}
      <div className="lg:col-span-2"><BrainHealthEducationCard /></div>
      <div className="lg:col-span-2"><AIDailyPlanCard /></div>

      {/* Single-column cards */}
      <WellnessScoreCard />

      {/* Full-width */}
      <div className="lg:col-span-2"><BrainHealthInsightStrip /></div>
    </div>
  </div>

  {/* Modals */}
  {showScoreBreakdown && <WellnessScoreBreakdown />}
</SidebarLayout>
```

Pass all data from `useDashboardV2` and `useWeeklyCorrelations` to the appropriate cards via props.

- [ ] **Step 3: Verify dashboard renders**

Run: `npm start` and navigate to `/dashboard`. All cards should render (some may show empty/loading states if data doesn't exist yet). No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(web): rewrite dashboard with mobile-matching card layout"
```

---

## Task 8: Verify Dashboard Build

- [ ] **Step 1: Test dashboard with existing data**

Navigate to `/dashboard` in the browser. Verify:
- Greeting shows correctly
- Weekly habits grid renders (if user has habits)
- AI Daily Plan generates when clicked
- Wellness Score shows opt-in if not enabled
- Morning Check-In appears if not completed today
- Week Insight card appears if 5+ days of data exist

- [ ] **Step 2: Test responsive behavior**

Resize browser:
- At 1280px+: 2-column grid
- Below 1024px: single column
- Full-width cards span both columns at all sizes

- [ ] **Step 3: Scan for em dashes**

```bash
grep -r '—' src/components/dashboard/WelcomeBackCard.jsx src/components/dashboard/MorningCheckInCard.jsx src/components/dashboard/WeeklyHabitsCard.jsx src/components/dashboard/NextBestActionCard.jsx src/components/dashboard/QuickActionsRow.jsx src/components/dashboard/FourThreeTwoOneCard.jsx src/components/dashboard/WeekInsightCard.jsx src/components/dashboard/BrainHealthEducationCard.jsx src/components/dashboard/AIDailyPlanCard.jsx src/components/dashboard/WellnessScoreCard.jsx src/components/dashboard/BrainHealthInsightStrip.jsx
```
Expected: No matches.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(web): verify dashboard build and responsive layout"
```

---

## Execution Summary

| Task | What It Delivers | Files |
|------|-----------------|-------|
| 1 | Welcome Back card with lapse education | 1 new component |
| 2 | Morning Check-In card | 1 new component |
| 3 | Weekly Habits grid card | 1 new component |
| 4 | 7 remaining dashboard cards | 7 new components |
| 5 | Wellness Score card + breakdown modal | 2 new components |
| 6 | Dashboard data hook | 1 new hook |
| 7 | Dashboard page rewrite | 1 modified page |
| 8 | Verification | Build + responsive check |
