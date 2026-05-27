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
import { ONBOARDING_PROTOCOL_TIME_WINDOW } from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep, saveRecheckShift } from '../../services/firebase/onboardingStressRecovery.service';
import { writeProtocolSession } from '../../services/firebase/protocolSession.service';
import type { BrainState, ProtocolSessionOutcome } from '../../types/models';

const STATE_LABELS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.label }),
  {} as Record<BrainState, string>
);

// Ordinal toward regulation; used only to phrase the shift, never to gate.
const RANK: Record<BrainState, number> = { wired: 0, foggy: 1, steady: 2, clear: 3, alive: 4 };

export type Shift = 'improved' | 'flat' | 'worse';

export function computeShift(before: BrainState, after: BrainState): Shift {
  if (RANK[after] > RANK[before]) return 'improved';
  if (RANK[after] < RANK[before]) return 'worse';
  return 'flat';
}

function shiftOutcome(shift: Shift): ProtocolSessionOutcome {
  if (shift === 'improved') return 'shifted';
  if (shift === 'flat') return 'maintenance';
  return 'not_shifted';
}

export function shiftLine(before: BrainState, after: BrainState, shift: Shift): string {
  if (shift === 'improved') {
    return `You moved from ${STATE_LABELS[before]} to ${STATE_LABELS[after]} in five minutes.`;
  }
  // flat or worse — compassionate, never shaming.
  return "Recovery isn't linear — some days the shift is quiet. Showing up is the part that compounds.";
}

const BRAIN_LINE =
  'Small recovery moments like this, repeated, are how your brain learns to handle stress better over time.';

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
