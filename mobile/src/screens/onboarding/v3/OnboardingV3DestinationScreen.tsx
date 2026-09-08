/**
 * Step 2 of 10 — A1, the destination pick. Single-select over the four
 * DestinationKey values.
 *
 * NOT SKIPPABLE, and it is the only required answer in the arc besides
 * capacity: the destination is written to journeyStates at the terminal and is
 * what every later phase resolves against, so an arc that reached the end
 * without it would have no journey to create.
 *
 * WAS THE OUTCOME SCREEN. Until journey slice 4 this picked an OutcomeKey and
 * rendered OUTCOME_LABELS. It now picks a DestinationKey and renders Jen's
 * DESTINATION_LABELS from Content Pack v1 section A1. The two unions are NOT
 * the same list spelled differently: OutcomeKey's second member is `stress` and
 * DestinationKey's is `calm`. Nothing here may index one with the other.
 *
 * The four options are rendered from DESTINATION_KEYS rather than a local list,
 * so the screen cannot drift from the constant the rest of the journey reads.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { DESTINATION_KEYS } from '../../../constants/journey';
import type { DestinationKey } from '../../../types/models';
import { A1_COPY, DESTINATION_BLURBS, DESTINATION_LABELS } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';
import { OptionRow } from '../../../components/shared/OptionRow';

export const OnboardingV3DestinationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { destination, setDestination } = useOnboardingV3();

  // Select and advance are separate: tapping an option sets it, the CTA moves
  // on. A tap-to-advance would make a mis-tap unrecoverable without a back.
  const pick = useCallback(
    (key: DestinationKey) => setDestination(key),
    [setDestination]
  );

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Destination)}
      totalSteps={V3_TOTAL_STEPS}
      title={A1_COPY.title}
      /* NO SUBTITLE. Dropped rather than redrafted; see A1_COPY in copy.ts. */
      primaryLabel={A1_COPY.primary}
      primaryDisabled={!destination}
      /* A2, not Why. Repointed with the insertion: V3_ORDER renumbers the step
         indicator on its own, but this literal is the only thing that decides
         where the arc actually goes. */
      onPrimary={() => navigation.navigate(V3_ROUTES.Route)}
      onBack={() => navigation.goBack()}
    >
      <View>
        {DESTINATION_KEYS.map((key) => (
          <OptionRow
            key={key}
            label={DESTINATION_LABELS[key]}
            description={DESTINATION_BLURBS[key]}
            selected={destination === key}
            onPress={() => pick(key)}
            testID={`v3-destination-${key}`}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingV3DestinationScreen;
