/**
 * Screen 3 — "What's driving it" (skippable, multi-select). Stress-framed
 * options; selections are persisted for personalization/analytics. Skip writes
 * an empty selection with no penalty copy.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { SelectChip } from '../../components/onboarding/SelectChip';
import { STRESSOR_OPTIONS } from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import {
  saveStressors,
  saveOnboardingStep,
} from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

const OnboardingStressorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const state: BrainState | undefined = route.params?.state;
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingStressor');
  }, [user?.uid]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const advance = async (ids: string[]) => {
    if (user?.uid) {
      try {
        await saveStressors(user.uid, ids);
      } catch {
        // Non-blocking.
      }
    }
    const stressorLabels = STRESSOR_OPTIONS.filter((o) => ids.includes(o.id)).map((o) => o.label);
    navigation.navigate('OnboardingPeakWindow', { state, stressorLabels });
  };

  return (
    <OnboardingScaffold
      title="What's driving it?"
      subtitle="Pick what fits, or skip."
      primaryLabel="Continue"
      onPrimary={() => advance(selected)}
      onSkip={() => advance([])}
    >
      <View>
        {STRESSOR_OPTIONS.map((opt) => (
          <SelectChip
            key={opt.id}
            label={opt.label}
            selected={selected.includes(opt.id)}
            onPress={() => toggle(opt.id)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingStressorScreen;
