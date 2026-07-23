// HabitFourWeekView — the four weeks before this one, stacked.
//
// FIXED AT FOUR WEEKS, permanently. It does not grow with habit age and does
// not scroll horizontally: a habit two years old renders exactly these four
// rows. Longer history belongs in Look Back.
//
// TWO STATES, not three, and the reason matters. Habit schedules live on the
// mutable habit document with no history (see habitWeekState.ts), so a habit
// switched from daily to Mon/Wed/Fri last week would have four days a week
// retroactively repainted as "scheduled and missed" for every earlier week —
// gaps the user never actually had. So past weeks distinguish only what we can
// know for certain:
//
//   completed  → an 11px Evergreen Teal dot
//   everything else → a hairline dash, the same form the week strip uses for a
//                     day the habit was never asked about
//
// The three-state treatment (including the scheduled-not-completed dot) applies
// only to the CURRENT week, in HabitWeekStrip, where the schedule on the habit
// is the schedule that was actually in force.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Typography, Spacing } from '../../constants';
import { resolveWeekStart } from '../dashboard/habitWeekState';
import { SAGE_DASH } from '../dashboard/habitCellMarks';
import { HISTORY_WEEKS, pastWeeks, weekdayNames } from './habitHistory';

const LABEL_COL_PCT = 26;
const DAY_COL_PCT = (100 - LABEL_COL_PCT) / 7;

interface HabitFourWeekViewProps {
  /** Every completion date key (YYYY-MM-DD) for this habit. */
  completions: string[];
  /** Injectable for tests; defaults to now. */
  now?: Date;
}

export const HabitFourWeekView: React.FC<HabitFourWeekViewProps> = ({
  completions,
  now,
}) => {
  const weekStartsOn = useMemo(() => resolveWeekStart(), []);
  const weeks = useMemo(
    () => pastWeeks(now ?? new Date(), weekStartsOn, HISTORY_WEEKS),
    [now, weekStartsOn]
  );
  const dayNames = useMemo(() => weekdayNames(weekStartsOn), [weekStartsOn]);
  const done = useMemo(() => new Set(completions), [completions]);

  return (
    <View testID="habit-four-week-view">
      {/* Column letters, in the same order as the week strip above. Hidden from
          screen readers: every cell speaks its own day. */}
      <View
        style={styles.headerRow}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.labelSpacer} />
        {dayNames.map((name, i) => (
          <View key={`${name}-${i}`} style={styles.headerCell}>
            <Text style={styles.headerLabel}>{name.charAt(0)}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week.label} style={styles.row} testID={`habit-history-row-${week.label}`}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {week.label}
          </Text>

          {week.dateKeys.map((dateKey, i) => {
            const completed = done.has(dateKey);
            return (
              <View
                key={dateKey}
                style={styles.cell}
                accessible
                // "no completion recorded", never "missed": with no schedule
                // history we do not know the habit was asked for that day.
                accessibilityLabel={
                  completed
                    ? `${dayNames[i]}, completed`
                    : `${dayNames[i]}, no completion recorded`
                }
                testID={`habit-history-cell-${dateKey}`}
              >
                {completed ? (
                  <View style={styles.completedDot} testID="history-mark-completed" />
                ) : (
                  <View style={styles.emptyDash} testID="history-mark-empty" />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelSpacer: {
    width: `${LABEL_COL_PCT}%`,
  },
  headerCell: {
    width: `${DAY_COL_PCT}%`,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // Roomy enough to read as four distinct weeks, short enough that the whole
    // month reads as one shape.
    height: 28,
  },
  rowLabel: {
    width: `${LABEL_COL_PCT}%`,
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  cell: {
    width: `${DAY_COL_PCT}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.evergreenTeal,
  },
  // Not a paler dot: a different FORM, so it can never be read as a missed day.
  emptyDash: {
    width: 8,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: SAGE_DASH,
  },
});

export default HabitFourWeekView;
