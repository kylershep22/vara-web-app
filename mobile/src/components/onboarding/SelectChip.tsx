/**
 * Calm selectable chip for the skippable personalization steps (stressor,
 * peak window). Token-styled; 48px min touch target; selected state uses the
 * Dew Sage fill + Evergreen Teal border per the styling guide.
 */
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectChip: React.FC<SelectChipProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: Layout.buttonHeight.md,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  chipSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  label: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  labelSelected: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
});
