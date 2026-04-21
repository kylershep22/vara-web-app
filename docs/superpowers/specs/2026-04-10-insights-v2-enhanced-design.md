# Insights V2: Enhanced Wellness Insights

**Date:** 2026-04-10
**Status:** Draft
**Platform:** Mobile (React Native/Expo)

---

## Overview

Enhance the mobile Insights screen from a flat 3-widget layout to a progressive hierarchy that surfaces correlation insights, a composite wellness score with week-over-week comparison, and daily activity visualization. The goal is to make the data the correlation engine already computes visible and actionable to users.

### Design Principles

- **Comparisons over raw numbers** — users care about trajectory, not absolutes
- **Surface correlations** — show the top 1-2 most impactful connections between behaviors and outcomes
- **No streak counting** — excluded by design
- **Reuse existing components** — HeroSummaryCard, WeeklyBarChart are already built but unused

---

## Screen Layout (Top to Bottom)

### 1. Timeframe Toggle (existing, unchanged)

Week/month chip selector. Both views show the same widget set, just with different date ranges.

### 2. HeroSummaryCard (existing, adapted)

**Purpose:** Headline metric — composite wellness score with week-over-week delta.

**Props changes:**
- Title: "Brain Readiness" → "Wellness Score"
- `readinessScore` accepts composite wellness score (0-100)
- New `deltaPercentage` prop for week-over-week change (percentage points, e.g., +12 means score went from 60 to 72)
- `trend` derived from delta direction (positive → up, negative → down, within threshold → steady)
- `checkInsCount` stays for data confidence

**Subtitle formats:**
- With positive delta: "Up {X}% from last week · {N} check-ins"
- With negative delta: "Down {X}% from last week · {N} check-ins"
- Steady (delta within +/-2%): "Holding steady · {N} check-ins"
- Zero check-ins: "Your score appears after your first check-in" (existing)

**Month view:** Subtitle says "from last month" instead of "from last week."

### 3. NarrativeRecap (existing component, enriched payload)

**Purpose:** AI-generated weekly story weaving in best/worst day analysis and top correlations.

**No component changes.** The improvement is in the data sent to the `/weekly-narrative` backend endpoint:

Additional fields in the API payload:
- `bestDay: { day: string, factors: string[] }` — e.g., `{ day: "Wednesday", factors: ["good sleep", "high energy", "strong habits"] }`
- `hardestDay: { day: string, factors: string[] }`
- `topCorrelations: Array<{ factor: string, direction: string, impact: number }>` — top 1-2 significant correlations

The LLM prompt should instruct the model to weave best/worst day mentions and correlation insights into the narrative naturally, rather than listing them mechanically.

**Fallback narrative** (when API fails): Existing heuristic logic stays. Best/worst day and correlation data are not included in the fallback — they require the LLM to phrase naturally.

### 4. CorrelationInsightCard (new component)

**Purpose:** Surface the #1 (or top 2) most impactful behavioral correlation as a plain-English insight.

**File:** `mobile/src/components/insights/CorrelationInsightCard.tsx`

**Layout:**
- Card container: white background, 16px border radius, standard teal shadow (matches existing cards)
- Header row: lightbulb icon (`lightbulb-on-outline`) in dewSage circle + "Your top insight" title
- Body: 1-2 sentences of plain-English correlation insight

**Sentence templates** (frontend-generated, no API call):

| Correlation | Template |
|-------------|----------|
| Sleep → Habits | "When you sleep well, you complete {gap}% more habits" |
| Energy → Habits | "On high-energy days, you complete {gap}% more habits" |
| Journal → Mood | "Days you journal, your mood averages {gap} points higher" |
| Sleep → Focus | "Good sleep nights lead to {gap} more focus minutes" |

Where `{gap}` is `Math.round(Math.abs(highValue - lowValue))`.

**Rules:**
- Only renders when at least one correlation has `significant: true`
- If two correlations are significant, show both as bullet points
- If none are significant, the card is not rendered (no empty state)
- Hidden when `hasInsufficientData` is true

**Props:**
```typescript
interface CorrelationInsightCardProps {
  correlations: WeeklyCorrelations;
}
```

### 5. WeeklyBarChart (existing, activated)

**Purpose:** Visualize daily activity count across the period.

**Title:** "Daily activity" (change from "Weekly Activity" since it also works in month view)

**Data source:** New `dailyActivityCounts` array computed in InsightsScreen. Each element = number of (habits completed + journal entries + focus sessions completed) for that day.

**Week view:** 7 bars (Mon-Sun), peak day highlighted in teal.
**Month view:** The component currently expects exactly 7 values. For month view, we aggregate into weeks (4-5 bars) with labels like "W1", "W2", etc. This requires a minor component update to accept custom labels.

### 6. HabitHeatmap (existing, unchanged)

30-day rhythm view. No changes.

### 7. AtAGlanceCard (existing, unchanged)

Quick-reference summary: days active, protocols completed, reflections. No changes.

---

## Data Layer Changes

### correlationEngine.service.ts

**1. Export composite score computation:**

Expose the existing internal `compositeScore()` function. Add a new exported function:

```typescript
export function computePeriodScore(data: DailyDataPoint[]): number
```

Returns the average composite score (0-100) across all days that have at least one data point.

**2. Real week-over-week deltas:**

Add to the `WeeklyCorrelations` interface:

```typescript
weekOverWeek: {
  scoreChange: number;   // percentage point change in composite score
  habitChange: number;   // percentage point change in habit completion rate
}
```

Currently hardcoded to `{ scoreChange: 0, habitChange: 0 }`. Compute by comparing current period's composite score vs. prior period's.

**3. Daily activity counts:**

Add to the return type or compute in the screen:

```typescript
dailyActivityCounts: number[] // per-day count of completed activities
```

Each day's count = habits completed that day + (1 if journaled) + focus sessions completed that day.

### useWeeklyCorrelations.ts

**Fetch double the timeframe:**

- Week view: fetch 14 days of data, split into current 7 and prior 7
- Month view: fetch 60 days, split into current 30 and prior 30

Compute correlations on the current period. Compute composite scores for both periods. Return the delta.

**Add `compositeScore` and `dailyActivityCounts` to the return value:**

```typescript
export function useWeeklyCorrelations(): {
  correlations: WeeklyCorrelations | null;
  compositeScore: number;
  dailyActivityCounts: number[];
  loading: boolean;
}
```

### Backend: /weekly-narrative endpoint

Extend the request payload to include:

```json
{
  "correlationData": { ... },
  "bestDay": { "day": "Wednesday", "factors": ["good sleep", "high energy"] },
  "hardestDay": { "day": "Monday", "factors": ["poor sleep", "high stress"] },
  "topCorrelations": [
    { "factor": "sleep", "direction": "positive", "impact": 35 }
  ]
}
```

Update the system prompt to instruct the LLM to naturally reference best/worst days and correlations in the narrative.

---

## Empty & Insufficient Data States

| Condition | Behavior |
|-----------|----------|
| No data at all (no habits, no journals, no completions) | Show existing empty state (icon + "No insights yet") |
| Insufficient data (<3 completions AND <2 journal entries) | HeroSummaryCard shows "—" ring with "Your score appears after your first check-in". NarrativeRecap shows fallback text. CorrelationInsightCard hidden. WeeklyBarChart hidden. HabitHeatmap and AtAGlance still render. |
| Partial data (some days missing metrics) | Everything renders. Composite score computed from available data. Correlations only surface if significant. |

---

## What's NOT Changing

- **HabitHeatmap component** — no modifications
- **AtAGlanceCard component** — no modifications
- **NarrativeRecap component** — no code changes (only the data payload to the API changes)
- **Timeframe toggle** — same week/month behavior
- **Empty state logic** — same thresholds
- **Caching strategy** — same AsyncStorage approach for correlations (daily) and narrative (7-day)
- **No streak counting** — excluded by design
- **No actionable CTAs on cards** — informational only for this iteration

---

## Files Changed

| File | Change Type |
|------|-------------|
| `mobile/src/screens/InsightsScreen.tsx` | Major — restructure layout, wire up new widgets |
| `mobile/src/services/correlationEngine.service.ts` | Moderate — export composite score, compute real week-over-week |
| `mobile/src/hooks/useWeeklyCorrelations.ts` | Moderate — fetch 2x timeframe, return composite score + activity counts |
| `mobile/src/components/insights/CorrelationInsightCard.tsx` | New — template-based correlation insight card |
| `mobile/src/components/insights/index.ts` | Minor — add export for CorrelationInsightCard |
| `backend/server.js` | Minor — extend `/weekly-narrative` prompt with best/worst day + correlations |

## Existing Components Activated (No Changes Needed)

| Component | Current Status |
|-----------|---------------|
| `HeroSummaryCard` | Built, unused → activated (minor prop adaptation for subtitle) |
| `WeeklyBarChart` | Built, unused → activated (title change, minor update for month-view week-aggregated labels) |
