/**
 * Calm selectable chip.
 *
 * Two layouts, one selection language. `stacked` (the default) is the original
 * full-width row built for the skippable onboarding personalization steps.
 * `row` is the horizontal three-across variant the Blocks sheet uses for its
 * demand and duration rows (TB-1b, mockup B/D): flex:1 so a row of them divides
 * the width evenly, centred label, no icon.
 *
 * PROMOTED FROM components/onboarding/ IN TB-1b. It had zero importers at the
 * time of the move — it was written for onboarding steps that never shipped it —
 * so nothing needed updating and no compatibility shim exists. Do not add one.
 *
 * Selected state is identical in spirit across both layouts and comes from the
 * styling guide: Dew Sage fill plus Evergreen Teal border and label. The row
 * variant uses the lighter Dew Sage wash and a tighter radius to match the
 * mockup's .dem / .dur treatment; the stacked variant is byte-for-byte the
 * original so its rendering is unchanged.
 */
import React, { type ComponentType } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

// Minimal shape of a Lucide icon component (size / color / strokeWidth). Kept
// local so SelectChip doesn't hard-depend on lucide-react-native's types.
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_SIZE = 22;
const ICON_STROKE = 1.5;

/** Accessibility floor per UI standards. The row variant needs it explicitly. */
const MIN_TOUCH_TARGET = 48;

export type SelectChipLayout = 'stacked' | 'row';

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Optional leading line icon. Tinted Muted Sage Gray by default, Evergreen
  // Teal when selected — mirrors the label's selection color. Ignored by the
  // `row` layout, which has no room for one and shows none in the mockup.
  icon?: IconComponent;
  /** Defaults to 'stacked', the original full-width behaviour. */
  layout?: SelectChipLayout;
  testID?: string;
}

export const SelectChip: React.FC<SelectChipProps> = ({
  label,
  selected,
  onPress,
  icon: Icon,
  layout = 'stacked',
  testID,
}) => {
  const isRow = layout === 'row';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      style={[
        styles.chip,
        isRow && styles.chipRow,
        selected && styles.chipSelected,
        isRow && selected && styles.chipRowSelected,
      ]}
    >
      {Icon && !isRow && (
        <Icon
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE}
          color={selected ? Colors.evergreenTeal : Colors.mutedSageGray}
        />
      )}
      <Text
        style={[
          styles.label,
          isRow && styles.labelRow,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

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
  // ---- row variant ----
  // flex:1 is what makes three of them divide a flexDirection:'row' parent into
  // equal thirds, per the mockup's .demrow / .durrow.
  chipRow: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    // The row sits in a gapped parent, so per-chip bottom margin would double
    // up as dead space under the row.
    marginBottom: 0,
  },
  chipRowSelected: {
    // The lighter wash the mockup uses for .dem.sel / .dur.sel, rather than the
    // stacked variant's solid Dew Sage.
    backgroundColor: Colors.dewSageLight,
  },
  labelRow: {
    flex: 0,
    textAlign: 'center',
  },
});

export default SelectChip;
