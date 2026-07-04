/**
 * Screen 2 — State check-in (NOT skippable). Rehosted onto the shipped two-tap
 * circumplex read (StatePickStepView), so onboarding's arriving-state read is
 * identical to the daily dashboard check-in the user will use later. Onboarding
 * pins the neutral just_reset situation (chip hidden) and bridges the resulting
 * {arousal, valence} to the legacy five-state value carried forward — the same
 * stateBridge path the dashboard uses — so the downstream valence-branched
 * screens (drivers/peak/bridge/anchor) keep working unchanged and the legacy
 * five-state readers stay fed.
 *
 * Rendered bare (no OnboardingScaffold), like the Protocol screen: it's an
 * immersive read with its own layout that auto-advances on the second tap. It
 * still carries the onboarding step bar (passed to StatePickStepView) so the
 * flow reads continuous with the scaffold screens.
 */
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StatePickStepView } from '../../components/checkin/flow/StatePickStepView';
import { classifyQuadrant } from '../../engine';
import { quadrantToBrainState } from '../../engine/stateBridge';
import { ONBOARDING_SITUATION } from './onboardingCatalog';
import type { Arousal, Valence } from '../../engine/types';
import { useAuth } from '../../context/AuthContext';
import {
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import {
  saveInitialState,
  saveOnboardingStep,
} from '../../services/firebase/onboardingStressRecovery.service';

const OnboardingStateCheckInScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Resume convention: record current location on mount.
  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingStateCheckIn');
  }, [user?.uid]);

  const onSelect = (state: { arousal: Arousal; valence: Valence }) => {
    // Bridge the two-tap read to the five-state value the arc carries forward.
    // Lossless for the four quadrants the read produces; the raw circumplex is
    // re-derived losslessly at the re-check write site.
    const brainState = quadrantToBrainState(
      classifyQuadrant(state.arousal, state.valence)
    );
    // Fire-and-forget: don't hold the transition on the write. Resume re-asks
    // this step if the write failed.
    if (user?.uid) void saveInitialState(user.uid, brainState).catch(() => {});
    navigation.navigate('OnboardingStressor', { state: brainState });
  };

  return (
    <StatePickStepView
      situation={ONBOARDING_SITUATION}
      hideSituationChip
      currentStep={onboardingStepNumber('OnboardingStateCheckIn')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      onSelect={onSelect}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    />
  );
};

export default OnboardingStateCheckInScreen;
