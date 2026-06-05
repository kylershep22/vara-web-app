/**
 * Calm selectable chip for the skippable personalization steps (stressor,
 * peak window). Token-styled; 48px min touch target; selected state uses the
 * Dew Sage fill + Evergreen Teal border per the styling guide.
 */
import React, { type ComponentType } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

// Minimal shape of a Lucide icon component (size / color / strokeWidth). Kept
// local so SelectChip doesn't hard-depend on lucide-react-native's types.
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_SIZE = 22;
const ICON_STROKE = 1.5;

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Optional leading line icon. Tinted Muted Sage Gray by default, Evergreen
  // Teal when selected — mirrors the label's selection color.
  icon?: IconComponent;
}

export const SelectChip: React.FC<SelectChipProps> = ({ label, selected, onPress, icon: Icon }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    {Icon && (
      <Icon
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE}
        color={selected ? Colors.evergreenTeal : Colors.mutedSageGray}
      />
    )}
    <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: Layout.buttonHeight.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  labelSelected: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
});
