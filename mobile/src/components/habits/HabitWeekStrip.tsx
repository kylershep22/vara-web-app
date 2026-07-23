// HabitWeekStrip — the current week for ONE habit.
//
// The dashboard's WeeklyHabitGrid answers "am I actually doing these?" across
// four habits. This answers the same question for the one habit the user opened,
// and it answers it with the SAME marks: habitWeekState decides each cell's
// state, habitCellMarks draws it. Nothing about consistency is re-decided here.
//
// Only today is interactive, and it toggles the same completion the "Complete
// today" button does — two affordances, one state. Past cells are plain Views,
// so no past date can reach the handler at all.

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import {
  cellAccessibilityLabel,
  cellState,
  currentWeek,
  isTappable,
  resolveWeekStart,
  scheduledWeekdays,
} from '../dashboard/habitWeekState';
import { DEW_BAND, Mark } from '../dashboard/habitCellMarks';
import type { Habit } from '../../types/models';

const DAY_COL_PCT = 100 / 7;

interface HabitWeekStripProps {
  habit: Habit;
  /** Every completion date key (YYYY-MM-DD) for this habit. */
  completions: string[];
  /** Called only ever with TODAY's date. */
  onToggleToday: (date: string) => void;
  /** True while a write is in flight; today's cell is inert meanwhile. */
  processing?: boolean;
  /** Injectable for tests; defaults to now. */
  now?: Date;
}

export const HabitWeekStrip: React.FC<HabitWeekStripProps> = ({
  habit,
  completions,
  onToggleToday,
  processing = false,
  now,
}) => {
  const week = useMemo(() => currentWeek(now ?? new Date(), resolveWeekStart()), [now]);
  const scheduled = useMemo(() => scheduledWeekdays(habit), [habit]);
  const done = useMemo(() => new Set(completions), [completions]);
  const todayIndex = week.findIndex((d) => d.tense === 'today');

  return (
    <View style={styles.body} testID="habit-week-strip">
      {/* Today band — orientation only. Absolutely positioned so it is unbroken
          down the column; the columns are fixed percentages precisely so its
          offset is arithmetic and needs no onLayout measurement. */}
      {todayIndex >= 0 && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="habit-week-strip-today-band"
          style={[
            styles.todayBand,
            { left: `${todayIndex * DAY_COL_PCT}%`, width: `${DAY_COL_PCT}%` },
          ]}
        />
      )}

      {/* Structural axis labels, not evaluative text. Hidden from screen
          readers because every cell below already speaks its own day. */}
      <View
        style={styles.headerRow}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {week.map((day) => (
          <View key={day.dateKey} style={styles.headerCell}>
            <Text style={styles.headerLabel}>{day.dayName.charAt(0)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cellRow}>
        {week.map((day) => {
          const completed = done.has(day.dateKey);
          const state = cellState({
            scheduled: scheduled.has(day.weekday),
            completed,
            tense: day.tense,
          });
          const label = cellAccessibilityLabel(day, state);
          const mark = <Mark state={state} completed={completed} />;

          if (!isTappable(day.tense)) {
            return (
              <View
                key={day.dateKey}
                style={styles.cell}
                accessible
                accessibilityLabel={label}
                testID={`habit-week-cell-${day.dateKey}`}
              >
                {mark}
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={day.dateKey}
              style={styles.cell}
              onPress={() => onToggleToday(day.dateKey)}
              disabled={processing}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: completed, disabled: processing }}
              accessibilityLabel={label}
              testID={`habit-week-cell-${day.dateKey}`}
              activeOpacity={0.7}
            >
              {mark}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Anchors the absolutely-positioned today band.
  body: {
    position: 'relative',
  },
  todayBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: DEW_BAND,
    borderRadius: Layout.borderRadius.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerCell: {
    width: `${DAY_COL_PCT}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  cellRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    width: `${DAY_COL_PCT}%`,
    // 48px minimum touch target, per the accessibility standard.
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HabitWeekStrip;
