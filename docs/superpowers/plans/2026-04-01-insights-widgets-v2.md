# Insights Widgets V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new insight widgets (CorrelationCard, BrainStateDistribution, WeekOverWeekSummary) and modify 2 existing ones (NarrativeRecap, HabitHeatmap) on the mobile Insights screen, replacing AtAGlanceCard.

**Architecture:** Extend `useWeeklyCorrelations` hook to return new correlation shapes (brain-state-based, journal→brain-state, protocol→next-day, day-of-week). Build 3 new components in `src/components/insights/`. Modify InsightsScreen to compute derived props, rank correlations, and render all 6 widgets in the specified order. Parent screen owns all data transformation; widgets are pure presentation.

**Tech Stack:** React Native, TypeScript, Reanimated (bar animations), Firestore (brainStateCheckIns collection), existing design tokens from `src/constants/`.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/services/correlationEngine.service.ts` | Add new correlation types to `WeeklyCorrelations` interface and `computeCorrelations` |
| Modify | `src/hooks/useWeeklyCorrelations.ts` | Expose raw `brainStateCheckIns` map + `focusSessions` map alongside correlations; fetch prior-period brain state data |
| Create | `src/components/insights/CorrelationCard.tsx` | New widget: side-by-side bar comparison with animated fills |
| Create | `src/components/insights/BrainStateDistribution.tsx` | New widget: brain state distribution bars with period comparison |
| Create | `src/components/insights/WeekOverWeekSummary.tsx` | New widget: 3-metric summary with delta indicators |
| Modify | `src/components/insights/NarrativeRecap.tsx` | Add insight chips below narrative text |
| Modify | `src/components/insights/HabitHeatmap.tsx` | Add contextual "strongest days" line below legend |
| Modify | `src/components/insights/index.ts` | Export new components |
| Modify | `src/screens/InsightsScreen.tsx` | Wire everything: correlation ranking, data derivation, new render order, ScrollView refs |

---

## Task 1: Extend Correlation Engine with New Correlation Types

**Files:**
- Modify: `src/services/correlationEngine.service.ts`

This task adds 4 new correlation computations to the existing engine: brain-state→habit, journal→brain-state, protocol→next-day-state, and day-of-week patterns. It also adds a new `InsightCorrelation` type that the UI will consume directly.

- [ ] **Step 1: Add new types and fields to WeeklyCorrelations**

Add after the existing `WeeklyCorrelations` interface (around line 43):

```typescript
// Add this new interface before WeeklyCorrelations
export interface InsightCorrelation {
  id: string;                  // unique key for anchor scrolling
  title: string;               // e.g., "Brain state → habit completion"
  highConditionLabel: string;  // e.g., "Clear or Energized days"
  lowConditionLabel: string;   // e.g., "Foggy or Wired days"
  highValue: number;           // 0-100 percentage
  lowValue: number;            // 0-100 percentage
  footnote: string;
  gap: number;                 // absolute difference for ranking
}
```

Then extend the `WeeklyCorrelations` interface — add this field at the end:

```typescript
  // New: ranked insight correlations for CorrelationCard widgets
  insightCorrelations: InsightCorrelation[];
```

- [ ] **Step 2: Add the DailyDataPoint fields needed for new correlations**

The `DailyDataPoint` interface already has `energy` (mapped from brainState) and `journaled`. We need the raw `brainState` string and protocol completion info. Add these fields to the interface:

```typescript
export interface DailyDataPoint {
  date: string;
  sleepQuality: number | null;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  habitCompletionRate: number | null;
  focusMinutes: number | null;
  journaled: boolean;
  brainState: string | null;           // NEW: raw brain state ('wired'|'foggy'|'okay'|'clear'|'energized')
  protocolCompleted: boolean;           // NEW: whether a protocol was completed this day
}
```

- [ ] **Step 3: Implement the 4 new correlation computations**

Add this function before `computeCorrelations`:

```typescript
function computeInsightCorrelations(data: DailyDataPoint[]): InsightCorrelation[] {
  const correlations: InsightCorrelation[] = [];

  // 1. Brain state → habit completion
  const clearEnergizedDays = data.filter(
    d => d.brainState && ['clear', 'energized'].includes(d.brainState) && d.habitCompletionRate !== null
  );
  const foggyWiredDays = data.filter(
    d => d.brainState && ['foggy', 'wired'].includes(d.brainState) && d.habitCompletionRate !== null
  );
  if (clearEnergizedDays.length >= 2 && foggyWiredDays.length >= 2) {
    const highVal = Math.round(avg(clearEnergizedDays.map(d => d.habitCompletionRate!)));
    const lowVal = Math.round(avg(foggyWiredDays.map(d => d.habitCompletionRate!)));
    const gap = Math.abs(highVal - lowVal);
    if (gap >= 15) {
      correlations.push({
        id: 'correlation-brain-habit',
        title: 'Brain state \u2192 habit completion',
        highConditionLabel: 'Clear or Energized days',
        lowConditionLabel: 'Foggy or Wired days',
        highValue: highVal,
        lowValue: lowVal,
        footnote: 'Based on your brain state check-ins and habit data this week',
        gap,
      });
    }
  }

  // 2. Journal presence → brain state
  const journalDaysWithState = data.filter(
    d => d.journaled && d.brainState !== null
  );
  const noJournalDaysWithState = data.filter(
    d => !d.journaled && d.brainState !== null
  );
  if (journalDaysWithState.length >= 2 && noJournalDaysWithState.length >= 2) {
    const journalPositivePct = Math.round(
      (journalDaysWithState.filter(d => ['clear', 'energized'].includes(d.brainState!)).length / journalDaysWithState.length) * 100
    );
    const noJournalPositivePct = Math.round(
      (noJournalDaysWithState.filter(d => ['clear', 'energized'].includes(d.brainState!)).length / noJournalDaysWithState.length) * 100
    );
    const gap = Math.abs(journalPositivePct - noJournalPositivePct);
    if (gap >= 15) {
      correlations.push({
        id: 'correlation-journal-brain',
        title: 'Journaling \u2192 brain state',
        highConditionLabel: 'Days with journal entry',
        lowConditionLabel: 'Days without',
        highValue: journalPositivePct,
        lowValue: noJournalPositivePct,
        footnote: '% of days in Clear or Energized state',
        gap,
      });
    }
  }

  // 3. Protocol usage → next-day state
  // For each day except the last, check if protocol was completed.
  // Then compare the next day's brain state.
  const protocolNextDays: string[] = [];
  const noProtocolNextDays: string[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    const nextDay = data[i + 1];
    if (nextDay.brainState === null) continue;
    if (data[i].protocolCompleted) {
      protocolNextDays.push(nextDay.brainState);
    } else {
      noProtocolNextDays.push(nextDay.brainState);
    }
  }
  if (protocolNextDays.length >= 2 && noProtocolNextDays.length >= 2) {
    const afterProtocolPositivePct = Math.round(
      (protocolNextDays.filter(s => ['clear', 'energized'].includes(s)).length / protocolNextDays.length) * 100
    );
    const afterNoProtocolPositivePct = Math.round(
      (noProtocolNextDays.filter(s => ['clear', 'energized'].includes(s)).length / noProtocolNextDays.length) * 100
    );
    const gap = Math.abs(afterProtocolPositivePct - afterNoProtocolPositivePct);
    if (gap >= 15) {
      correlations.push({
        id: 'correlation-protocol-nextday',
        title: 'Protocols \u2192 next-day state',
        highConditionLabel: 'Day after a protocol',
        lowConditionLabel: 'Day after no protocol',
        highValue: afterProtocolPositivePct,
        lowValue: afterNoProtocolPositivePct,
        footnote: '% of next days in Clear or Energized state',
        gap,
      });
    }
  }

  // 4. Day-of-week pattern
  const dayOfWeekMap: Record<string, number[]> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const d of data) {
    if (d.habitCompletionRate === null) continue;
    const dayName = dayNames[new Date(d.date).getDay()];
    if (!dayOfWeekMap[dayName]) dayOfWeekMap[dayName] = [];
    dayOfWeekMap[dayName].push(d.habitCompletionRate);
  }
  const dayAverages = Object.entries(dayOfWeekMap)
    .map(([day, rates]) => ({ day, avg: avg(rates) }))
    .sort((a, b) => b.avg - a.avg);

  if (dayAverages.length >= 4) {
    const overallAvg = avg(dayAverages.map(d => d.avg));
    const top2 = dayAverages.slice(0, 2);
    const bottom2 = dayAverages.slice(-2);
    const topAvg = Math.round(avg(top2.map(d => d.avg)));
    const bottomAvg = Math.round(avg(bottom2.map(d => d.avg)));
    const gap = Math.abs(topAvg - bottomAvg);
    if (gap >= 15) {
      correlations.push({
        id: 'correlation-dayofweek',
        title: 'Weekday pattern \u2192 completion',
        highConditionLabel: `${top2[0].day} and ${top2[1].day}`,
        lowConditionLabel: `${bottom2[0].day} and ${bottom2[1].day}`,
        highValue: topAvg,
        lowValue: bottomAvg,
        footnote: 'Average habit completion by day of week',
        gap,
      });
    }
  }

  // Sort by gap descending (largest gap = primary)
  correlations.sort((a, b) => b.gap - a.gap);

  return correlations;
}
```

- [ ] **Step 4: Call `computeInsightCorrelations` inside `computeCorrelations`**

At the end of the `computeCorrelations` function, just before the `return` statement (around line 268), add:

```typescript
  const insightCorrelations = computeInsightCorrelations(data);
```

Then add `insightCorrelations` to the return object:

```typescript
    dataCompleteness,
    insightCorrelations,
  };
```

- [ ] **Step 5: Commit**

```bash
git add src/services/correlationEngine.service.ts
git commit -m "feat(insights): extend correlation engine with brain-state, journal, protocol, and day-of-week correlations"
```

---

## Task 2: Extend useWeeklyCorrelations Hook

**Files:**
- Modify: `src/hooks/useWeeklyCorrelations.ts`

The hook needs to: (1) populate the new `brainState` and `protocolCompleted` fields on `DailyDataPoint`, (2) fetch prior-period brain state data for the BrainStateDistribution widget, and (3) expose raw data maps the parent screen needs.

- [ ] **Step 1: Update DailyDataPoint construction to include new fields**

In the `load()` function, where dailyData is built (around line 84), update the map callback to include the new fields:

```typescript
        const dailyData: DailyDataPoint[] = dates.map(date => {
          const brainCheck = brainStateCheckIns.get(date);
          const brain = brainMetrics.get(date);
          const journaled = journalEntries.has(date);
          const focus = focusSessions.get(date) || 0;
          const habitRate = habits.get(date);

          const brainStateToMood: Record<string, number> = {
            wired: 3, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const brainStateToEnergy: Record<string, number> = {
            wired: 4, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const bState = brainCheck?.brainState;

          return {
            date,
            sleepQuality: brain?.sleepQuality ?? null,
            mood: bState ? brainStateToMood[bState] ?? null : null,
            energy: bState ? brainStateToEnergy[bState] ?? null : null,
            stress: brain?.stressLevel ?? null,
            habitCompletionRate: habitRate ?? null,
            focusMinutes: focus > 0 ? focus : null,
            journaled,
            brainState: bState ?? null,
            protocolCompleted: brainCheck?.protocolCompleted ?? false,
          };
        });
```

Note: `brainCheck` is fetched via `fetchBrainStateCheckIns`. We need the `protocolCompleted` field from the Firestore doc. Update `fetchBrainStateCheckIns` to also return `protocolCompleted`.

- [ ] **Step 2: Update fetchBrainStateCheckIns to include protocolCompleted**

Change the return type and data extraction in `fetchBrainStateCheckIns` (around line 139):

```typescript
async function fetchBrainStateCheckIns(
  uid: string,
  dates: string[],
): Promise<Map<string, { brainState: string; protocolCompleted: boolean }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      if (!db) return;
      const docRef = doc(db, 'brainStateCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, {
          brainState: data.brainState,
          protocolCompleted: data.protocolCompleted ?? false,
        });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}
```

- [ ] **Step 3: Add prior-period brain state data to hook return**

Add state for brain state distribution data, and fetch it alongside the main data. Update the hook's return type and add new state:

```typescript
export interface BrainStateDistributionData {
  distribution: {
    state: 'Energized' | 'Clear' | 'Okay' | 'Foggy' | 'Wired';
    days: number;
    emoji: string;
  }[];
  totalDays: number;
  positiveStateDays: number;
  priorPositiveStateDays: number | null;
}
```

Add this state inside the hook:

```typescript
  const [brainStateDistribution, setBrainStateDistribution] = useState<BrainStateDistributionData | null>(null);
```

At the end of the `load()` function, after computing correlations but before setting state, compute brain state distribution:

```typescript
        // Compute brain state distribution for current period
        const brainStatesThisPeriod = dates
          .map(date => brainStateCheckIns.get(date)?.brainState)
          .filter((s): s is string => s != null);

        if (brainStatesThisPeriod.length >= 3) {
          // Fetch prior period brain states
          const priorRange = dateRange(14); // 14 days total, we'll use days 8-14
          const priorDates = priorRange.dates.slice(0, 7); // first 7 = prior week
          const priorBrainStates = await fetchBrainStateCheckIns(uid, priorDates);

          const stateOrder: Array<{ state: 'Energized' | 'Clear' | 'Okay' | 'Foggy' | 'Wired'; key: string; emoji: string }> = [
            { state: 'Energized', key: 'energized', emoji: '\u26A1' },
            { state: 'Clear', key: 'clear', emoji: '\u2728' },
            { state: 'Okay', key: 'okay', emoji: '\uD83C\uDF24' },
            { state: 'Foggy', key: 'foggy', emoji: '\uD83C\uDF2B' },
            { state: 'Wired', key: 'wired', emoji: '\u26A0\uFE0F' },
          ];

          const distribution = stateOrder.map(({ state, key, emoji }) => ({
            state,
            days: brainStatesThisPeriod.filter(s => s === key).length,
            emoji,
          }));

          const positiveStateDays = brainStatesThisPeriod.filter(
            s => s === 'clear' || s === 'energized'
          ).length;

          const priorStates = priorDates
            .map(date => priorBrainStates.get(date)?.brainState)
            .filter((s): s is string => s != null);

          const priorPositiveStateDays = priorStates.length >= 3
            ? priorStates.filter(s => s === 'clear' || s === 'energized').length
            : null;

          setBrainStateDistribution({
            distribution,
            totalDays: brainStatesThisPeriod.length,
            positiveStateDays,
            priorPositiveStateDays,
          });
        } else {
          setBrainStateDistribution(null);
        }
```

- [ ] **Step 4: Update hook return type**

```typescript
export function useWeeklyCorrelations(): {
  correlations: WeeklyCorrelations | null;
  brainStateDistribution: BrainStateDistributionData | null;
  loading: boolean;
} {
```

And update the return statement:

```typescript
  return { correlations, brainStateDistribution, loading };
```

- [ ] **Step 5: Clear AsyncStorage cache to force recomputation**

Since the `WeeklyCorrelations` shape changed, the cached data won't have the new `insightCorrelations` field. The existing cache invalidation is date-based (daily), so the cache will naturally refresh. No code change needed — but note this during testing.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useWeeklyCorrelations.ts
git commit -m "feat(insights): extend useWeeklyCorrelations with brain state distribution and new DailyDataPoint fields"
```

---

## Task 3: Create CorrelationCard Component

**Files:**
- Create: `src/components/insights/CorrelationCard.tsx`

- [ ] **Step 1: Create the component file**

```typescript
/**
 * CorrelationCard
 * Visualizes a data correlation as a side-by-side bar comparison.
 * Renders the strongest/secondary pattern from weekly correlation data.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { Layout } from '../../constants/spacing';

interface CorrelationCardProps {
  title: string;
  highConditionLabel: string;
  lowConditionLabel: string;
  highValue: number;
  lowValue: number;
  footnote?: string;
  isPrimary?: boolean;
  anchorKey?: string;
}

const AnimatedBar: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(value, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    height: 6,
    borderRadius: 9999,
    backgroundColor: color,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={animatedStyle} />
    </View>
  );
};

export const CorrelationCard: React.FC<CorrelationCardProps> = ({
  title,
  highConditionLabel,
  lowConditionLabel,
  highValue,
  lowValue,
  footnote,
  isPrimary = false,
}) => {
  return (
    <View style={styles.wrapper}>
      {isPrimary && (
        <View style={styles.sectionLabelRow}>
          <Icon name="connection" size={Layout.iconSize.xs} color={Colors.evergreenTeal} />
          <Text style={styles.sectionLabel}>Strongest pattern</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>

        {/* High condition bar */}
        <View style={styles.barRow}>
          <View style={styles.labelRow}>
            <Text style={styles.conditionLabel}>{highConditionLabel}</Text>
            <Text style={[styles.valueText, { color: Colors.evergreenTeal }]}>{highValue}%</Text>
          </View>
          <AnimatedBar value={highValue} color={Colors.evergreenTeal} />
        </View>

        {/* Low condition bar */}
        <View style={styles.barRow}>
          <View style={styles.labelRow}>
            <Text style={styles.conditionLabel}>{lowConditionLabel}</Text>
            <Text style={[styles.valueText, { color: Colors.softCoral }]}>{lowValue}%</Text>
          </View>
          <AnimatedBar value={lowValue} color={Colors.softCoral} />
        </View>

        {footnote && <Text style={styles.footnote}>{footnote}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  title: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: Spacing.md,
  },
  barRow: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  valueText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(184,205,186,0.3)',
    borderRadius: 9999,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  footnote: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/CorrelationCard.tsx
git commit -m "feat(insights): add CorrelationCard component with animated bar comparison"
```

---

## Task 4: Create BrainStateDistribution Component

**Files:**
- Create: `src/components/insights/BrainStateDistribution.tsx`

- [ ] **Step 1: Create the component file**

```typescript
/**
 * BrainStateDistribution
 * Shows brain state distribution across the period with optional prior-period comparison.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { Layout } from '../../constants/spacing';

interface BrainStateDistributionProps {
  distribution: {
    state: 'Energized' | 'Clear' | 'Okay' | 'Foggy' | 'Wired';
    days: number;
    emoji: string;
  }[];
  totalDays: number;
  positiveStateDays: number;
  priorPositiveStateDays: number | null;
}

const STATE_COLORS: Record<string, string> = {
  Energized: Colors.evergreenTeal,
  Clear: Colors.silverSage,
  Okay: Colors.silverSage,
  Foggy: Colors.softCoral,
  Wired: Colors.sunriseAmber,
};

export const BrainStateDistribution: React.FC<BrainStateDistributionProps> = ({
  distribution,
  totalDays,
  positiveStateDays,
  priorPositiveStateDays,
}) => {
  const showUpChip = priorPositiveStateDays !== null && positiveStateDays > priorPositiveStateDays;

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionLabelRow}>
        <Icon name="circle-slice-8" size={Layout.iconSize.xs} color={Colors.evergreenTeal} />
        <Text style={styles.sectionLabel}>How you've been feeling</Text>
      </View>

      <View style={styles.card}>
        {distribution.map((item) => {
          const barWidthPct = totalDays > 0 ? (item.days / totalDays) * 100 : 0;
          const fillColor = STATE_COLORS[item.state] || Colors.silverSage;

          return (
            <View key={item.state} style={styles.stateRow}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.stateLabel}>{item.state}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidthPct}%`,
                      backgroundColor: fillColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayCount}>{item.days}d</Text>
            </View>
          );
        })}

        {priorPositiveStateDays !== null && (
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonText}>
              You spent {positiveStateDays} of {totalDays} days in Clear or Energized states
            </Text>
            {showUpChip && (
              <View style={styles.deltaChip}>
                <Text style={styles.deltaChipText}>{'\u2191'} vs last week</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    width: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  stateLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.softCharcoal,
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: 'rgba(184,205,186,0.2)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  barFill: {
    height: 16,
    borderRadius: 9999,
  },
  dayCount: {
    width: 32,
    textAlign: 'right',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  comparisonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  comparisonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  deltaChip: {
    backgroundColor: 'rgba(27,94,87,0.08)',
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  deltaChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/BrainStateDistribution.tsx
git commit -m "feat(insights): add BrainStateDistribution component"
```

---

## Task 5: Create WeekOverWeekSummary Component

**Files:**
- Create: `src/components/insights/WeekOverWeekSummary.tsx`

- [ ] **Step 1: Create the component file**

```typescript
/**
 * WeekOverWeekSummary
 * Shows 3 key metrics with week-over-week change indicators.
 * Replaces AtAGlanceCard on the Insights screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { Layout } from '../../constants/spacing';

interface WeekOverWeekMetric {
  value: number;
  label: string;
  delta: number;
  color: string;
}

interface WeekOverWeekSummaryProps {
  metrics: WeekOverWeekMetric[];
}

const DeltaIndicator: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta > 0) {
    return (
      <View style={[styles.deltaChip, { backgroundColor: 'rgba(27,94,87,0.08)' }]}>
        <Text style={[styles.deltaText, { color: Colors.evergreenTeal }]}>+{delta}</Text>
      </View>
    );
  }

  if (delta === 0) {
    return <Text style={[styles.deltaText, { color: Colors.mutedSageGray }]}>same</Text>;
  }

  // delta < 0
  const absDelta = Math.abs(delta);
  if (absDelta <= 1) {
    return <Text style={[styles.deltaText, { color: Colors.mutedSageGray }]}>-{absDelta}</Text>;
  }

  // Large decrease (> 1)
  return (
    <View style={[styles.deltaChip, { backgroundColor: 'rgba(217,122,110,0.08)' }]}>
      <Text style={[styles.deltaText, { color: Colors.softCoral }]}>-{absDelta}</Text>
    </View>
  );
};

export const WeekOverWeekSummary: React.FC<WeekOverWeekSummaryProps> = ({ metrics }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionLabelRow}>
        <Icon name="chart-line" size={Layout.iconSize.xs} color={Colors.evergreenTeal} />
        <Text style={styles.sectionLabel}>Compared to last week</Text>
      </View>

      <View style={styles.row}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <View style={styles.deltaContainer}>
              <DeltaIndicator delta={metric.delta} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(213,227,209,0.2)',
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.medium,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  deltaContainer: {
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  deltaChip: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/WeekOverWeekSummary.tsx
git commit -m "feat(insights): add WeekOverWeekSummary component replacing AtAGlanceCard"
```

---

## Task 6: Modify NarrativeRecap — Add Insight Chips

**Files:**
- Modify: `src/components/insights/NarrativeRecap.tsx`

- [ ] **Step 1: Update the interface and add chip rendering**

Replace the entire file content:

```typescript
/**
 * Narrative Recap
 * AI-driven weekly narrative — Vara's killer insight feature
 * Header: "What shaped your week"
 * Insufficient data fallback with warm message
 * Insight chips that scroll to correlation cards
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

interface CorrelationTag {
  label: string;
  anchor?: string;
}

interface NarrativeRecapProps {
  narrative: string | null;
  loading: boolean;
  timeframeLabel: string;
  hasInsufficientData?: boolean;
  correlationTags?: CorrelationTag[];
  onChipPress?: (anchor: string) => void;
  noCorrelationsMessage?: string;
}

const NarrativeRecap: React.FC<NarrativeRecapProps> = ({
  narrative,
  loading,
  timeframeLabel,
  hasInsufficientData = false,
  correlationTags,
  onChipPress,
  noCorrelationsMessage,
}) => {
  const showChips = correlationTags && correlationTags.length > 0;
  const narrativeText = noCorrelationsMessage
    ? `${narrative ?? ''} ${noCorrelationsMessage}`.trim()
    : narrative;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>What shaped your week</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Putting your week together...</Text>
        </View>
      ) : hasInsufficientData || !narrativeText ? (
        <Text style={styles.insufficientData}>
          More patterns will emerge as you use Vara this week.
        </Text>
      ) : (
        <>
          <Text style={styles.narrative}>{narrativeText}</Text>

          {showChips && (
            <>
              <View style={styles.divider} />
              <View style={styles.chipRow}>
                {correlationTags!.map((tag, index) => {
                  const isTappable = !!tag.anchor;
                  const ChipWrapper = isTappable ? TouchableOpacity : View;
                  return (
                    <ChipWrapper
                      key={index}
                      style={styles.chip}
                      {...(isTappable && {
                        onPress: () => onChipPress?.(tag.anchor!),
                        activeOpacity: 0.7,
                      })}
                    >
                      <Text style={styles.chipText}>{tag.label}</Text>
                    </ChipWrapper>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  insufficientData: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(184,205,186,0.3)',
    marginVertical: Spacing.base,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(27,94,87,0.06)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  chipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

export { NarrativeRecap };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/NarrativeRecap.tsx
git commit -m "feat(insights): add insight chips to NarrativeRecap for correlation anchoring"
```

---

## Task 7: Modify HabitHeatmap — Add Strongest Days Line

**Files:**
- Modify: `src/components/insights/HabitHeatmap.tsx`

- [ ] **Step 1: Add the `strongestDays` prop and insight line**

Update the interface (around line 33):

```typescript
interface HabitHeatmapProps {
  data: { date: string; count: number }[];
  totalHabits: number;
  daysToShow?: number;
  strongestDays?: string[] | null;
}
```

Update the component signature to accept the new prop (around line 44):

```typescript
export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  data,
  totalHabits,
  daysToShow = 30,
  strongestDays,
}) => {
```

Add the insight line computation inside the component, before the return statement:

```typescript
  const insightText = useMemo(() => {
    if (!strongestDays || strongestDays.length === 0) {
      return 'Your activity has been consistent across the week';
    }
    if (strongestDays.length === 1) {
      return `Your strongest day this month has been ${strongestDays[0]}`;
    }
    return `Your strongest days this month have been ${strongestDays[0]} and ${strongestDays[1]}`;
  }, [strongestDays]);
```

Add the insight line JSX after the legend `</View>` closing tag (after line 127):

```typescript
      {/* Insight line */}
      <Text style={styles.insightText}>{insightText}</Text>
```

Add the style to the StyleSheet:

```typescript
  insightText: {
    fontSize: 12,
    fontWeight: '400',
    color: VARA_COLORS.sageGray,
    marginTop: 8,
    textAlign: 'center',
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/HabitHeatmap.tsx
git commit -m "feat(insights): add strongest days insight line to HabitHeatmap"
```

---

## Task 8: Update Insights Component Barrel Export

**Files:**
- Modify: `src/components/insights/index.ts`

- [ ] **Step 1: Add new exports**

Add these lines to the existing file:

```typescript
export { CorrelationCard } from './CorrelationCard';
export { BrainStateDistribution } from './BrainStateDistribution';
export { WeekOverWeekSummary } from './WeekOverWeekSummary';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/insights/index.ts
git commit -m "chore(insights): export new insight widget components"
```

---

## Task 9: Wire Everything in InsightsScreen

**Files:**
- Modify: `src/screens/InsightsScreen.tsx`

This is the largest task. The screen needs to: derive correlation tags, compute strongest days, compute week-over-week metrics with prior-period data, manage scroll refs, and render widgets in the new order.

- [ ] **Step 1: Update imports**

Replace the import block at the top of InsightsScreen.tsx:

```typescript
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
} from '../components';
import { CorrelationCard } from '../components/insights/CorrelationCard';
import { BrainStateDistribution } from '../components/insights/BrainStateDistribution';
import { WeekOverWeekSummary } from '../components/insights/WeekOverWeekSummary';
import { Colors, Spacing, Typography } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { apiPost } from '../services/api/client';
import { getHabitCompletions } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
```

Note: `AtAGlanceCard` import is removed.

- [ ] **Step 2: Add scroll ref and prior-period data state**

Inside the component, after the existing state declarations (around line 50), add:

```typescript
  const scrollViewRef = useRef<ScrollView>(null);
  const correlationRefs = useRef<Record<string, number>>({});

  // Prior-period metrics for week-over-week comparison
  const [priorMetrics, setPriorMetrics] = useState<{
    activeDays: number;
    protocols: number;
    reflections: number;
  } | null>(null);
```

Update the destructuring of `useWeeklyCorrelations`:

```typescript
  const { correlations, brainStateDistribution } = useWeeklyCorrelations();
```

- [ ] **Step 3: Fetch prior-period data for WeekOverWeekSummary**

Add a new useEffect after the existing `loadAnalytics` effect to fetch prior 7-day metrics. Add this after the `loadAnalytics` useEffect (after line 141):

```typescript
  // Load prior-period metrics for week-over-week comparison
  useEffect(() => {
    const loadPriorMetrics = async () => {
      if (!user || !db || timeFrame !== 'week') {
        setPriorMetrics(null);
        return;
      }
      try {
        const end = new Date();
        end.setDate(end.getDate() - 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        const startTimestamp = start.getTime() / 1000;
        const endTimestamp = end.getTime() / 1000;

        // Prior habit completions
        const priorHabitDates = new Set<string>();
        for (const habit of habits) {
          const completions = await getHabitCompletions(habit.id);
          completions.forEach((c: any) => {
            const ts = new Date(c.date).getTime() / 1000;
            if (ts >= startTimestamp && ts <= endTimestamp) {
              priorHabitDates.add(c.date);
            }
          });
        }

        // Prior focus sessions
        let priorProtocols = 0;
        try {
          const focusQuery = query(
            collection(db, 'focusSessions'),
            where('userId', '==', user.uid),
            orderBy('startedAt', 'desc')
          );
          const focusSnapshot = await getDocs(focusQuery);
          priorProtocols = focusSnapshot.docs.filter((doc) => {
            const data = doc.data() as any;
            const sessionTime = data.startedAt?.seconds || 0;
            return data.completed && sessionTime >= startTimestamp && sessionTime <= endTimestamp;
          }).length;
        } catch {
          // Skip
        }

        // Prior journal entries
        let priorReflections = 0;
        try {
          const journalQuery = query(
            collection(db, 'journalEntries'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const journalSnapshot = await getDocs(journalQuery);
          priorReflections = journalSnapshot.docs.filter((doc) => {
            const data = doc.data() as any;
            const entryTime = data.createdAt?.seconds || 0;
            return entryTime >= startTimestamp && entryTime <= endTimestamp;
          }).length;
        } catch {
          // Skip
        }

        setPriorMetrics({
          activeDays: priorHabitDates.size,
          protocols: priorProtocols,
          reflections: priorReflections,
        });
      } catch {
        setPriorMetrics(null);
      }
    };

    if (!habitsLoading) {
      loadPriorMetrics();
    }
  }, [user, habits, habitsLoading, timeFrame]);
```

- [ ] **Step 4: Add derived data computations**

After the existing `hasInsufficientData` useMemo, add:

```typescript
  // Derive correlation tags for NarrativeRecap chips
  const insightCorrelations = correlations?.insightCorrelations ?? [];
  const correlationTags = useMemo(() => {
    return insightCorrelations.map((c) => ({
      label: c.title,
      anchor: c.id,
    }));
  }, [insightCorrelations]);

  // No-correlations message for narrative
  const noCorrelationsMessage = useMemo(() => {
    if (insightCorrelations.length === 0 && !hasInsufficientData) {
      return 'Still gathering patterns \u2014 keep checking in and your insights will get more specific.';
    }
    return undefined;
  }, [insightCorrelations, hasInsufficientData]);

  // Compute strongest days for HabitHeatmap
  const strongestDays = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals: Record<string, number[]> = {};

    for (const item of heatmapData) {
      const dayName = dayNames[new Date(item.date).getDay()];
      if (!dayTotals[dayName]) dayTotals[dayName] = [];
      dayTotals[dayName].push(item.count);
    }

    const dayAverages = Object.entries(dayTotals).map(([day, counts]) => ({
      day,
      avg: counts.reduce((a, b) => a + b, 0) / counts.length,
    }));

    if (dayAverages.length < 2) return null;

    const overallAvg = dayAverages.reduce((sum, d) => sum + d.avg, 0) / dayAverages.length;
    const threshold = overallAvg * 1.2;

    const qualifying = dayAverages
      .filter(d => d.avg > threshold)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 2)
      .map(d => d.day);

    return qualifying.length > 0 ? qualifying : null;
  }, [heatmapData]);

  // Compute WeekOverWeekSummary metrics
  const weekOverWeekMetrics = useMemo(() => {
    const daysActiveDelta = priorMetrics ? metrics.activeDays - priorMetrics.activeDays : 0;
    const protocolsDelta = priorMetrics ? metrics.protocolsCompleted - priorMetrics.protocols : 0;
    const reflectionsDelta = priorMetrics ? metrics.reflections - priorMetrics.reflections : 0;

    return [
      {
        value: metrics.activeDays,
        label: 'Days active',
        delta: daysActiveDelta,
        color: Colors.evergreenTeal,
      },
      {
        value: metrics.protocolsCompleted,
        label: 'Protocols',
        delta: protocolsDelta,
        color: Colors.evergreenTeal,
      },
      {
        value: metrics.reflections,
        label: 'Reflections',
        delta: reflectionsDelta,
        color: Colors.goldenApricot,
      },
    ];
  }, [metrics, priorMetrics]);

  // Scroll handler for insight chip taps
  const handleChipPress = useCallback((anchor: string) => {
    const yOffset = correlationRefs.current[anchor];
    if (yOffset != null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
    }
  }, []);
```

- [ ] **Step 5: Update the render section**

Replace the `<ScrollView>` content section (the part after the filter section, inside the `isEmpty ? ... : <>` block). Replace from `{/* Widget 1: AI Narrative */}` through the closing `</>`:

```typescript
          <>
            {/* Widget 1: NarrativeRecap with insight chips */}
            <NarrativeRecap
              narrative={aiNarrative}
              loading={narrativeLoading}
              timeframeLabel={timeFrame === 'week' ? 'This Week' : 'This Month'}
              hasInsufficientData={hasInsufficientData}
              correlationTags={correlationTags}
              onChipPress={handleChipPress}
              noCorrelationsMessage={noCorrelationsMessage}
            />

            {/* Widget 2: Primary CorrelationCard */}
            {insightCorrelations.length >= 1 && (
              <View
                onLayout={(e) => {
                  correlationRefs.current[insightCorrelations[0].id] = e.nativeEvent.layout.y;
                }}
              >
                <CorrelationCard
                  title={insightCorrelations[0].title}
                  highConditionLabel={insightCorrelations[0].highConditionLabel}
                  lowConditionLabel={insightCorrelations[0].lowConditionLabel}
                  highValue={insightCorrelations[0].highValue}
                  lowValue={insightCorrelations[0].lowValue}
                  footnote={insightCorrelations[0].footnote}
                  isPrimary
                  anchorKey={insightCorrelations[0].id}
                />
              </View>
            )}

            {/* Widget 3: Secondary CorrelationCard */}
            {insightCorrelations.length >= 2 && (
              <View
                onLayout={(e) => {
                  correlationRefs.current[insightCorrelations[1].id] = e.nativeEvent.layout.y;
                }}
              >
                <CorrelationCard
                  title={insightCorrelations[1].title}
                  highConditionLabel={insightCorrelations[1].highConditionLabel}
                  lowConditionLabel={insightCorrelations[1].lowConditionLabel}
                  highValue={insightCorrelations[1].highValue}
                  lowValue={insightCorrelations[1].lowValue}
                  footnote={insightCorrelations[1].footnote}
                  anchorKey={insightCorrelations[1].id}
                />
              </View>
            )}

            {/* Widget 4: Brain State Distribution */}
            {brainStateDistribution && (
              <BrainStateDistribution {...brainStateDistribution} />
            )}

            {/* Widget 5: 30-day Habit Heatmap */}
            <HabitHeatmap
              data={heatmapData}
              totalHabits={habits.length}
              daysToShow={30}
              strongestDays={strongestDays}
            />

            {/* Widget 6: Week Over Week Summary */}
            <WeekOverWeekSummary metrics={weekOverWeekMetrics} />
          </>
```

Also update the `<ScrollView>` to include the ref:

```typescript
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
```

- [ ] **Step 6: Remove VARA_COLORS.tealMid since it's no longer used**

The `VARA_COLORS` object at the top of the file was used for `tealMid` by AtAGlanceCard. Since AtAGlanceCard is removed, clean up by removing `tealMid` from the object:

```typescript
const VARA_COLORS = {
  teal: '#1B5E57',
  apricot: '#F5B971',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
};
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/InsightsScreen.tsx
git commit -m "feat(insights): wire all insight widgets with correlation ranking, scroll anchors, and week-over-week data"
```

---

## Task 10: Verify Build and Manual Testing

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compilation check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: No type errors. If there are errors, fix them (most likely will be the `DailyDataPoint` interface change rippling through).

- [ ] **Step 2: Run the app in development**

```bash
cd mobile && npx expo start
```

Navigate to the Insights screen. Verify:
1. NarrativeRecap renders with chips when correlation data exists
2. Tapping a chip smooth-scrolls to the matching CorrelationCard
3. Primary CorrelationCard shows "Strongest pattern" label
4. Secondary CorrelationCard has no section label
5. BrainStateDistribution renders all 5 states with bars
6. BrainStateDistribution shows up-chip only when improved (no down indicator)
7. HabitHeatmap shows strongest days line below legend
8. WeekOverWeekSummary shows 3 metrics with correct delta styling
9. AtAGlanceCard is gone
10. Bar fill animations are smooth 400ms ease
11. Widgets degrade gracefully with insufficient data

- [ ] **Step 3: Test edge cases**

- No brain state check-ins → BrainStateDistribution should not render
- No correlations meeting 15-point threshold → No CorrelationCards, narrative shows "Still gathering patterns" message, no chips
- Week/month toggle → CorrelationCards, BrainStateDistribution, WeekOverWeekSummary respond to week selection; Heatmap always 30 days
- Brand new user with no data → Empty state still shows correctly

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(insights): address any build or rendering issues from widget integration"
```
