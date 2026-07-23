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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { CardHeading } from './CardHeading';
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

/** The card's own title. Not a count, not a status — just what the card is. */
export const CARD_TITLE = 'This week';

// Fixed percentage columns rather than flex. This is what lets the today band
// be positioned arithmetically instead of measured (see the band, below), and
// it gives the name column the width it needs so habit names stop wrapping into
// uneven row heights.
const NAME_COL_PCT = 32;
const DAY_COL_PCT = (100 - NAME_COL_PCT) / 7;

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
  /** Empty-state CTA. Same destination as onViewAll, different affordance. */
  onAddHabit: () => void;
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
  onAddHabit,
  now,
}) => {
  const week = useMemo(
    () => currentWeek(now ?? new Date(), resolveWeekStart()),
    [now]
  );

  // No habits — the card holds its place with a plain description of what the
  // space is for. No day-of-week header: there is no grid to label yet.
  //
  // The copy states what the surface does; it does not tell the user what they
  // have failed to do. No "you haven't", and no "yet", which turns an empty
  // surface into a deficit. Someone who has never made a habit is not behind.
  if (habits.length === 0) {
    return (
      <View style={styles.card} testID="weekly-habit-grid-empty">
        {/* The title renders in BOTH states: a card whose identity changes with
            its data is the orphaning problem this header fixes. */}
        <CardHeading
          icon="calendar-blank-outline"
          title={CARD_TITLE}
          style={styles.heading}
          titleTestID="weekly-habit-grid-title"
        />
        {/* PROVISIONAL COPY — pending the copy pass. */}
        <Text style={styles.emptyBody}>
          Habits show up here, a week at a time.
        </Text>
        <TouchableOpacity
          onPress={onAddHabit}
          accessibilityRole="button"
          accessibilityLabel="Add a habit"
          testID="weekly-habit-grid-add"
          style={styles.emptyCta}
        >
          <Text style={styles.emptyCtaLabel}>Add a habit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rows = habits.slice(0, MAX_ROWS);
  const todayIndex = week.findIndex((d) => d.tense === 'today');

  return (
    <View style={styles.card} testID="weekly-habit-grid">
      <CardHeading
        icon="calendar-blank-outline"
        title={CARD_TITLE}
        style={styles.heading}
        titleTestID="weekly-habit-grid-title"
      />

      {/* Relative wrapper so the today band can span the header letter and every
          row cell as one continuous shape. It stops here, above the view-all
          row, which sits outside the grid body. */}
      <View style={styles.gridBody}>
        {/* Today band — orientation only, no meaning beyond "this is today".
            Absolutely positioned rather than per-cell so it is unbroken down the
            column; the columns are fixed percentages (not flex) precisely so its
            offset is arithmetic, needing no onLayout measurement — which would
            never fire under test and would pop a frame late on device.
            pointerEvents="none" keeps it clear of the cells' touch targets. */}
        {todayIndex >= 0 && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="weekly-habit-grid-today-band"
            style={[
              styles.todayBand,
              {
                left: `${NAME_COL_PCT + todayIndex * DAY_COL_PCT}%`,
                width: `${DAY_COL_PCT}%`,
              },
            ]}
          />
        )}

        {/* Column headers. Structural axis labels, not evaluative text — the
            no-text rule targets counts, scores, streaks, and percentages. Hidden
            from screen readers because every cell already speaks its own day
            ("Monday, completed"), so reading the letters first would just be
            seven meaningless characters ahead of the grid. */}
        <View
          style={styles.headerRow}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="weekly-habit-grid-header"
        >
          <View style={styles.headerNameSpacer} />
          {week.map((day) => (
            <View key={day.dateKey} style={styles.headerCell}>
              <Text style={styles.headerLabel}>{day.dayName.charAt(0)}</Text>
            </View>
          ))}
        </View>

        {rows.map((habit, index) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            week={week}
            completions={completionsByHabit[habit.id] ?? []}
            optimistic={optimisticCompletions?.[habit.id]}
            processingHabits={processingHabits}
            onCompleteToday={onCompleteToday}
            onOpenHabit={onOpenHabit}
            // No rule above the first row. Dividers paint OVER the band; at 35%
            // they read as a faint line crossing a continuous tint, which is
            // calmer than insetting the rule and breaking it.
            divided={index > 0}
          />
        ))}
      </View>

      {/* Always present in the populated card: this is the route into the
          Habits tab, not merely an overflow affordance. It renders identically
          whether or not habits are hidden — and still names no count, which
          would be a score by another name. The empty state omits it; it has its
          own "Add a habit" CTA. */}
      <TouchableOpacity
        onPress={onViewAll}
        accessibilityRole="button"
        accessibilityLabel="View all habits"
        testID="weekly-habit-grid-view-all"
        style={styles.viewAll}
      >
        <Text style={styles.viewAllLabel}>View all habits ›</Text>
      </TouchableOpacity>
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
  divided: boolean;
}> = ({
  habit,
  week,
  completions,
  optimistic,
  processingHabits,
  onCompleteToday,
  onOpenHabit,
  divided,
}) => {
  const scheduled = useMemo(() => scheduledWeekdays(habit), [habit]);
  const done = useMemo(() => new Set(completions), [completions]);

  return (
    <View
      style={[styles.row, divided && styles.rowDivided]}
      testID={`weekly-habit-row-${habit.id}`}
    >
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
        >
          {/* Decorative only. The cell already announces "completed", so this
              glyph is hidden from the a11y tree and adds no label of its own. */}
          <Icon
            name="check"
            size={12}
            color={Colors.white}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="mark-completed-check"
          />
        </Animated.View>
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
/** Silver Sage @35% — row dividers and the view-all rule. */
const SAGE_RULE = 'rgba(184, 205, 186, 0.35)';
/** Dew Sage (#D5E3D1) @42% — the today column band. */
const DEW_BAND = 'rgba(213, 227, 209, 0.42)';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    // 14 vertical / 16 horizontal. The old uniform 24 left the card looking
    // like it had failed to load below the last row.
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    ...Layout.shadow.sm,
  },
  heading: {
    marginBottom: Spacing.sm,
  },
  // Anchors the absolutely-positioned today band.
  gridBody: {
    position: 'relative',
  },
  todayBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: DEW_BAND,
    borderRadius: Layout.borderRadius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: SAGE_RULE,
  },
  // Mirrors the row's column widths exactly so the letters sit over their days.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  headerNameSpacer: {
    width: `${NAME_COL_PCT}%`,
    paddingRight: Spacing.sm,
  },
  headerCell: {
    width: `${DAY_COL_PCT}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: Typography.fontSize.xs, // 12px caption
    color: Colors.mutedSageGray,
  },
  nameColumn: {
    width: `${NAME_COL_PCT}%`,
    paddingRight: Spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  name: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: 18,
  },
  cell: {
    width: `${DAY_COL_PCT}%`,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed box so every mark is optically centred regardless of its size.
  mark: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── the five states, each a distinct FORM ──────────────────────────
  // Completed: the largest solid disc, the only teal fill, and the only mark
  // carrying a glyph. It was previously the QUIETEST mark on the card — the
  // single most important thing to see was the hardest to see.
  completedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDotStatic: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
    backgroundColor: 'transparent',
  },
  // Not scheduled, today — a dashed hollow ring. Discoverable, but visibly not
  // asked for: it must not read as a to-do.
  todayDashedRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
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

  emptyBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyCtaLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  viewAll: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: SAGE_RULE,
    // Full-width rule inside the card padding; the label itself stays left.
    alignItems: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
