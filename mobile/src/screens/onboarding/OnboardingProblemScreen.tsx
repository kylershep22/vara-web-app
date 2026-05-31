/**
 * Screen 1 — Name the problem. Stress-recovery framing with the brain-health
 * "why" as the quiet reason. Self-blame reframe for high-performing users.
 * No input; single primary action. (Directional copy — finalized in a later pass.)
 */
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Wind } from 'lucide-react-native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import {
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';

const OnboardingProblemScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingProblem');
  }, [user?.uid]);

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingProblem')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      decorativeIcon={Wind}
      title="When your system is running hot, focus and follow-through get harder."
      subtitle="That's your nervous system, not a lack of discipline. Vara helps you downshift in a few quiet minutes."
      primaryLabel="Begin"
      onPrimary={() => navigation.navigate('OnboardingStateCheckIn')}
    />
  );
};

export default OnboardingProblemScreen;
