/**
 * Onboarding selection card for the icon-led personalization steps (drivers =
 * multi-select, peak window = single-select). Neutral white default with a
 * Silver Sage border; selecting applies a teal border + 45% Dew Sage wash and a
 * semantically-correct trailing control:
 *   - selectionMode 'multi'  → 22px rounded-square checkbox (teal fill + white check)
 *   - selectionMode 'single' → 22px circular radio (teal border + inner teal dot)
 * The empty control outline stays visible when unselected so the control type
 * reads at a glance. Descriptors are not used here (label-only options).
 */
import React, { type ComponentType } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { withAlpha } from '../dashboard/brainStateCheckin/colorUtils';

// Minimal shape of a Lucide icon component (size / color / strokeWidth). Kept
// local so SelectionRow doesn't hard-depend on lucide-react-native's types.
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_SIZE = 22;
const ICON_STROKE = 1.5;
const CONTROL_SIZE = 22;

interface SelectionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  selectionMode: 'single' | 'multi';
  // Optional leading line icon. Tinted Muted Sage Gray by default, Evergreen
  // Teal when selected — mirrors the label's selection emphasis.
  icon?: IconComponent;
}

export const SelectionRow: React.FC<SelectionRowProps> = ({
  label,
  selected,
  onPress,
  selectionMode,
  icon: Icon,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole={selectionMode === 'multi' ? 'checkbox' : 'radio'}
    accessibilityState={{ selected, checked: selected }}
    accessibilityLabel={label}
    style={[styles.row, selected ? styles.rowSelected : styles.rowDefault]}
  >
    {Icon && (
      <Icon
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE}
        color={selected ? Colors.evergreenTeal : Colors.mutedSageGray}
      />
    )}
    <Text style={styles.label}>{label}</Text>
    {selectionMode === 'multi' ? (
      <View style={[styles.checkbox, selected ? styles.checkboxSelected : styles.controlEmpty]}>
        {selected && <Check size={14} strokeWidth={2.5} color={Colors.white} />}
      </View>
    ) : (
      <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : styles.controlEmpty]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    minHeight: Layout.buttonHeight.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Spacing.sm,
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
  label: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  // Shared empty-control outline (unselected, both checkbox + radio).
  controlEmpty: {
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
  radioOuter: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
    backgroundColor: 'transparent',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.evergreenTeal,
  },
});
