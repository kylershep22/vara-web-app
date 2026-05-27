/**
 * Screen 2 — State check-in (NOT skippable). Reuses the five-state chips
 * (BRAIN_STATES + BrainStateOptionRow). Captures the user's arriving state,
 * persists it, and carries it forward to power the protocol match + reflect-back.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../components/dashboard/brainStateCheckin/BrainStateOptionRow';
import { useAuth } from '../../context/AuthContext';
import {
  saveInitialState,
  saveOnboardingStep,
} from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

const OnboardingStateCheckInScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [selected, setSelected] = useState<BrainState | null>(null);

  // Resume convention: record current location on mount.
  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingStateCheckIn');
  }, [user?.uid]);

  const onPrimary = async () => {
    if (!selected || !user?.uid) return;
    try {
      await saveInitialState(user.uid, selected);
    } catch {
      // Non-blocking; resume re-asks this step if the write failed.
    }
    navigation.navigate('OnboardingStressor', { state: selected });
  };

  return (
    <OnboardingScaffold
      title="How are you arriving right now?"
      primaryLabel="Continue"
      primaryDisabled={!selected}
      onPrimary={onPrimary}
    >
      <View>
        {BRAIN_STATES.map((opt, i) => (
          <BrainStateOptionRow
            key={opt.state}
            option={opt}
            selected={selected === opt.state}
            onPress={setSelected}
            isLast={i === BRAIN_STATES.length - 1}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingStateCheckInScreen;
