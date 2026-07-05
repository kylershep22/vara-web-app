// Step 2 of the reworked core loop: the circumplex state read
// (Vara_Engine_Contract.md §2), consolidated to ONE progressive screen.
//
//   Body state (fixed):          "How's your body right now?"
//                                  Revved up / Running low
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
// disclosure. The situation already picked anchors the top as a calm chip.
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
import { StepIndicator } from '../../onboarding/StepIndicator';
import { FEELING_COPY } from './feelingCopy';

const MIN_TOUCH_TARGET = 48;

// Recap of the situation the user already picked, shown in the anchor chip at
// the top of the state read. Mirrors the action phrasing from
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

// Fixed body-state labels (situation-independent). 'revved' is the higher pole,
// 'low' the lower pole — the same two poles the engine has always consumed; only
// the wording changed (a body-state read fits find-energy, where "on the higher
// side" contradicted the situation).
const AROUSAL_OPTIONS: ArousalOption[] = [
  { value: 'revved', label: 'Revved up' },
  { value: 'low', label: 'Running low' },
];

export interface StatePickStepViewProps {
  // The situation picked in the prior step — keys the feeling copy and the quiet
  // context line.
  situation: Situation;
  onSelect: (state: { arousal: Arousal; valence: Valence }) => void;
  // Returns to the situation step (parent reducer).
  onBack?: () => void;
  onClose?: () => void;
  // Suppress the "You're here to …" situation recap chip. Onboarding pins the
  // situation (the user never picked it), so the recap would be noise there; the
  // situation still keys the feeling copy exactly as in the dashboard flow.
  hideSituationChip?: boolean;
  // Optional header (title + subtitle) rendered above the read. Used by the
  // onboarding re-check to acknowledge a practice just happened; the initial
  // read omits it.
  title?: string;
  subtitle?: string;
  // Override the two section prompts. The re-check softens them ("Your body:" /
  // "And how it feels:") under its own title; the initial read keeps the full
  // questions (arousal default below, feeling default = the situation question).
  arousalPrompt?: string;
  feelingPrompt?: string;
  // Onboarding progress chrome. When both are provided (the onboarding arrival +
  // re-check reads), the same thin step bar every other onboarding screen shows
  // renders at the top so the flow reads continuous. The dashboard check-in omits
  // them, so no bar renders there.
  currentStep?: number;
  totalSteps?: number;
}

const DEFAULT_AROUSAL_PROMPT = "How's your body right now?";

export function StatePickStepView({
  situation,
  onSelect,
  onBack,
  onClose,
  hideSituationChip = false,
  title,
  subtitle,
  arousalPrompt = DEFAULT_AROUSAL_PROMPT,
  feelingPrompt,
  currentStep,
  totalSteps,
}: StatePickStepViewProps) {
  const reduceMotion = useReducedMotion();
  const [arousal, setArousal] = useState<Arousal | null>(null);

  const feeling = FEELING_COPY[situation];
  // The rendered feeling heading: the caller's override (re-check) or the
  // situation-specific question (initial read). Same value drives the a11y
  // announce so screen-reader users hear what's on screen.
  const feelingHeading = feelingPrompt ?? feeling.question;

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
      AccessibilityInfo.announceForAccessibility(feelingHeading);
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
        {/* Onboarding progress bar — only when the caller passes step context
            (arrival + re-check reads); the dashboard check-in omits it. */}
        {currentStep != null && totalSteps != null && (
          <View style={styles.progress} testID="checkin-flow-progress">
            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          </View>
        )}

        {/* Optional header (re-check): a title + subtitle that acknowledge a
            practice just happened. The initial read omits this. */}
        {!!title && (
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
          </View>
        )}

        {/* Situation anchor chip — the chosen situation as a calm, full-width
            Dew Sage chip directly under the nav row, so content reads top-down
            with no marooned middle. Hidden when the situation was pinned for the
            user (onboarding), where a recap of an unmade choice would be noise. */}
        {!hideSituationChip && (
          <View style={styles.situationChip}>
            <Text style={styles.chipOverline}>You're here to</Text>
            <Text
              style={styles.chipSituation}
              testID="checkin-flow-state-pick-situation"
            >
              {SITUATION_CONTEXT_LABELS[situation]}
            </Text>
          </View>
        )}

        {/* Body state — always visible, re-tappable after it's answered. */}
        <Text style={styles.title} testID="checkin-flow-arousal-title">
          {arousalPrompt}
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
              {feelingHeading}
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
    // Top-down read: the chip anchors under the nav row and the questions follow
    // immediately, so there's no marooned middle. Grows to scroll if the feeling
    // reveal or large text settings outgrow the viewport.
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  progress: {
    marginBottom: Spacing.lg,
  },
  headerBlock: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  situationChip: {
    backgroundColor: Colors.dewSage,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  chipOverline: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.72, // .06em at 12px
    textTransform: 'uppercase',
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  chipSituation: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  // Questions stay primary at 22px.
  title: {
    fontSize: 22,
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
