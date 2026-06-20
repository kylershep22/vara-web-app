// Step 1 of the reworked core loop: situation selection
// (Vara_Engine_Contract.md §3).
//
// Six plain-language situations. Situations 1-5 are equal-prominence tiles;
// "Just need a reset" (S6) is the low-intent fallback, rendered as a quieter
// link beneath the tiles so the user weighs the five outcome-specific options
// first. Single tap advances. Top-left close dismisses the flow with no data
// saved. Back from this step is a no-op (parent owns dismissal).

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import type { Situation } from '../../../engine';

const MIN_TOUCH_TARGET = 48;

interface SituationOption {
  situation: Situation;
  label: string;
}

// Situations 1-5 — the outcome-specific primary options (§3).
const PRIMARY_SITUATIONS: SituationOption[] = [
  { situation: 'get_through_hard', label: 'Get through something hard' },
  { situation: 'quiet_mind', label: 'Quiet a busy mind' },
  { situation: 'find_energy', label: "Find energy I'm missing" },
  { situation: 'wind_down', label: 'Wind down and switch off' },
  { situation: 'grip_on_day', label: 'Get a grip on my day' },
];

// S6 — the low-intent fallback, presented at lower prominence.
const RESET_SITUATION: SituationOption = {
  situation: 'just_reset',
  label: 'Just need a reset',
};

export interface SituationPickStepViewProps {
  onSelect: (situation: Situation) => void;
  onClose?: () => void;
}

export function SituationPickStepView({
  onSelect,
  onClose,
}: SituationPickStepViewProps) {
  return (
    <View style={styles.container} testID="checkin-flow-situation-pick">
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        {onClose ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="checkin-flow-situation-pick-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} testID="checkin-flow-situation-pick-title">
          What do you need right now?
        </Text>

        <View style={styles.tiles}>
          {PRIMARY_SITUATIONS.map((option) => (
            <TouchableOpacity
              key={option.situation}
              style={styles.tile}
              onPress={() => onSelect(option.situation)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              testID={`checkin-flow-situation-${option.situation}`}
            >
              <Text style={styles.tileLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.fallback}
          onPress={() => onSelect(RESET_SITUATION.situation)}
          accessibilityRole="button"
          accessibilityLabel={RESET_SITUATION.label}
          testID={`checkin-flow-situation-${RESET_SITUATION.situation}`}
        >
          <Text style={styles.fallbackLabel}>{RESET_SITUATION.label}</Text>
        </TouchableOpacity>
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
    // Center the options vertically so the whitespace reads as calm, not
    // unfinished; still scrolls when the content outgrows the viewport.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  tiles: {
    gap: Spacing.sm,
  },
  tile: {
    minHeight: MIN_TOUCH_TARGET + 8,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  tileLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  // S6 — deliberately quieter than the tiles (no card, muted text) so it reads
  // as the escape hatch, not a sixth equal option.
  fallback: {
    marginTop: Spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  fallbackLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
});
