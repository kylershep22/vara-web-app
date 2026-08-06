/**
 * Step 8 of 8 — Terminal.
 *
 * SUB-STEP 1 SCOPE: screens only. This screen renders and its CTA is inert on
 * purpose. The persistence (sub-step 2) and the first weekly-cycle write
 * (sub-step 3) land here, in that order, and nothing before them should write
 * anything: an arc that half-persists is worse to debug than one that does not
 * persist at all.
 *
 * No back affordance. Everything behind it has been answered, and the writes
 * that will live here are not re-runnable.
 */
import React from 'react';
import { CheckCircle2 } from 'lucide-react-native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { DONE_COPY } from './copy';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3DoneScreen: React.FC = () => {
  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Done)}
      totalSteps={V3_TOTAL_STEPS}
      title={DONE_COPY.title}
      subtitle={DONE_COPY.subtitle}
      primaryLabel={DONE_COPY.primary}
      // Inert in sub-step 1. Wired in sub-steps 2 and 3.
      onPrimary={() => {}}
      decorativeIcon={CheckCircle2}
      centerContent
    />
  );
};

export default OnboardingV3DoneScreen;
