/**
 * Step 3 of 10 — A2, the route explanation. New in journey slice 4.
 *
 * THE ONE SCREEN THAT EXPLAINS THE DETOUR. The user has just named what they
 * want; the app is about to start them on Remove, which is not that. Roadmap
 * section 6 item 4 calls A2 "the bait-and-switch mitigation for the whole
 * journey", and it earns that only by arriving immediately after the pick.
 * Section 9 item 1 chose step 3 over Jen's step 5 for exactly that reason:
 * waiting weakens the connection between the promise and the explanation.
 *
 * ASKS NOTHING. It is the only screen in the arc with no answer to collect, so
 * it stores nothing and has no disabled state. Its primary is the only way
 * forward, which is what makes it read as an explanation the user accepts
 * rather than a question they answer.
 *
 * THE BODY AND THE STRIP ARE SHARED WITH THE POST-MIGRATION SCREEN on Home
 * (screens/journey/MigrationRouteScreen). Only the chrome differs: this one
 * carries the arc's step indicator and a back affordance, that one carries
 * neither because it is not in an arc.
 *
 * NOT REACHABLE WITHOUT A DESTINATION. The screen before it cannot advance
 * until one is picked, so `destination` is present here by construction. The
 * guard covers the impossible route rather than trapping the user over it:
 * with no destination there is no body to render and no strip to draw, and
 * going back one step is the only recoverable answer.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { RouteExplainerBody } from '../../../components/journey/RouteExplainerBody';
import { A2_COPY } from '../../../constants/journeyCopy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3RouteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { destination } = useOnboardingV3();

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Route)}
      totalSteps={V3_TOTAL_STEPS}
      title={A2_COPY.sharedTitle}
      primaryLabel={A2_COPY.primary}
      onPrimary={() =>
        destination ? navigation.navigate(V3_ROUTES.Why) : navigation.goBack()
      }
      onBack={() => navigation.goBack()}
    >
      {!!destination && (
        <RouteExplainerBody destination={destination} testID="v3-route" />
      )}
    </OnboardingScaffold>
  );
};

export default OnboardingV3RouteScreen;
