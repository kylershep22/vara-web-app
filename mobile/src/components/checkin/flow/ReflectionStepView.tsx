// Post-practice reflection (Vara_Engine_Contract.md §9.6). Replaces the prior
// five-chip BrainState re-check. A single-tap, per-pillar reflection whose chip
// set is chosen by the completed practice's slot (pillar, direction). Shown
// only when a catalog practice actually ran — pointer hand-off / zero-slot
// cells never reach this step.
//
// Brand: calm, non-judgmental, no streaks, no scores, no red. Single tap
// advances; there is no "wrong" answer and no back affordance (the practice is
// done — the only forward path is naming how it landed).

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { Protocol } from '../../../types/models';
import type { Pillar, SlotDirection } from '../../../engine';
import { reflectionSetFor } from './reflection';

const MIN_TOUCH_TARGET = 48;

export interface ReflectionStepViewProps {
  // The completed catalog practice. Optional: the focus-session loop reuses this
  // view after a Pomodoro, which has no catalog Protocol — it passes
  // `completedLabel` instead.
  protocol?: Protocol;
  completedLabel?: string;
  pillar: Pillar;
  direction: SlotDirection;
  onSelect: (reflectionId: string) => void;
}

export function ReflectionStepView({
  protocol,
  completedLabel,
  pillar,
  direction,
  onSelect,
}: ReflectionStepViewProps) {
  const set = reflectionSetFor(pillar, direction);
  const displayName = completedLabel ?? protocol?.name ?? 'your session';

  return (
    <View style={styles.container} testID="checkin-flow-reflection">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={styles.protocolChip}
          testID="checkin-flow-reflection-protocol-chip"
          accessibilityLabel={`Just completed: ${displayName}`}
        >
          <Text style={styles.protocolChipLabel}>Just completed</Text>
          <Text style={styles.protocolChipName}>{displayName}</Text>
        </View>

        <Text style={styles.title} testID="checkin-flow-reflection-title">
          How does it feel now?
        </Text>

        <View style={styles.chips}>
          {set.chips.map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={styles.chip}
              onPress={() => onSelect(chip.id)}
              accessibilityRole="button"
              accessibilityLabel={chip.label}
              testID={`checkin-flow-reflection-chip-${chip.id}`}
            >
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
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
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  protocolChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.dewSage,
    marginBottom: Spacing.lg,
  },
  protocolChipLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protocolChipName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginTop: 2,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
  },
  chips: {
    gap: Spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  chipLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
});
