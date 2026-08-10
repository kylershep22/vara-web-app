/**
 * The day a user's week starts. Seven chips, one tap, no descriptions.
 *
 * NOT V3OptionRow. That control requires a `description` per row because the
 * outcome and capacity choices are unanswerable without one. A weekday needs no
 * gloss — "Monday" explains itself — and seven stacked rows with invented
 * supporting copy would be a scrolling form for a one-tap question. Chips keep
 * the whole choice on screen at once, which is what makes it calm.
 *
 * Visual contract mirrors V3OptionRow so the two read as the same family: white
 * default with a Silver Sage border, Dew Sage wash plus an Evergreen Teal border
 * when selected. Wraps to two rows on a phone rather than shrinking below the
 * touch target.
 *
 * PRESENTATIONAL ONLY. It does not persist: both mount points (the onboarding
 * step and the weekly open) own their own write, and a control that saved as a
 * side effect of being rendered would be a surprise in the onboarding arc, where
 * nothing is written until the terminal.
 *
 * Indexes are 0 = Sunday … 6 = Saturday, matching `userPrivate.weekStartDay`,
 * so nothing between this control and Firestore has to convert.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { withAlpha } from '../dashboard/brainStateCheckin/colorUtils';
import {
  WEEKDAY_INDEXES,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
} from '../../utils/weekdayLabels';

const MIN_TOUCH_TARGET = 48;

export interface WeekStartPickerProps {
  /** 0 = Sunday … 6 = Saturday. Null when nothing is chosen yet. */
  value: number | null;
  onChange: (day: number) => void;
  /** Prefix for each chip's testID, e.g. `v3-weekstart` -> `v3-weekstart-0`. */
  testIDPrefix?: string;
}

export const WeekStartPicker: React.FC<WeekStartPickerProps> = ({
  value,
  onChange,
  testIDPrefix = 'weekstart',
}) => (
  <View style={styles.row} accessibilityRole="radiogroup">
    {WEEKDAY_INDEXES.map((day) => {
      const selected = value === day;
      return (
        <TouchableOpacity
          key={day}
          onPress={() => onChange(day)}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          // The FULL name, never the abbreviation: "Wed" is what the eye needs
          // and "Wednesday" is what a screen reader should say.
          accessibilityLabel={WEEKDAY_NAMES[day]}
          testID={`${testIDPrefix}-${day}`}
          style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
        >
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {WEEKDAY_SHORT_NAMES[day]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET + Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: Colors.white,
    borderColor: Colors.silverSage,
  },
  chipSelected: {
    backgroundColor: withAlpha(Colors.dewSage, 0.45),
    borderColor: Colors.evergreenTeal,
  },
  label: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  labelSelected: {
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default WeekStartPicker;
