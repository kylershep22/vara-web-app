/**
 * Screen 5 — Reflect it back. Mirrors the user's ACTUAL inputs (not a static
 * string) and frames the chosen reset. Prefers route params; on resume (params
 * absent) it reads persisted inputs from Firestore so personalization isn't lost.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Sparkles } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import {
  type PeakWindow,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import { buildReflectLine } from './onboardingShift';
import type { BrainState } from '../../types/models';

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
      currentStep={onboardingStepNumber('OnboardingReflect')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      decorativeIcon={Sparkles}
      title="Here's where you're starting."
      subtitle={line}
      primaryLabel="Start the reset"
      onPrimary={() => navigation.navigate('OnboardingProtocol', { state: resolved.state })}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    />
  );
};

export default OnboardingReflectScreen;
