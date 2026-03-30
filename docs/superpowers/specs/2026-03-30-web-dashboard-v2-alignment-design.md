# Phase 1: Web Dashboard V2 Alignment — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Parent:** Web-Mobile Parity Roadmap

## Problem

The web dashboard runs a V1 layout (Morning Check-in, Quick Actions, 4-3-2-1, AI Daily Plan, Wellness Score) that doesn't match the mobile app's V2 dashboard (Brain State Check-in, Protocol Card, Daily Reflection, Habit Tracker, Week Insight). Users switching between platforms see different experiences with different daily workflows.

## Solution

Replace the web dashboard with the mobile V2 layout. Remove web-only pages that have no mobile equivalent. Keep Admin untouched.

## Dashboard V2 Card Layout

Cards appear in this order, matching mobile's `DashboardScreen.tsx` V2 layout:

1. **Brain State Check-in** — "How's your brain feeling?" with 5 selectable states:
   - Wired (softCoral) — "Racing thoughts, can't settle"
   - Foggy (sunriseAmber) — "Low energy, hard to focus"
   - Okay (mutedSageGray) — "Nothing great, nothing bad"
   - Clear (evergreenTeal) — "Calm, present, ready"
   - Energized (success) — "Focused and sharp"
   - After selection: collapses to summary row showing selected state + "Change" button
   - Below collapsed row: 7-day trend dots (rolling last 7 days), summary text, "See your week" link to `/insights`
   - Trend section only shows with 2+ days of data
   - Summary logic: dominant state (3+) → trending clearer/foggier → mixed week fallback

2. **Today's Protocol Card** — Only renders after brain state is selected:
   - Shows recommended protocol for the selected brain state
   - Protocol mapping from `brainStateProtocols` constants (ported from mobile)
   - Completion tracking (mark protocol done for today)
   - Stored in the `brainStateCheckIns` document's `protocolCompleted` field

3. **Daily Reflection Card** — Only renders when all active habits are completed for the day:
   - Three options: Smooth / Okay / Hard
   - Single tap saves reflection
   - Confirmation state after selection
   - Stored in `dailyReflections` collection

4. **Weekly Habits Tracker** — Always visible:
   - Shows all active habits with 7-day completion grid (Mon-Sun of current week)
   - Inline toggle to mark habits complete/incomplete for today
   - Uses existing `habits` and `habitCompletions` collections

5. **Week Insight Card** — Conditional on correlation data:
   - Shows headline and supporting text from weekly correlation analysis
   - "See your full week story" link navigates to `/insights`
   - Dismissible via close button
   - Uses existing `useWeeklyCorrelations` and `weekInsightTemplates`

Everything else currently on the dashboard is removed.

## Data & Services

### New Services

**`src/services/db/brainStateCheckIn.service.js`**
- `getTodayCheckIn(userId)` — fetch today's brain state check-in
- `saveCheckIn(userId, brainState)` — save/update today's check-in with protocol mapping
- `markProtocolCompleted(userId)` — mark today's protocol as done
- `getHistory(userId, days)` — fetch last N days of check-ins
- Document ID pattern: `${userId}_${YYYY-MM-DD}`
- Collection: `brainStateCheckIns`

**`src/services/db/dailyReflection.service.js`**
- `getTodayReflection(userId)` — fetch today's reflection
- `saveReflection(userId, difficulty)` — save today's reflection (smooth/okay/hard)
- Document ID pattern: `${userId}_${YYYY-MM-DD}`
- Collection: `dailyReflections`

### New Constants

**`src/constants/brainStateProtocols.js`**
- Ported from mobile's `mobile/src/constants/brainStateProtocols.ts`
- Maps each brain state to a protocol object: `{ id, title, description, type, duration }`

### New Hooks

**`src/hooks/useBrainStateWeekTrend.js`**
- Same logic as mobile's `useBrainStateWeekTrend.ts`
- Rolling 7-day window (today and 6 days prior)
- Returns `{ days, summary, loading }`
- Summary rules: dominant state → trending clearer/foggier → mixed week fallback

**`src/hooks/useDashboardV2.js`**
- Replaces existing dashboard hook for V2 layout
- Orchestrates: brain state check-in, habits + completions, daily reflection trigger, week insight
- Daily reflection trigger: appears when all active habits have been completed today

### Existing Code to Reuse

- `habits.service.js` — habit CRUD and completions (already exists)
- `useWeeklyCorrelations.js` — correlation computation (already exists)
- `weekInsightTemplates` — insight selection logic (already exists)

### Code to Remove from Dashboard

- Morning check-in state and service calls
- 4-3-2-1 gratitude service calls
- AI daily plan generation call
- Wellness score calculation and display
- Brain health education card data

## Components

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| BrainStateCheckin | `src/components/dashboard/BrainStateCheckin.jsx` | 5-state picker, collapsed state with trend, "See your week" link |
| TodaysProtocolCard | `src/components/dashboard/TodaysProtocolCard.jsx` | Protocol recommendation + completion tracking |
| DailyReflectionCard | `src/components/dashboard/DailyReflectionCard.jsx` | Smooth/okay/hard selector after all habits done |
| WeeklyHabitsTracker | `src/components/dashboard/WeeklyHabitsTracker.jsx` | 7-day habit grid with inline toggles |

### Existing Components to Keep

- `WeekInsightCard.jsx` — stays in the new layout, no changes needed

### Components to Remove from Dashboard

- `WelcomeBackCard.jsx`
- `MorningCheckInCard.jsx`
- `NextBestActionCard.jsx`
- `QuickActionsRow.jsx`
- `FourThreeTwoOneCard.jsx`
- `AIDailyPlanCard.jsx`
- `WellnessScoreCard.jsx`
- `WellnessScoreBreakdown.jsx`
- `BrainHealthEducationCard.jsx`
- `BrainHealthInsightStrip.jsx`

### Styling

All components use Tailwind CSS following the existing web design system (Vara brand tokens). Visual layout mirrors mobile but uses web-appropriate patterns:
- CSS flexbox/grid for dot rows and habit grids
- Hover states on interactive elements
- Responsive widths (max-width container, not full-bleed)

## Pages to Remove

These routes, page components, sidebar links, and sub-components are removed:

| Route | Page | Reason |
|-------|------|--------|
| `/brain-health` | `BrainHealth.jsx` | No mobile equivalent; brain state check-in moves to dashboard |
| `/mental-resilience` | `MentalResilience.jsx` | No mobile equivalent |
| `/fuel-recovery` | `FuelRecovery.jsx` | No mobile equivalent; library covers content |
| `/sleep` | `SleepRecovery.jsx` | No mobile equivalent as standalone page; sleep stays in library |
| `/reflections` | `Reflections.jsx` | No mobile equivalent; journal covers this |

Sidebar navigation entries for these pages are also removed.

## Pages Unchanged

- All auth routes
- `/goals-habits` (Phase 2)
- `/library/*`, `/community`, `/group/*`, `/profile/*`, `/notifications`, `/journal`, `/ai`, `/daily`
- `/admin` — web-only, untouched

## Firestore Index

The `brainStateCheckIns` composite index (`userId` ASC + `date` DESC) was already deployed as part of the mobile brain state week trend feature. No additional indexes needed.

## Out of Scope

- Habit model changes (Phase 2)
- Routines system (Phase 3)
- Onboarding changes (Phase 4)
- Settings/notification parity (Phase 5)
- AI chat changes (Phase 6)
- Community enhancements (Phase 7)
- Library/Insights polish (Phase 8)
- Mobile app changes
- Admin dashboard changes
