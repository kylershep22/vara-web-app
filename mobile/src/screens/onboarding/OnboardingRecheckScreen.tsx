/**
 * Screen 7 — Re-check + shift (emotional peak; NOT skippable). Rehosted onto the
 * shipped two-tap circumplex read, in two phases:
 *   1. the same StatePickStepView as the arrival captures the after-state;
 *   2. a felt-shift reveal states the before->after shift in circumplex terms
 *      and handles a flat/worse shift with compassion (Edge Case 3 — never
 *      implies the user did it wrong, never gates on improvement).
 *
 * Writes the protocolSession (stateBefore->stateAfter, bridged) PLUS the
 * authoritative circumplex fields (situation/arousal/valence/quadrant of the
 * entry state), matching the dashboard write. The outcome field stays keyed off
 * the bridged five-state values via computeShift/shiftOutcome.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { StatePickStepView } from '../../components/checkin/flow/StatePickStepView';
import { classifyQuadrant } from '../../engine';
import { brainStateToCircumplex, quadrantToBrainState } from '../../engine/stateBridge';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  ONBOARDING_PROTOCOL_TIME_WINDOW,
  ONBOARDING_SITUATION,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep, saveRecheckShift } from '../../services/firebase/onboardingStressRecovery.service';
import { writeProtocolSession } from '../../services/firebase/protocolSession.service';
import {
  computeShift,
  classifyQuadrantShift,
  quadrantShiftLine,
  quadrantForBrainState,
  shiftOutcome,
  brainLine,
  QUADRANT_FELT_LABEL,
  QUADRANT_COLOR,
} from './onboardingShift';
import type { Arousal, Valence } from '../../engine/types';
import type { BrainState, ProtocolAbandonReason } from '../../types/models';

const OnboardingRecheckScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const before: BrainState = route.params?.state ?? 'wired';
  const protocolId: string = route.params?.protocolId ?? '';
  const sessionStartedAt: number = route.params?.sessionStartedAt ?? Date.now();
  const durationActualSeconds: number = route.params?.durationActualSeconds ?? 0;
  // Completion telemetry forwarded from the player summary (additive analytics).
  const completed: boolean = route.params?.completed ?? false;
  const abandonReason: ProtocolAbandonReason | null = route.params?.abandonReason ?? null;
  const stepsCompleted: number = route.params?.stepsCompleted ?? 0;

  // The after-state read (two-tap circumplex). Null until the user completes it.
  const [after, setAfter] = useState<{ arousal: Arousal; valence: Valence } | null>(null);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingRecheck');
  }, [user?.uid]);

  // Phase 1 — the two-tap re-check read. Same component as the arrival read, but
  // reframed so it acknowledges a practice just happened (not a repeat of the
  // identical question).
  if (!after) {
    return (
      <StatePickStepView
        situation={ONBOARDING_SITUATION}
        hideSituationChip
        currentStep={onboardingStepNumber('OnboardingRecheck')}
        totalSteps={ONBOARDING_SR_TOTAL_STEPS}
        title="How about now?"
        subtitle="No right answer. Just notice where you actually are after those two minutes."
        arousalPrompt="Your body:"
        feelingPrompt="And how it feels:"
        onSelect={setAfter}
      />
    );
  }

  // Phase 2 — the felt-shift reveal.
  const beforeCircumplex = brainStateToCircumplex(before);
  const quadrantBefore = quadrantForBrainState(before);
  const quadrantAfter = classifyQuadrant(after.arousal, after.valence);
  const afterState = quadrantToBrainState(quadrantAfter);
  // Outcome still derives from the bridged five-state values (unchanged field).
  const shift = computeShift(before, afterState);
  const bucket = classifyQuadrantShift(quadrantBefore, quadrantAfter);

  const onContinue = () => {
    if (user?.uid) {
      // Analytics write must never block the transition (Edge Case: slow net).
      void (async () => {
        try {
          await writeProtocolSession(user.uid, {
            protocolId,
            stateBefore: before,
            stateAfter: afterState,
            timeWindowSelected: ONBOARDING_PROTOCOL_TIME_WINDOW,
            durationActualSeconds,
            outcome: shiftOutcome(shift),
            userChosenNextStep: null,
            intentPath: 'default',
            sessionStartedAt,
            completed,
            abandonReason,
            stepsCompleted,
            // Authoritative circumplex fields for the entry state — parity with
            // the dashboard's writeProtocolSession call.
            situation: ONBOARDING_SITUATION,
            arousal: beforeCircumplex.arousal,
            valence: beforeCircumplex.valence,
            quadrant: quadrantBefore,
          });
          await saveRecheckShift(user.uid, afterState, shift);
        } catch {
          // Non-blocking — analytics write must never block onboarding.
        }
      })();
    }
    navigation.navigate('OnboardingBridge', { state: before });
  };

  return (
    <OnboardingScaffold title="You showed up." primaryLabel="Continue" onPrimary={onContinue}>
      <View style={styles.shiftBlock}>
        {/* Visual before->after transition — only on the "eased" win (moved into
            Calm). The other prose intentionally avoids stating a transition
            (compassion contract), so we don't render a forward arrow there. */}
        {bucket === 'eased' && (
          <View style={styles.transitionRow}>
            <View style={styles.statePair}>
              <View style={[styles.stateDot, { backgroundColor: QUADRANT_COLOR[quadrantBefore] }]} />
              <Text style={styles.stateName}>{QUADRANT_FELT_LABEL[quadrantBefore]}</Text>
            </View>
            <ChevronRight size={16} strokeWidth={1.2} color={Colors.mutedSageGray} />
            <View style={styles.statePair}>
              <View style={[styles.stateDot, { backgroundColor: QUADRANT_COLOR[quadrantAfter] }]} />
              <Text style={styles.stateName}>{QUADRANT_FELT_LABEL[quadrantAfter]}</Text>
            </View>
          </View>
        )}
        <Text style={styles.shiftLine}>
          {quadrantShiftLine(quadrantBefore, quadrantAfter, durationActualSeconds)}
        </Text>
        <Text style={styles.brainLine}>{brainLine(before)}</Text>
      </View>
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  shiftBlock: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    // Highlight Card convention (design system 7.2): Evergreen Teal left accent.
    borderLeftWidth: Layout.borderWidth.thick,
    borderLeftColor: Colors.evergreenTeal,
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statePair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stateDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stateName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  shiftLine: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  brainLine: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});

export default OnboardingRecheckScreen;
