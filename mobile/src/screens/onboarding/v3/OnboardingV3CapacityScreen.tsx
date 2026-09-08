/**
 * Step 5 of 10 — Capacity. Single-select over the THREE shipped tiers.
 *
 * NOT SKIPPABLE: with the destination, this pair is what the terminal needs,
 * and the answer is also the SEED the daily picker falls back to on a day the
 * user has not picked (roadmap section 4). It is written to
 * userPrivate.capacitySeed, which is where resolveJourney reads it from since
 * journey slice 4 retired the read off the weekly cycle.
 *
 * THE TITLE IS THE DAILY PICKER'S QUESTION, deliberately the same string. See
 * CAPACITY_COPY in copy.ts for why the week-scoped one it replaced was wrong.
 *
 * Rendered from CAPACITY_TIERS, which is capacity-DESCENDING (normal, limited,
 * slammed) and is the single ordering source the engine's tier-step helpers also
 * read. Do not re-order locally.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { CAPACITY_TIERS, type CapacityTier } from '../../../protocolEngine';
import { CAPACITY_QUESTION } from '../../../constants/capacityCopy';
import { CAPACITY_COPY, CAPACITY_GLOSSES, CAPACITY_LABELS } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';
import { OptionRow } from '../../../components/shared/OptionRow';

export const OnboardingV3CapacityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { capacity, setCapacity } = useOnboardingV3();

  const pick = useCallback((tier: CapacityTier) => setCapacity(tier), [setCapacity]);

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Capacity)}
      totalSteps={V3_TOTAL_STEPS}
      title={CAPACITY_QUESTION}
      subtitle={CAPACITY_COPY.subtitle}
      primaryLabel={CAPACITY_COPY.primary}
      primaryDisabled={!capacity}
      onPrimary={() => navigation.navigate(V3_ROUTES.Floor)}
      onBack={() => navigation.goBack()}
    >
      <View>
        {CAPACITY_TIERS.map((tier) => (
          <OptionRow
            key={tier}
            label={CAPACITY_LABELS[tier]}
            description={CAPACITY_GLOSSES[tier]}
            selected={capacity === tier}
            onPress={() => pick(tier)}
            testID={`v3-capacity-${tier}`}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingV3CapacityScreen;
