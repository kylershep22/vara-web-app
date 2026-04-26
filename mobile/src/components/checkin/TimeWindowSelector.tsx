// Step 2 of the revised core loop: time-window selection.
//
// Five chips per Core Loop v2 lines 99-105. Single tap advances —
// no confirmation button. Back arrow returns to step 1 (parent
// preserves state selection). Top-left close dismisses the entire
// flow with no data saved.
//
// initialValue is the parent's preserved selection on back-navigation
// from a later step; on first arrival it should be null/undefined so
// no chip is pre-selected. Per spec line 113, "no option is
// pre-selected" — but a previously-selected chip on back-nav can
// carry a subtle teal outline to remind the user of their prior pick.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../constants';
import type { ProtocolTimeWindow } from '../../types/models';

const MIN_TOUCH_TARGET = 48;

export interface TimeWindowSelectorProps {
  initialValue?: ProtocolTimeWindow | null;
  onSelect: (value: ProtocolTimeWindow) => void;
  onBack?: () => void;
  onClose?: () => void;
}

interface TimeWindowChipData {
  value: ProtocolTimeWindow;
  label: string;
  framing: string;
}

const TIME_WINDOWS: TimeWindowChipData[] = [
  { value: 2, label: '2 minutes', framing: 'A quick reset' },
  { value: 5, label: '5 minutes', framing: 'A meaningful shift' },
  { value: 10, label: '10 minutes', framing: 'Deeper recovery' },
  { value: 20, label: '20 minutes', framing: 'Full reset' },
  { value: 45, label: '45+ minutes', framing: 'Focused work or deep rest' },
];

export function TimeWindowSelector({
  initialValue = null,
  onSelect,
  onBack,
  onClose,
}: TimeWindowSelectorProps) {
  return (
    <View style={styles.container} testID="time-window-selector">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="time-window-back"
          >
            <Icon name="arrow-left" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {onClose ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="time-window-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} testID="time-window-title">
          How much time do you have?
        </Text>
        <Text style={styles.subtitle}>
          We'll match you to something that fits.
        </Text>

        <View style={styles.chips}>
          {TIME_WINDOWS.map((chip) => {
            const isPreviouslySelected = chip.value === initialValue;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.chip,
                  isPreviouslySelected && styles.chipPreviouslySelected,
                ]}
                onPress={() => onSelect(chip.value)}
                accessibilityRole="button"
                accessibilityLabel={`${chip.label} — ${chip.framing}`}
                testID={`time-window-chip-${chip.value}`}
              >
                <Text style={styles.chipLabel}>{chip.label}</Text>
                <Text style={styles.chipFraming}>{chip.framing}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    height: 56,
  },
  headerButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xl,
  },
  chips: {
    gap: Spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET + 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  chipPreviouslySelected: {
    // Subtle teal outline marks the user's prior pick on back-nav,
    // per Core Loop v2 line 113. Not a "selected" state — taps still
    // fire onSelect normally.
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  chipLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  chipFraming: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
