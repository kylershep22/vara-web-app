/**
 * Screen 4 — "When it peaks" (skippable, single-select). Feeds the anchor
 * time suggestion on screen 9. Skip persists null with no penalty copy.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Sunrise, Sun, Sunset, type LucideIcon } from 'lucide-react-native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { SelectionRow } from '../../components/onboarding/SelectionRow';
import {
  PEAK_WINDOW_OPTIONS,
  type PeakWindow,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import {
  savePeakWindow,
  saveOnboardingStep,
} from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

// Line icon per peak-window option (keyed by stable id).
const PEAK_ICONS: Record<PeakWindow, LucideIcon> = {
  morning: Sunrise,
  midday: Sun,
  evening: Sunset,
};

const OnboardingPeakWindowScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const state: BrainState | undefined = route.params?.state;
  const stressorLabels: string[] = route.params?.stressorLabels ?? [];
  const [selected, setSelected] = useState<PeakWindow | null>(null);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingPeakWindow');
  }, [user?.uid]);

  const advance = async (peak: PeakWindow | null) => {
    if (user?.uid) {
      try {
        await savePeakWindow(user.uid, peak);
      } catch {
        // Non-blocking.
      }
    }
    navigation.navigate('OnboardingReflect', { state, stressorLabels, peak });
  };

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingPeakWindow')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      title="When does it peak?"
      subtitle="This helps us suggest a daily moment. Skip if you're not sure."
      primaryLabel="Continue"
      primaryDisabled={!selected}
      onPrimary={() => advance(selected)}
      onSkip={() => advance(null)}
    >
      <View>
        {PEAK_WINDOW_OPTIONS.map((opt) => (
          <SelectionRow
            key={opt.id}
            label={opt.label}
            icon={PEAK_ICONS[opt.id]}
            selectionMode="single"
            selected={selected === opt.id}
            onPress={() => setSelected(opt.id)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingPeakWindowScreen;
