/**
 * Step 4 of 8 — Capacity. Single-select over the THREE shipped tiers.
 *
 * NOT SKIPPABLE: with the outcome, this pair is what selectProtocol() resolves,
 * so the terminal has nothing to open a cycle with if it is missing.
 *
 * Rendered from CAPACITY_TIERS, which is capacity-DESCENDING (normal, limited,
 * slammed) and is the single ordering source the engine's tier-step helpers also
 * read. Do not re-order locally.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { CAPACITY_TIERS, type CapacityTier } from '../../../weeklyEngine';
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
      title={CAPACITY_COPY.title}
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
