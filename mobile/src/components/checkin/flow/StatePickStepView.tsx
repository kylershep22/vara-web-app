// Step 2 of the reworked core loop: the circumplex state read
// (Vara_Engine_Contract.md §2), consolidated to ONE progressive screen.
//
//   Energy (fixed):              "Where's your energy?"
//                                  On the higher side / On the lower side
//   Feeling (situation-specific): revealed BELOW once energy is answered
//                                  (question + labels via FEELING_COPY).
//
// The two reads are still the engine's binary axes — Arousal ('revved' | 'low')
// and Valence ('good' | 'hard'). This screen changes only labels + layout: it
// emits the SAME single `state_selected { arousal, valence }` action the prior
// two-screen swap did, so the quadrant the engine derives is unchanged for
// every (situation, energy, feeling) combination.
//
// Progressive disclosure (not navigation, not a swap): the energy block stays
// visible and re-tappable after it's answered, and the feeling block reveals
// beneath it on the same screen. The reveal is Reduce-Motion-aware (instant, no
// animation, when the setting is on) and announces the feeling question to
// assistive tech so screen-reader / keyboard users aren't stranded by the
// disclosure. The situation already picked shows as quiet context at the top.
//
// Back returns to the situation step (parent reducer) — there is no internal
// sub-screen to step back through anymore.

import React, { useState } from 'react';
import {
  AccessibilityInfo,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { Arousal, Situation, Valence } from '../../../engine';
import { FEELING_COPY } from './feelingCopy';

const MIN_TOUCH_TARGET = 48;

// De-emphasized recap of the situation the user already picked, shown as quiet
// context at the top of the state read. Mirrors the action phrasing from
// SituationPickStepView intentionally — a recap of the existing label, not new
// copy.
const SITUATION_CONTEXT_LABELS: Record<Situation, string> = {
  get_through_hard: 'Get through something hard',
  quiet_mind: 'Quiet a busy mind',
  find_energy: "Find energy I'm missing",
  wind_down: 'Wind down and switch off',
  grip_on_day: 'Get a grip on my day',
  just_reset: 'Just need a reset',
};

interface ArousalOption {
  value: Arousal;
  label: string;
}

// Fixed energy labels (situation-independent). 'revved' is the higher pole,
// 'low' the lower pole — the same two poles the engine has always consumed.
const AROUSAL_OPTIONS: ArousalOption[] = [
  { value: 'revved', label: 'On the higher side' },
  { value: 'low', label: 'On the lower side' },
];

export interface StatePickStepViewProps {
  // The situation picked in the prior step — keys the feeling copy and the quiet
  // context line.
  situation: Situation;
  onSelect: (state: { arousal: Arousal; valence: Valence }) => void;
  // Returns to the situation step (parent reducer).
  onBack?: () => void;
  onClose?: () => void;
}

export function StatePickStepView({
  situation,
  onSelect,
  onBack,
  onClose,
}: StatePickStepViewProps) {
  const reduceMotion = useReducedMotion();
  const [arousal, setArousal] = useState<Arousal | null>(null);

  const feeling = FEELING_COPY[situation];

  const handleEnergy = (value: Arousal) => {
    const firstReveal = arousal === null;
    // Animate the feeling block in — unless Reduce Motion is on, then it's
    // instant. LayoutAnimation needs no cleanup and is a no-op under test.
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setArousal(value);
    // Move assistive-tech attention to the newly revealed feeling question so
    // users aren't stranded by the progressive disclosure. Only on the first
    // reveal — re-tapping energy to change it doesn't re-announce.
    if (firstReveal) {
      AccessibilityInfo.announceForAccessibility(feeling.question);
    }
  };

  return (
    <View style={styles.container} testID="checkin-flow-state-pick">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="checkin-flow-state-pick-back"
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
            testID="checkin-flow-state-pick-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          style={styles.situationContext}
          testID="checkin-flow-state-pick-situation"
        >
          {SITUATION_CONTEXT_LABELS[situation]}
        </Text>

        {/* Energy — always visible, re-tappable after it's answered. */}
        <Text style={styles.title} testID="checkin-flow-arousal-title">
          Where's your energy?
        </Text>
        <View style={styles.options}>
          {AROUSAL_OPTIONS.map((option) => {
            const selected = arousal === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleEnergy(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                testID={`checkin-flow-arousal-${option.value}`}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feeling — gated on the energy answer, revealed below on the same
            screen. */}
        {arousal !== null ? (
          <View style={styles.feelingBlock} testID="checkin-flow-feeling-block">
            <Text style={styles.title} testID="checkin-flow-valence-title">
              {feeling.question}
            </Text>
            <View style={styles.options}>
              {feeling.options.map((option) => (
                <TouchableOpacity
                  key={option.valence}
                  style={styles.option}
                  onPress={() => onSelect({ arousal, valence: option.valence })}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  testID={`checkin-flow-valence-${option.valence}`}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
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
    // Center the read vertically so the whitespace reads as calm, not
    // unfinished; still scrolls if the content outgrows the viewport (e.g. the
    // feeling reveal or large text settings).
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  situationContext: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  feelingBlock: {
    marginTop: Spacing.xl,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET + 16,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  // The chosen energy keeps a teal outline so it reads as a live selection
  // while the feeling block is open beneath it.
  optionSelected: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
});
