/**
 * Screen 5 — Reflect it back. Mirrors the user's ACTUAL inputs (not a static
 * string) and frames the chosen reset. Prefers route params; on resume (params
 * absent) it reads persisted inputs from Firestore so personalization isn't lost.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { PEAK_WINDOW_OPTIONS, type PeakWindow } from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

const STATE_LABELS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.label }),
  {} as Record<BrainState, string>
);
const PEAK_LABELS: Record<PeakWindow, string> = PEAK_WINDOW_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<PeakWindow, string>
);

const GENERIC_LINE = "Here's a five-minute reset to help your system downshift.";

export function buildReflectLine(
  state: BrainState | null,
  stressorLabels: string[],
  peak: PeakWindow | null
): string {
  if (!state) return GENERIC_LINE;
  const stressorClause = stressorLabels.length ? `, with ${stressorLabels[0].toLowerCase()}` : '';
  const peakClause = peak ? ` in the ${PEAK_LABELS[peak].toLowerCase()}` : '';
  return `You're arriving ${STATE_LABELS[state]}${stressorClause}${peakClause}. ${GENERIC_LINE}`;
}

interface Resolved {
  state: BrainState | null;
  stressorLabels: string[];
  peak: PeakWindow | null;
}

const OnboardingReflectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const routeState: BrainState | undefined = route.params?.state;
  const [resolved, setResolved] = useState<Resolved>({
    state: routeState ?? null,
    stressorLabels: route.params?.stressorLabels ?? [],
    peak: route.params?.peak ?? null,
  });

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingReflect');
  }, [user?.uid]);

  // Resume fallback: route params lost (user relaunched onto Reflect) → rebuild
  // from persisted inputs so the reflect-back still mirrors what they told us.
  useEffect(() => {
    if (routeState !== undefined || !user?.uid || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled || !snap.exists()) return;
        const sr = (snap.data().onboardingStressRecovery ?? {}) as {
          initialState?: BrainState;
          stressors?: string[];
          peakWindow?: PeakWindow | null;
        };
        // Persisted stressors are ids; we only need labels for the line.
        const { STRESSOR_OPTIONS } = await import('../../constants/onboardingStressRecovery');
        const labels = STRESSOR_OPTIONS.filter((o) => (sr.stressors ?? []).includes(o.id)).map(
          (o) => o.label
        );
        setResolved({
          state: sr.initialState ?? null,
          stressorLabels: labels,
          peak: sr.peakWindow ?? null,
        });
      } catch {
        // Leave the generic line.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeState, user?.uid]);

  const line = useMemo(
    () => buildReflectLine(resolved.state, resolved.stressorLabels, resolved.peak),
    [resolved]
  );

  return (
    <OnboardingScaffold
      title="Here's where you're starting."
      subtitle={line}
      primaryLabel="Start the reset"
      onPrimary={() => navigation.navigate('OnboardingProtocol', { state: resolved.state })}
    />
  );
};

export default OnboardingReflectScreen;
