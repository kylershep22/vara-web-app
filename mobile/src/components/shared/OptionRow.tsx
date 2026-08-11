/**
 * Single-select option row with a supporting line.
 *
 * NOT SelectionRow. That component is deliberately label-only ("Descriptors are
 * not used here"), and every caller here carries a required second line: the
 * outcome blurbs, the capacity glosses and the picker's time windows are what
 * make each choice answerable without guessing. Widening SelectionRow to serve
 * this would change a shipped component used by the V2 arc, so the two-line
 * variant lives here instead and mirrors its visual contract: white default,
 * Silver Sage border, teal border plus a Dew Sage wash when selected, 22px
 * circular radio.
 *
 * PROMOTED from `screens/onboarding/v3/V3OptionRow` when the daily picker
 * (roadmap 3b-ii-b) needed the same control on a dashboard surface. It never
 * depended on onboarding (constants and a colour helper are its only imports),
 * and `components/shared/WeekStartPicker` had already had to mirror its visual
 * contract by hand rather than reach into a screens folder. One more mirror was
 * the alternative to this move.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { withAlpha } from '../dashboard/brainStateCheckin/colorUtils';

const CONTROL_SIZE = 22;
const MIN_TOUCH_TARGET = 48;

interface OptionRowProps {
  label: string;
  /** The supporting line under the label. Always present for these steps. */
  description: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export const OptionRow: React.FC<OptionRowProps> = ({
  label,
  description,
  selected,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    // Both lines, so the choice is answerable without sighted access to the
    // supporting text.
    accessibilityLabel={`${label}. ${description}`}
    testID={testID}
    style={[styles.row, selected ? styles.rowSelected : styles.rowDefault]}
  >
    <View style={styles.text}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
    <View style={[styles.radio, selected ? styles.radioSelected : styles.radioEmpty]}>
      {selected && <View style={styles.radioDot} />}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  rowDefault: {
    backgroundColor: Colors.white,
    borderColor: Colors.silverSage,
  },
  rowSelected: {
    backgroundColor: withAlpha(Colors.dewSage, 0.45),
    borderColor: Colors.evergreenTeal,
  },
  text: { flex: 1 },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  description: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  radio: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioEmpty: { borderColor: Colors.silverSage },
  radioSelected: { borderColor: Colors.evergreenTeal },
  radioDot: {
    width: CONTROL_SIZE / 2,
    height: CONTROL_SIZE / 2,
    borderRadius: CONTROL_SIZE / 4,
    backgroundColor: Colors.evergreenTeal,
  },
});
