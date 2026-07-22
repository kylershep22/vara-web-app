// WeeklyHabitGrid — the dashboard's weekly habit surface.
//
// Shows the user their own consistency for the current week so they can answer
// "am I actually doing this?" (Voice & Tone v2.2 §3.4, Accountability
// Amendment). Accountability, not surveillance and not shame:
//
//   - No streak, count, percentage, score, or rate anywhere in or beside the
//     grid. The dots carry the information. Habit names are the only text, and
//     they exist because tapping one opens that habit.
//   - Never coral, red, or amber. A missed day is not an error. The only colors
//     here are Evergreen Teal and Silver Sage.
//   - Every state differs by FORM (disc / ring / line / size), not only by hue,
//     per the accessibility standard — and the screen-reader labels say the
//     states in words.
//   - No celebration on check-off: a 150ms ease-out crossfade, nothing more,
//     and nothing at all under Reduce Motion.
//
// Days the habit was never scheduled for are drawn as a hairline dash, not a
// paler dot. A paler dot reads as "extra missed", which would render a perfect
// Mon/Wed/Fri week as 3-of-7. See habitWeekState.ts for the state rules.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Habit } from '../../types/models';
import {
  cellAccessibilityLabel,
  cellState,
  currentWeek,
  isTappable,
  resolveWeekStart,
  scheduledWeekdays,
  type CellState,
  type WeekDay,
} from './habitWeekState';

/** Rows shown on the dashboard. The rest live on the Time tab. */
export const MAX_ROWS = 4;

interface WeeklyHabitGridProps {
  /** Active habits, in the order they should appear (newest first, as loaded). */
  habits: Habit[];
  /** habitId → every completion date (YYYY-MM-DD) for that habit. */
  completionsByHabit: Record<string, string[]>;
  /** habitId → date → completed. Optimistic; wins over completionsByHabit. */
  optimisticCompletions?: Record<string, Record<string, boolean>>;
  /** In-flight `${habitId}-${date}` keys. */
  processingHabits?: Set<string>;
  /** Called only ever with TODAY's date — past dates never reach it. */
  onCompleteToday: (habitId: string, date: string) => void;
  onOpenHabit: (habit: Habit) => void;
  onViewAll: () => void;
  /** Injectable for tests; defaults to now. */
  now?: Date;
}

export const WeeklyHabitGrid: React.FC<WeeklyHabitGridProps> = ({
  habits,
  completionsByHabit,
  optimisticCompletions,
  processingHabits,
  onCompleteToday,
  onOpenHabit,
  onViewAll,
  now,
}) => {
  const week = useMemo(
    () => currentWeek(now ?? new Date(), resolveWeekStart()),
    [now]
  );

  // No habits — render nothing rather than an empty grid or a prompt to start.
  if (habits.length === 0) return null;

  const rows = habits.slice(0, MAX_ROWS);
  const hasMore = habits.length > rows.length;

  return (
    <View style={styles.card} testID="weekly-habit-grid">
      {rows.map((habit) => (
        <HabitRow
          key={habit.id}
          habit={habit}
          week={week}
          completions={completionsByHabit[habit.id] ?? []}
          optimistic={optimisticCompletions?.[habit.id]}
          processingHabits={processingHabits}
          onCompleteToday={onCompleteToday}
          onOpenHabit={onOpenHabit}
        />
      ))}

      {hasMore && (
        // Deliberately no count of what is hidden — a number here would be a
        // score by another name.
        <TouchableOpacity
          onPress={onViewAll}
          accessibilityRole="button"
          accessibilityLabel="View all habits"
          testID="weekly-habit-grid-view-all"
          style={styles.viewAll}
        >
          <Text style={styles.viewAllLabel}>View all habits ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── row ──────────────────────────────────────────────────────────────

const HabitRow: React.FC<{
  habit: Habit;
  week: WeekDay[];
  completions: string[];
  optimistic?: Record<string, boolean>;
  processingHabits?: Set<string>;
  onCompleteToday: (habitId: string, date: string) => void;
  onOpenHabit: (habit: Habit) => void;
}> = ({
  habit,
  week,
  completions,
  optimistic,
  processingHabits,
  onCompleteToday,
  onOpenHabit,
}) => {
  const scheduled = useMemo(() => scheduledWeekdays(habit), [habit]);
  const done = useMemo(() => new Set(completions), [completions]);

  return (
    <View style={styles.row} testID={`weekly-habit-row-${habit.id}`}>
      <TouchableOpacity
        style={styles.nameColumn}
        onPress={() => onOpenHabit(habit)}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, open habit`}
        testID={`weekly-habit-name-${habit.id}`}
      >
        <Text style={styles.name} numberOfLines={2}>
          {habit.name}
        </Text>
      </TouchableOpacity>

      {week.map((day) => {
        const completed = optimistic?.[day.dateKey] ?? done.has(day.dateKey);
        const state = cellState({
          scheduled: scheduled.has(day.weekday),
          completed,
          tense: day.tense,
        });

        return (
          <Cell
            key={day.dateKey}
            habitId={habit.id}
            day={day}
            state={state}
            completed={completed}
            processing={processingHabits?.has(`${habit.id}-${day.dateKey}`) ?? false}
            onCompleteToday={onCompleteToday}
          />
        );
      })}
    </View>
  );
};

// ── cell ─────────────────────────────────────────────────────────────

const Cell: React.FC<{
  habitId: string;
  day: WeekDay;
  state: CellState;
  completed: boolean;
  processing: boolean;
  onCompleteToday: (habitId: string, date: string) => void;
}> = ({ habitId, day, state, completed, processing, onCompleteToday }) => {
  const label = cellAccessibilityLabel(day, state);
  const mark = <Mark state={state} completed={completed} />;

  // Past and future cells are inert: they are plain Views, so no past date can
  // reach the completion handler at all. Inertness is structural, not a guard
  // inside an onPress that would otherwise fire.
  if (!isTappable(day.tense)) {
    return (
      <View
        style={styles.cell}
        accessible
        accessibilityLabel={label}
        testID={`weekly-habit-cell-${habitId}-${day.dateKey}`}
      >
        {mark}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => onCompleteToday(habitId, day.dateKey)}
      disabled={processing}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed, disabled: processing }}
      accessibilityLabel={label}
      testID={`weekly-habit-cell-${habitId}-${day.dateKey}`}
      // The columns are narrower than 48px on a phone, so the touch target is
      // extended past the visual mark to clear the 48px minimum.
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      {mark}
    </TouchableOpacity>
  );
};

/**
 * The mark itself. Completed crossfades over the state it replaced (150ms
 * ease-out, disabled under Reduce Motion) — a calm state change, not a
 * celebration.
 */
const Mark: React.FC<{ state: CellState; completed: boolean }> = ({
  state,
  completed,
}) => {
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    const to = completed ? 1 : 0;
    if (reduceMotion) {
      anim.setValue(to);
      return;
    }
    Animated.timing(anim, {
      toValue: to,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [completed, reduceMotion, anim]);

  // The testID names the FORM that is on screen, so tests can assert the
  // rendered treatment of each state rather than trusting the state name.
  return (
    <View style={styles.mark}>
      {!completed && <View style={markStyleFor(state)} testID={`mark-${state}`} />}
      {completed && (
        <Animated.View
          style={[styles.completedDot, { opacity: anim }]}
          testID="mark-completed"
        />
      )}
    </View>
  );
};

function markStyleFor(state: CellState) {
  switch (state) {
    case 'gap':
      return styles.gapDot;
    case 'today_scheduled':
      return styles.todayRing;
    case 'today_unscheduled':
      return styles.todayDashedRing;
    case 'upcoming':
      return styles.upcomingDot;
    case 'unscheduled':
      return styles.unscheduledDash;
    case 'completed':
      // Unreachable — completed renders the animated dot above.
      return styles.completedDotStatic;
  }
}

// Silver Sage (#B8CDBA) at explicit alphas. Written as rgba rather than an
// opacity prop so the values are legible and cannot compound with a parent.
const SAGE_GAP = 'rgba(184, 205, 186, 0.45)';
const SAGE_UPCOMING = 'rgba(184, 205, 186, 0.22)';
const SAGE_DASH = 'rgba(184, 205, 186, 0.55)';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Layout.shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  nameColumn: {
    flex: 1.5,
    minWidth: 72,
    paddingRight: Spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  name: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  cell: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed box so every mark is optically centred regardless of its size.
  mark: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── the five states, each a distinct FORM ──────────────────────────
  // Completed: the largest solid disc, and the only teal fill.
  completedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.evergreenTeal,
  },
  completedDotStatic: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.evergreenTeal,
  },
  // Scheduled, past, not completed — the honest gap. A mid-size sage disc.
  gapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SAGE_GAP,
  },
  // Scheduled, future — smaller and fainter than the gap, so the two differ by
  // size as well as by tone.
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SAGE_UPCOMING,
  },
  // Scheduled, today — a hollow teal ring. Open, not filled: an invitation.
  todayRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
    backgroundColor: 'transparent',
  },
  // Not scheduled, today — a dashed hollow ring. Discoverable, but visibly not
  // asked for: it must not read as a to-do.
  todayDashedRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.silverSage,
    backgroundColor: 'transparent',
  },
  // Not scheduled — NOT a dot. A hairline dash: a different form entirely, so
  // it can never be read as one more missed day.
  unscheduledDash: {
    width: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: SAGE_DASH,
  },

  viewAll: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
