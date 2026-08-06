/**
 * Step 1 of 8 — Cold open. Orientation only: no question, no input, no write.
 *
 * Exists so the first thing a new account sees is not a form. It is the one
 * screen in the arc with no back affordance, because there is nothing behind it.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Sunrise } from 'lucide-react-native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { COLD_OPEN_COPY } from './copy';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3ColdOpenScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.ColdOpen)}
      totalSteps={V3_TOTAL_STEPS}
      title={COLD_OPEN_COPY.title}
      subtitle={COLD_OPEN_COPY.subtitle}
      primaryLabel={COLD_OPEN_COPY.primary}
      onPrimary={() => navigation.navigate(V3_ROUTES.Outcome)}
      decorativeIcon={Sunrise}
      centerContent
    />
  );
};

export default OnboardingV3ColdOpenScreen;
