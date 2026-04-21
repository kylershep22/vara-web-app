# Insights V2: Enhanced Wellness Insights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the mobile Insights screen with a composite wellness score, week-over-week comparisons, correlation insight cards, and daily activity bar chart.

**Architecture:** Extend the existing correlation engine to export composite scores and compute real week-over-week deltas by fetching 2x the timeframe. Add one new component (CorrelationInsightCard). Activate two existing unused components (HeroSummaryCard, WeeklyBarChart). Restructure InsightsScreen into a progressive hierarchy.

**Tech Stack:** React Native/Expo, TypeScript, Firebase Firestore, react-native-reanimated, react-native-svg, Express.js (backend)

**Spec:** `docs/superpowers/specs/2026-04-10-insights-v2-enhanced-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `mobile/src/services/correlationEngine.service.ts` | Modify | Export `computePeriodScore()`, add `computeWeekOverWeek()`, add `computeDailyActivityCounts()` |
| `mobile/src/hooks/useWeeklyCorrelations.ts` | Modify | Accept optional `days` param, fetch 2x timeframe, return compositeScore + dailyActivityCounts |
| `mobile/src/components/insights/CorrelationInsightCard.tsx` | Create | New component — template-based correlation insight card |
| `mobile/src/components/insights/HeroSummaryCard.tsx` | Modify | Add `deltaPercentage` prop, update title/subtitle |
| `mobile/src/components/insights/WeeklyBarChart.tsx` | Modify | Accept custom `labels` prop, update title |
| `mobile/src/components/insights/index.ts` | Modify | Add CorrelationInsightCard export |
| `mobile/src/screens/InsightsScreen.tsx` | Modify | Restructure layout, wire up all widgets |
| `backend/server.js` | Modify | Add day names + top correlations to narrative prompt |

---

### Task 1: Export Composite Score from Correlation Engine

**Files:**
- Modify: `mobile/src/services/correlationEngine.service.ts`

- [ ] **Step 1: Add `computePeriodScore` export**

Add this exported function after the existing `compositeScore()` function (around line 107):

```typescript
/**
 * Average composite wellness score (0-100) for a set of daily data points.
 * Only includes days that have at least one metric present.
 */
export function computePeriodScore(data: DailyDataPoint[]): number {
  const daysWithData = data.filter(
    (d) =>
      d.mood !== null ||
      d.sleepQuality !== null ||
      d.habitCompletionRate !== null ||
      d.stress !== null ||
      d.energy !== null
  );
  if (daysWithData.length === 0) return 0;
  const total = daysWithData.reduce((sum, d) => sum + compositeScore(d), 0);
  return Math.round(total / daysWithData.length);
}
```

- [ ] **Step 2: Add `computeWeekOverWeek` export**

Add this after `computePeriodScore`:

```typescript
/**
 * Compute week-over-week (or month-over-month) delta.
 * Takes the full 2x dataset and the period length (7 or 30).
 * Returns scoreChange and habitChange as percentage point deltas.
 */
export function computeWeekOverWeek(
  allData: DailyDataPoint[],
  periodDays: number
): { scoreChange: number; habitChange: number } {
  const currentPeriod = allData.slice(-periodDays);
  const priorPeriod = allData.slice(0, allData.length - periodDays);

  if (priorPeriod.length === 0) {
    return { scoreChange: 0, habitChange: 0 };
  }

  const currentScore = computePeriodScore(currentPeriod);
  const priorScore = computePeriodScore(priorPeriod);

  const currentHabits = currentPeriod.filter((d) => d.habitCompletionRate !== null);
  const priorHabits = priorPeriod.filter((d) => d.habitCompletionRate !== null);

  const currentHabitAvg =
    currentHabits.length > 0
      ? currentHabits.reduce((s, d) => s + d.habitCompletionRate!, 0) / currentHabits.length
      : 0;
  const priorHabitAvg =
    priorHabits.length > 0
      ? priorHabits.reduce((s, d) => s + d.habitCompletionRate!, 0) / priorHabits.length
      : 0;

  return {
    scoreChange: Math.round(currentScore - priorScore),
    habitChange: Math.round(currentHabitAvg - priorHabitAvg),
  };
}
```

- [ ] **Step 3: Add `computeDailyActivityCounts` export**

Add this after `computeWeekOverWeek`:

```typescript
/**
 * Compute daily activity counts for bar chart.
 * Each day's count = habits completed + (1 if journaled) + focus sessions.
 * focusSessionCounts is a map of date -> number of completed sessions.
 */
export function computeDailyActivityCounts(
  data: DailyDataPoint[],
  habitCompletionsByDate: Map<string, number>,
  focusSessionsByDate: Map<string, number>
): number[] {
  return data.map((d) => {
    const habitsCompleted = habitCompletionsByDate.get(d.date) || 0;
    const journaled = d.journaled ? 1 : 0;
    const focusSessions = focusSessionsByDate.get(d.date) || 0;
    return habitsCompleted + journaled + focusSessions;
  });
}
```

- [ ] **Step 4: Update `computeCorrelations` to use real week-over-week**

In the `computeCorrelations` function, change the signature to accept optional prior-period data:

```typescript
export function computeCorrelations(
  data: DailyDataPoint[],
  allData?: DailyDataPoint[]
): WeeklyCorrelations | null {
```

Then replace the hardcoded `weekOverWeek` at the end of the function (around line 300):

Replace:
```typescript
    weekOverWeek: { scoreChange: 0, habitChange: 0 },
```

With:
```typescript
    weekOverWeek: allData
      ? computeWeekOverWeek(allData, data.length)
      : { scoreChange: 0, habitChange: 0 },
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/correlationEngine.service.ts
git commit -m "feat(insights): export composite score, week-over-week, and activity count computations"
```

---

### Task 2: Extend useWeeklyCorrelations Hook

**Files:**
- Modify: `mobile/src/hooks/useWeeklyCorrelations.ts`

- [ ] **Step 1: Update the hook signature to accept optional days param and return new fields**

Change the function signature:

```typescript
export function useWeeklyCorrelations(days: number = 7): {
  correlations: WeeklyCorrelations | null;
  compositeScore: number;
  dailyActivityCounts: number[];
  loading: boolean;
} {
```

Update the state declarations to include new fields:

```typescript
  const [compositeScore, setCompositeScore] = useState<number>(0);
  const [dailyActivityCounts, setDailyActivityCounts] = useState<number[]>([]);
```

Update the return statement:

```typescript
  return { correlations, compositeScore, dailyActivityCounts, loading };
```

- [ ] **Step 2: Update imports to include new engine functions**

```typescript
import {
  computeCorrelations,
  computePeriodScore,
  computeDailyActivityCounts,
  type DailyDataPoint,
  type WeeklyCorrelations,
} from '../services/correlationEngine.service';
```

- [ ] **Step 3: Update the data fetching to use 2x timeframe**

In the `load()` function, change the date range to fetch double:

Replace:
```typescript
        const { start, end, dates } = dateRange(7);
```

With:
```typescript
        const fetchDays = days * 2;
        const { start, end, dates } = dateRange(fetchDays);
```

- [ ] **Step 4: Update `fetchHabitsAndCompletions` to also return raw completion counts**

The existing `fetchHabitsAndCompletions` returns a `Map<string, number>` of date → completion rate (0-100). We also need raw counts for the activity bar chart. Update the function to return both:

Change its return type:

```typescript
async function fetchHabitsAndCompletions(
  uid: string,
  dates: string[],
): Promise<{ rates: Map<string, number>; counts: Map<string, number> }> {
  const rates = new Map<string, number>();
  const counts = new Map<string, number>();
```

Update the inner loop that computes rates to also track counts:

```typescript
    for (const date of dates) {
      let completed = 0;
      for (const { completions } of allCompletions) {
        const match = completions.find(c => c.date === date && c.completed);
        if (match) completed++;
      }
      const rate = Math.round((completed / habitIds.length) * 100);
      rates.set(date, rate);
      counts.set(date, completed);
    }
  } catch {
    // Return empty maps
  }
  return { rates, counts };
}
```

Then update the call site in `load()` to destructure:

```typescript
        const habitsResult = await fetchHabitsAndCompletions(uid, dates);
        const habits = habitsResult.rates;
        const habitCounts = habitsResult.counts;
```

(Adjust the `Promise.all` destructuring accordingly — `habits` was the 5th element. Replace `habits` with `habitsResult` in the destructuring, then derive `habits` and `habitCounts` from it.)

- [ ] **Step 5: Split data into current and prior periods for correlation computation**

After building `dailyData`, split and compute:

Replace the existing `const result = computeCorrelations(dailyData);` with:

```typescript
        // Split into current period and full dataset
        const currentPeriodData = dailyData.slice(-days);
        const result = computeCorrelations(currentPeriodData, dailyData);

        // Compute composite score for current period
        const score = computePeriodScore(currentPeriodData);

        // Compute daily activity counts for current period
        const currentDates = dates.slice(-days);
        const habitCountsByDate = new Map<string, number>();
        const focusCountsByDate = new Map<string, number>();
        for (const date of currentDates) {
          habitCountsByDate.set(date, habitCounts.get(date) || 0);
          focusCountsByDate.set(date, focusSessions.get(date) ? 1 : 0);
        }

        const activityCounts = computeDailyActivityCounts(
          currentPeriodData,
          habitCountsByDate,
          focusCountsByDate
        );
```

- [ ] **Step 6: Update the cache write and state updates**

Replace the existing state updates with:

```typescript
        if (!cancelled) {
          setCorrelations(result);
          setCompositeScore(score);
          setDailyActivityCounts(activityCounts);
          setLoading(false);
        }
```

Also update the cache read section to store/restore the new fields. Update the cache structure:

```typescript
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              date: todayStr(),
              days,
              data: result,
              compositeScore: score,
              dailyActivityCounts: activityCounts,
            })
          );
```

And the cache read:

```typescript
          if (parsed.date === todayStr() && parsed.days === days) {
            if (!cancelled) {
              setCorrelations(parsed.data);
              setCompositeScore(parsed.compositeScore ?? 0);
              setDailyActivityCounts(parsed.dailyActivityCounts ?? []);
              setLoading(false);
            }
            return;
          }
```

- [ ] **Step 7: Add `days` to the useEffect dependency array**

```typescript
  }, [user?.uid, days]);
```

- [ ] **Step 8: Commit**

```bash
git add mobile/src/hooks/useWeeklyCorrelations.ts
git commit -m "feat(insights): extend useWeeklyCorrelations with composite score, activity counts, and 2x timeframe"
```

---

### Task 3: Create CorrelationInsightCard Component

**Files:**
- Create: `mobile/src/components/insights/CorrelationInsightCard.tsx`
- Modify: `mobile/src/components/insights/index.ts`

- [ ] **Step 1: Create the CorrelationInsightCard component**

Create `mobile/src/components/insights/CorrelationInsightCard.tsx`:

```typescript
/**
 * Correlation Insight Card
 * Surfaces the top 1-2 behavioral correlations as plain-English insights.
 * Only renders when at least one correlation is significant.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { WeeklyCorrelations } from '../../services/correlationEngine.service';

const VARA_COLORS = {
  teal: '#1B5E57',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

interface CorrelationInsightCardProps {
  correlations: WeeklyCorrelations;
}

interface InsightLine {
  text: string;
}

function buildInsights(correlations: WeeklyCorrelations): InsightLine[] {
  const lines: InsightLine[] = [];

  if (correlations.sleepHabitCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.sleepHabitCorrelation.highSleepCompletion -
          correlations.sleepHabitCorrelation.lowSleepCompletion
      )
    );
    lines.push({ text: `When you sleep well, you complete ${gap}% more habits` });
  }

  if (correlations.energyHabitCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.energyHabitCorrelation.highEnergyCompletion -
          correlations.energyHabitCorrelation.lowEnergyCompletion
      )
    );
    lines.push({ text: `On high-energy days, you complete ${gap}% more habits` });
  }

  if (correlations.journalMoodCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.journalMoodCorrelation.journalDayMood -
          correlations.journalMoodCorrelation.nonJournalDayMood
      ) * 10
    ) / 10;
    lines.push({ text: `Days you journal, your mood averages ${gap} points higher` });
  }

  if (correlations.sleepFocusCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.sleepFocusCorrelation.highSleepFocusMin -
          correlations.sleepFocusCorrelation.lowSleepFocusMin
      )
    );
    lines.push({ text: `Good sleep nights lead to ${gap} more focus minutes` });
  }

  // Return top 2 max
  return lines.slice(0, 2);
}

export const CorrelationInsightCard: React.FC<CorrelationInsightCardProps> = ({
  correlations,
}) => {
  const insights = buildInsights(correlations);

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="lightbulb-on-outline" size={18} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>Your top insight</Text>
      </View>
      {insights.length === 1 ? (
        <Text style={styles.insightText}>{insights[0].text}</Text>
      ) : (
        <View>
          {insights.map((insight, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: VARA_COLORS.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  insightText: {
    fontSize: 14,
    color: VARA_COLORS.charcoal,
    lineHeight: 21,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    color: VARA_COLORS.teal,
    marginRight: 8,
    lineHeight: 21,
  },
});
```

- [ ] **Step 2: Add export to barrel file**

In `mobile/src/components/insights/index.ts`, add this line after the existing exports:

```typescript
export { CorrelationInsightCard } from './CorrelationInsightCard';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/insights/CorrelationInsightCard.tsx mobile/src/components/insights/index.ts
git commit -m "feat(insights): add CorrelationInsightCard component"
```

---

### Task 4: Adapt HeroSummaryCard for Wellness Score

**Files:**
- Modify: `mobile/src/components/insights/HeroSummaryCard.tsx`

- [ ] **Step 1: Add `deltaPercentage` and `periodLabel` props**

Update the interface (around line 26):

```typescript
interface HeroSummaryCardProps {
  readinessScore: number;
  checkInsCount: number;
  trend: 'up' | 'steady' | 'down';
  timeframeLabel: string;
  deltaPercentage?: number;
  periodLabel?: string; // "week" or "month"
}
```

- [ ] **Step 2: Update `getTrendText` to use delta-aware subtitles**

Replace the `getTrendText` function inside the component (around line 101):

```typescript
  const getTrendText = () => {
    if (checkInsCount === 0) return '';
    const period = periodLabel || 'week';
    if (deltaPercentage !== undefined && deltaPercentage !== 0) {
      const direction = deltaPercentage > 0 ? 'Up' : 'Down';
      const abs = Math.abs(deltaPercentage);
      return `${direction} ${abs}% from last ${period}`;
    }
    return 'Holding steady';
  };
```

- [ ] **Step 3: Update the subtitle rendering**

Replace the subtitle `<Text>` block (around line 128):

```typescript
          <Text style={[styles.subtitle, checkInsCount === 0 && styles.subtitleZero]}>
            {checkInsCount === 0
              ? 'Your score appears after your first check-in'
              : `${getTrendText()} \u00B7 ${checkInsCount} check-in${checkInsCount !== 1 ? 's' : ''}`
            }
          </Text>
```

This is already the existing structure — just verify `getTrendText()` is now producing the new format.

- [ ] **Step 4: Update the title from "Brain Readiness" to "Wellness Score"**

Replace the title text (around line 127):

Replace:
```typescript
          <Text style={styles.title}>Brain Readiness</Text>
```

With:
```typescript
          <Text style={styles.title}>Wellness Score</Text>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/insights/HeroSummaryCard.tsx
git commit -m "feat(insights): adapt HeroSummaryCard for wellness score with week-over-week delta"
```

---

### Task 5: Update WeeklyBarChart for Custom Labels and Title

**Files:**
- Modify: `mobile/src/components/insights/WeeklyBarChart.tsx`

- [ ] **Step 1: Add optional `labels` and `title` props**

Update the interface (around line 28):

```typescript
interface WeeklyBarChartProps {
  data: number[]; // Array of values
  labels?: string[]; // Custom labels (defaults to M T W T F S S)
  title?: string; // Custom title (defaults to "Daily activity")
}
```

- [ ] **Step 2: Update the component to use custom labels**

In the `WeeklyBarChart` component, update the data normalization to respect custom labels:

Replace:
```typescript
export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data }) => {
  // Ensure we have exactly 7 values
  const normalizedData = [...data];
  while (normalizedData.length < 7) {
    normalizedData.push(0);
  }
  const chartData = normalizedData.slice(0, 7);
```

With:
```typescript
export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  labels,
  title: customTitle,
}) => {
  const chartData = [...data];
  const chartLabels = labels || DAY_LABELS;

  // Pad data to match labels if needed
  while (chartData.length < chartLabels.length) {
    chartData.push(0);
  }
```

- [ ] **Step 3: Update the title and label rendering**

Replace the title text:

Replace:
```typescript
        <Text style={styles.title}>Weekly Activity</Text>
```

With:
```typescript
        <Text style={styles.title}>{customTitle || 'Daily activity'}</Text>
```

Replace the chart rendering to use `chartLabels`:

Replace:
```typescript
        {chartData.map((value, index) => (
          <AnimatedBar
            key={index}
            value={value}
            maxValue={maxValue}
            isPeak={index === peakIndex}
            index={index}
            label={DAY_LABELS[index]}
          />
        ))}
```

With:
```typescript
        {chartData.slice(0, chartLabels.length).map((value, index) => (
          <AnimatedBar
            key={index}
            value={value}
            maxValue={maxValue}
            isPeak={index === peakIndex}
            index={index}
            label={chartLabels[index]}
          />
        ))}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/insights/WeeklyBarChart.tsx
git commit -m "feat(insights): support custom labels and title in WeeklyBarChart"
```

---

### Task 6: Enrich Backend Narrative Prompt

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Extract new fields from request body**

At line 324, update the destructuring:

Replace:
```javascript
  const { correlationData } = req.body;
```

With:
```javascript
  const { correlationData, bestDay, hardestDay, topCorrelations } = req.body;
```

- [ ] **Step 2: Add day names and top correlations to the user prompt**

The existing prompt already has `bestDay.factors` and `hardestDay.factors` lines. Update them to include the day name, and add a new section for top correlations.

Replace the lines (around 365-366):

```javascript
Best day factors: ${correlationData.bestDay?.factors?.join(', ') || 'not enough data'}
Hardest day factors: ${correlationData.hardestDay?.factors?.join(', ') || 'not enough data'}
```

With:

```javascript
Best day: ${bestDay?.day || correlationData.bestDay?.day || 'unknown'} (${bestDay?.factors?.join(', ') || correlationData.bestDay?.factors?.join(', ') || 'not enough data'})
Hardest day: ${hardestDay?.day || correlationData.hardestDay?.day || 'unknown'} (${hardestDay?.factors?.join(', ') || correlationData.hardestDay?.factors?.join(', ') || 'not enough data'})
${topCorrelations?.length ? `\nTop behavioral correlations:\n${topCorrelations.map(c => `- ${c.factor}: ${c.direction} impact of ${c.impact} points`).join('\n')}` : ''}
```

- [ ] **Step 3: Update the system prompt to instruct natural weaving**

Add this line to the system prompt (after the "Acknowledge effort" line, around line 343):

```javascript
- When provided with best/worst day info and correlations, weave them naturally into the narrative. Don't list them mechanically. Example: "Wednesday stood out, with good sleep and energy carrying you through your habits." Not: "Best day: Wednesday. Factors: good sleep, high energy."
```

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat(insights): enrich weekly narrative prompt with day names and top correlations"
```

---

### Task 7: Restructure InsightsScreen Layout

**Files:**
- Modify: `mobile/src/screens/InsightsScreen.tsx`

- [ ] **Step 1: Update imports**

Replace the existing insight component imports (lines 14-19):

```typescript
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
} from '../components';
import { AtAGlanceCard } from '../components/insights/SparklineTrendCard';
```

With:

```typescript
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
  HeroSummaryCard,
  WeeklyBarChart,
} from '../components';
import { AtAGlanceCard } from '../components/insights/SparklineTrendCard';
import { CorrelationInsightCard } from '../components/insights/CorrelationInsightCard';
```

- [ ] **Step 2: Update the useWeeklyCorrelations call to pass timeframe days**

Replace line 43:

```typescript
  const { correlations } = useWeeklyCorrelations();
```

With:

```typescript
  const days = timeFrame === 'week' ? 7 : 30;
  const { correlations, compositeScore, dailyActivityCounts } = useWeeklyCorrelations(days);
```

- [ ] **Step 3: Compute hero card props from correlations**

Add this `useMemo` after the existing `metrics` memo (around line 219):

```typescript
  const heroProps = useMemo(() => {
    if (!correlations) {
      return { readinessScore: 0, trend: 'steady' as const, deltaPercentage: 0, checkInsCount: 0 };
    }
    const delta = correlations.weekOverWeek.scoreChange;
    let trend: 'up' | 'steady' | 'down' = 'steady';
    if (delta > 2) trend = 'up';
    else if (delta < -2) trend = 'down';

    // Count check-ins: days with at least mood or sleep data
    const checkInsCount = Object.values(habitCompletionData).flat().length > 0
      ? new Set(Object.values(habitCompletionData).flat()).size
      : 0;

    return {
      readinessScore: compositeScore,
      trend,
      deltaPercentage: delta,
      checkInsCount,
    };
  }, [correlations, compositeScore, habitCompletionData]);
```

- [ ] **Step 4: Compute bar chart data for month view aggregation**

Add this `useMemo` after `heroProps`:

```typescript
  const barChartProps = useMemo(() => {
    if (timeFrame === 'week') {
      return { data: dailyActivityCounts, labels: undefined, title: undefined };
    }
    // Month view: aggregate into weeks
    const weeks: number[] = [];
    const labels: string[] = [];
    for (let i = 0; i < dailyActivityCounts.length; i += 7) {
      const weekSlice = dailyActivityCounts.slice(i, i + 7);
      weeks.push(weekSlice.reduce((a, b) => a + b, 0));
      labels.push(`W${weeks.length}`);
    }
    return { data: weeks, labels, title: 'Weekly activity' };
  }, [dailyActivityCounts, timeFrame]);
```

- [ ] **Step 5: Restructure the widget rendering**

Replace the entire content inside the `<>...</>` block (lines 287-326) with the new progressive hierarchy:

```tsx
            {/* Widget 1: Hero — Wellness Score */}
            <HeroSummaryCard
              readinessScore={heroProps.readinessScore}
              checkInsCount={heroProps.checkInsCount}
              trend={heroProps.trend}
              timeframeLabel={timeFrame === 'week' ? 'This week' : 'This month'}
              deltaPercentage={heroProps.deltaPercentage}
              periodLabel={timeFrame === 'week' ? 'week' : 'month'}
            />

            {/* Widget 2: AI Narrative */}
            <NarrativeRecap
              narrative={aiNarrative}
              loading={narrativeLoading}
              timeframeLabel={timeFrame === 'week' ? 'This Week' : 'This Month'}
              hasInsufficientData={hasInsufficientData}
            />

            {/* Widget 3: Correlation Insight (only if significant) */}
            {correlations && !hasInsufficientData && (
              <CorrelationInsightCard correlations={correlations} />
            )}

            {/* Widget 4: Daily Activity Bar Chart */}
            {!hasInsufficientData && dailyActivityCounts.length > 0 && (
              <WeeklyBarChart
                data={barChartProps.data}
                labels={barChartProps.labels}
                title={barChartProps.title}
              />
            )}

            {/* Widget 5: 30-day Habit Heatmap */}
            <HabitHeatmap
              data={heatmapData}
              totalHabits={habits.length}
              daysToShow={30}
            />

            {/* Widget 6: At a Glance */}
            <AtAGlanceCard
              metrics={[
                {
                  label: 'Days active',
                  value: metrics.activeDays,
                  data: [],
                  color: VARA_COLORS.teal,
                },
                {
                  label: 'Protocols completed',
                  value: metrics.protocolsCompleted,
                  data: [],
                  color: VARA_COLORS.tealMid,
                },
                {
                  label: 'Reflections',
                  value: metrics.reflections,
                  data: [],
                  color: VARA_COLORS.apricot,
                },
              ]}
            />
```

- [ ] **Step 6: Update the narrative API call to send enriched data**

In the `fetchNarrative` effect (around line 166), update the API payload to include best/worst day and top correlations:

Replace the `correlationData` object:

```typescript
        const correlationData = {
          sleepHabitCorrelation: correlations.sleepHabitCorrelation,
          energyHabitCorrelation: correlations.energyHabitCorrelation,
          journalMoodCorrelation: correlations.journalMoodCorrelation,
          topDriver: correlations.topDriver,
          brightSpot: correlations.brightSpot,
          stressTrend: correlations.stressTrend,
          weekOverWeek: correlations.weekOverWeek,
          dataCompleteness: correlations.dataCompleteness,
        };

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
        }, { debug: __DEV__ });
```

With:

```typescript
        const correlationData = {
          sleepHabitCorrelation: correlations.sleepHabitCorrelation,
          energyHabitCorrelation: correlations.energyHabitCorrelation,
          journalMoodCorrelation: correlations.journalMoodCorrelation,
          topDriver: correlations.topDriver,
          brightSpot: correlations.brightSpot,
          stressTrend: correlations.stressTrend,
          weekOverWeek: correlations.weekOverWeek,
          dataCompleteness: correlations.dataCompleteness,
        };

        // Format best/worst day names for the narrative
        const formatDayName = (dateStr: string) => {
          const date = new Date(dateStr + 'T12:00:00');
          return date.toLocaleDateString('en-US', { weekday: 'long' });
        };

        const bestDay = {
          day: formatDayName(correlations.bestDay.day),
          factors: correlations.bestDay.factors,
        };
        const hardestDay = {
          day: formatDayName(correlations.hardestDay.day),
          factors: correlations.hardestDay.factors,
        };

        // Top significant correlations for the narrative
        const topCorrelations = [
          correlations.sleepHabitCorrelation.significant && {
            factor: 'sleep-habits',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.sleepHabitCorrelation.highSleepCompletion -
              correlations.sleepHabitCorrelation.lowSleepCompletion
            )),
          },
          correlations.energyHabitCorrelation.significant && {
            factor: 'energy-habits',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.energyHabitCorrelation.highEnergyCompletion -
              correlations.energyHabitCorrelation.lowEnergyCompletion
            )),
          },
          correlations.journalMoodCorrelation.significant && {
            factor: 'journaling-mood',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.journalMoodCorrelation.journalDayMood -
              correlations.journalMoodCorrelation.nonJournalDayMood
            ) * 20),
          },
        ].filter(Boolean);

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
          bestDay,
          hardestDay,
          topCorrelations,
        }, { debug: __DEV__ });
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/InsightsScreen.tsx
git commit -m "feat(insights): restructure InsightsScreen with progressive widget hierarchy"
```

---

### Task 8: Smoke Test and Verify

**Files:**
- No file changes — verification only

- [ ] **Step 1: Start the backend server**

Run: `cd mobile && npx expo start` (in one terminal) and `cd backend && npm run server` (in another).

Verify no compile errors or red screens on launch.

- [ ] **Step 2: Navigate to the Insights screen**

Open the app → Wellness tab → Insights. Verify:
- HeroSummaryCard renders at the top with "Wellness Score" title
- If user has check-in data, the ring shows a percentage and the subtitle shows "Up/Down X% from last week"
- If no data, it shows the "Your score appears after your first check-in" message

- [ ] **Step 3: Verify the AI Narrative loads**

Wait for the narrative to load. Confirm it renders below the hero card. If the user has best/worst day data, check the console/network to confirm the enriched payload is being sent.

- [ ] **Step 4: Verify the CorrelationInsightCard**

If correlations are significant, the card should appear between the narrative and the bar chart. If no significant correlations, confirm the card is absent (no empty card).

- [ ] **Step 5: Verify the WeeklyBarChart**

Confirm the bar chart shows below the correlation card (or below the narrative if no correlations). Toggle to "Month" — confirm bars aggregate into W1, W2, etc.

- [ ] **Step 6: Verify HabitHeatmap and AtAGlanceCard still render**

Scroll down and confirm both existing widgets render unchanged at the bottom.

- [ ] **Step 7: Test empty state**

If possible, test with a user that has no data. Confirm the existing "No insights yet" empty state still displays.

- [ ] **Step 8: Commit any fixes**

If any issues were found and fixed during testing:

```bash
git add -A
git commit -m "fix(insights): address issues found during smoke testing"
```
