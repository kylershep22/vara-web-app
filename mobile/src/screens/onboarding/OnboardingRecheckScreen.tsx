/**
 * Screen 7 — Re-check + shift (emotional peak; NOT skippable). Re-runs the
 * five-state check-in, surfaces the before→after shift in plain language, and
 * handles a flat/worse shift with compassion (spec Edge Case 3 — never implies
 * the user did it wrong, never gates on improvement). Writes the protocolSession
 * (stateBefore→stateAfter) and the recheck shift for analytics.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../components/dashboard/brainStateCheckin/BrainStateOptionRow';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  ONBOARDING_PROTOCOL_TIME_WINDOW,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep, saveRecheckShift } from '../../services/firebase/onboardingStressRecovery.service';
import { writeProtocolSession } from '../../services/firebase/protocolSession.service';
import { computeShift, shiftLine, shiftOutcome, BRAIN_LINE } from './onboardingShift';
import type { BrainState } from '../../types/models';

const OnboardingRecheckScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const before: BrainState = route.params?.state ?? 'wired';
  const protocolId: string = route.params?.protocolId ?? '';
  const sessionStartedAt: number = route.params?.sessionStartedAt ?? Date.now();
  const durationActualSeconds: number = route.params?.durationActualSeconds ?? 0;

  const [after, setAfter] = useState<BrainState | null>(null);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingRecheck');
  }, [user?.uid]);

  const shift = useMemo(() => (after ? computeShift(before, after) : null), [before, after]);

  const onContinue = async () => {
    if (!after || !shift) return;
    if (user?.uid) {
      try {
        await writeProtocolSession(user.uid, {
          protocolId,
          stateBefore: before,
          stateAfter: after,
          timeWindowSelected: ONBOARDING_PROTOCOL_TIME_WINDOW,
          durationActualSeconds,
          outcome: shiftOutcome(shift),
          userChosenNextStep: null,
          intentPath: 'default',
          sessionStartedAt,
        });
        await saveRecheckShift(user.uid, after, shift);
      } catch {
        // Non-blocking — analytics write must never block onboarding.
      }
    }
    navigation.navigate('OnboardingBridge');
  };

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingRecheck')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      title="How are you arriving now?"
      primaryLabel="Continue"
      primaryDisabled={!after}
      onPrimary={onContinue}
    >
      <View>
        {BRAIN_STATES.map((opt, i) => (
          <BrainStateOptionRow
            key={opt.state}
            option={opt}
            selected={after === opt.state}
            onPress={setAfter}
            isLast={i === BRAIN_STATES.length - 1}
          />
        ))}
        {after && shift && (
          <View style={styles.shiftBlock}>
            <Text style={styles.shiftLine}>{shiftLine(before, after, shift)}</Text>
            <Text style={styles.brainLine}>{BRAIN_LINE}</Text>
          </View>
        )}
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
