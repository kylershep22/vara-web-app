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
//   completed       → an 11px Evergreen Teal dot
//   everything else → a small, faint neutral dot
//
// That second mark is NOT the strip's hairline dash. The dash means one thing
// in this vocabulary — the habit was never asked about that day — and this view
// cannot claim that, because it does not know what was asked. Borrowing the
// dash would give one mark two meanings on a single screen. It is a distinct
// token (SAGE_HISTORY_EMPTY), sized and toned apart from the strip's gap dot,
// which is the mark that does mean "asked, and it didn't happen".
//
// The three-state treatment (including the scheduled-not-completed dot) applies
// only to the CURRENT week, in HabitWeekStrip, where the schedule on the habit
// is the schedule that was actually in force.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Typography, Spacing } from '../../constants';
import { resolveWeekStart } from '../dashboard/habitWeekState';
import {
  HISTORY_COMPLETED_SIZE,
  HISTORY_EMPTY_SIZE,
  SAGE_HISTORY_EMPTY,
} from '../dashboard/habitCellMarks';
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
                  <View style={styles.emptyDot} testID="history-mark-empty" />
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
    width: HISTORY_COMPLETED_SIZE,
    height: HISTORY_COMPLETED_SIZE,
    borderRadius: HISTORY_COMPLETED_SIZE / 2,
    backgroundColor: Colors.evergreenTeal,
  },
  // A dot, not the strip's dash: the dash is spoken for. Less than half the
  // completed mark's diameter and a third of full sage, so a month of quiet
  // days reads as quiet rather than as a row of marks against the user.
  emptyDot: {
    width: HISTORY_EMPTY_SIZE,
    height: HISTORY_EMPTY_SIZE,
    borderRadius: HISTORY_EMPTY_SIZE / 2,
    backgroundColor: SAGE_HISTORY_EMPTY,
  },
});

export default HabitFourWeekView;
