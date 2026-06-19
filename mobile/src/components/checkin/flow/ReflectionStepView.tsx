// Post-practice reflection (Vara_Engine_Contract.md §9.6). Replaces the prior
// five-chip BrainState re-check. A single-tap, per-category reflection whose
// option labels are chosen by the completed practice's category (down-regulate /
// energize / settle-before-focus / rest / focus). Shown only when a catalog
// practice actually ran — pointer hand-off / zero-slot cells never reach this
// step.
//
// The chip IDS stay keyed to the slot (pillar, direction) — the outcome /
// firstShift classifier reads those — while the LABELS vary by category
// (reflectionDisplayChips). Visually: a full-width "Just completed" banner in
// the same language as the situation chip, then the hero question and the option
// cards, composed top-down.
//
// Brand: calm, non-judgmental, no streaks, no scores, no red. Single tap
// advances; there is no "wrong" answer and no back affordance.

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
import { reflectionDisplayChips } from './reflection';

const MIN_TOUCH_TARGET = 48;

export interface ReflectionStepViewProps {
  // The completed catalog practice. Optional: the focus-session loop reuses this
  // view after a Pomodoro, which has no catalog Protocol — it passes
  // `completedLabel` instead.
  protocol?: Protocol;
  completedLabel?: string;
  pillar: Pillar;
  direction: SlotDirection;
  // True when this practice leads into a focus session in the current plan —
  // selects the "settle before focus" labels (Clearer / scattered) over plain
  // down-regulate. Absent for the focus-session loop and standalone practices.
  leadsToFocus?: boolean;
  onSelect: (reflectionId: string) => void;
}

export function ReflectionStepView({
  protocol,
  completedLabel,
  pillar,
  direction,
  leadsToFocus,
  onSelect,
}: ReflectionStepViewProps) {
  const chips = reflectionDisplayChips(pillar, direction, {
    modality: protocol?.modality,
    leadsToFocus,
  });
  const displayName = completedLabel ?? protocol?.name ?? 'your session';

  return (
    <View style={styles.container} testID="checkin-flow-reflection">
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Completion banner — full-width, same language as the situation chip. */}
        <View
          style={styles.banner}
          testID="checkin-flow-reflection-protocol-chip"
          accessibilityLabel={`Just completed: ${displayName}`}
        >
          <Text style={styles.bannerOverline}>Just completed</Text>
          <Text style={styles.bannerName}>{displayName}</Text>
        </View>

        <Text style={styles.title} testID="checkin-flow-reflection-title">
          How does it feel now?
        </Text>

        <View style={styles.chips}>
          {chips.map((chip) => (
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
  banner: {
    backgroundColor: Colors.dewSage,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  bannerOverline: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.72, // .06em at 12px
    textTransform: 'uppercase',
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  bannerName: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  title: {
    fontSize: 24,
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
