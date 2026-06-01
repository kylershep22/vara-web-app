import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { BrainState } from '../../../types';
import { BrainStateOption } from './brainStateOptions';
import { withAlpha } from './colorUtils';

interface BrainStateOptionRowProps {
  option: BrainStateOption;
  onPress: (state: BrainState) => void;
  selected?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

// Single-select selection card. Neutral white default with a 10px state-identity
// dot at left; selecting applies a teal border + 45% Dew Sage wash and reveals a
// filled radio control at right (semantically correct for single-select — see
// the Selection Layer rebuild). Descriptors use Soft Charcoal so AA contrast
// holds on both the white default and the Dew Sage wash.
export const BrainStateOptionRow: React.FC<BrainStateOptionRowProps> = ({
  option,
  onPress,
  selected = false,
  disabled = false,
  isLast = false,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      accessibilityState={{ selected, disabled }}
      onPress={() => !disabled && onPress(option.state)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.rowSelected : styles.rowDefault,
        !isLast && styles.rowSpacing,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      <View
        testID={`brain-state-dot-${option.state}`}
        style={[styles.dot, { backgroundColor: option.color }]}
      />
      <View style={styles.textColumn}>
        <Text style={styles.label}>{option.label}</Text>
        <Text style={styles.description}>{option.description}</Text>
      </View>
      {selected && (
        <View testID={`brain-state-radio-${option.state}`} style={styles.radioOuter}>
          <View style={styles.radioInner} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  rowDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.silverSage,
  },
  rowSelected: {
    backgroundColor: withAlpha(Colors.dewSage, 0.45),
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
  rowSpacing: {
    marginBottom: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.base,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.evergreenTeal,
  },
});
