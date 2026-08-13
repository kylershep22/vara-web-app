/**
 * Step 2 of 8 — Outcome. Single-select over the four OutcomeKey values.
 *
 * NOT SKIPPABLE, and it is the only required answer in the arc besides capacity:
 * the pair (outcome, capacity) is what selectProtocol() needs to resolve the
 * first week's protocol, so an arc that reached the terminal without it would
 * have nothing to open a cycle with.
 *
 * The four options are rendered from OUTCOME_KEYS rather than a local list, so
 * the screen cannot drift from the locked taxonomy.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { OUTCOME_KEYS, type OutcomeKey } from '../../../protocolEngine';
import { OUTCOME_BLURBS, OUTCOME_COPY, OUTCOME_LABELS } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';
import { OptionRow } from '../../../components/shared/OptionRow';

export const OnboardingV3OutcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { outcome, setOutcome } = useOnboardingV3();

  // Select and advance are separate: tapping an option sets it, the CTA moves
  // on. A tap-to-advance would make a mis-tap unrecoverable without a back.
  const pick = useCallback((key: OutcomeKey) => setOutcome(key), [setOutcome]);

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Outcome)}
      totalSteps={V3_TOTAL_STEPS}
      title={OUTCOME_COPY.title}
      subtitle={OUTCOME_COPY.subtitle}
      primaryLabel={OUTCOME_COPY.primary}
      primaryDisabled={!outcome}
      onPrimary={() => navigation.navigate(V3_ROUTES.Why)}
      onBack={() => navigation.goBack()}
    >
      <View>
        {OUTCOME_KEYS.map((key) => (
          <OptionRow
            key={key}
            label={OUTCOME_LABELS[key]}
            description={OUTCOME_BLURBS[key]}
            selected={outcome === key}
            onPress={() => pick(key)}
            testID={`v3-outcome-${key}`}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingV3OutcomeScreen;
