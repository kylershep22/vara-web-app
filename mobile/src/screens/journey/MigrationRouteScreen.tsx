/**
 * A2 for a migrated beta user. Journey slice 4, roadmap section 4's migration
 * branch.
 *
 * WHY IT EXISTS. A beta account that opens the app with weekly history and no
 * journeyStates document is given a journey by the resolver, with a destination
 * derived from the outcome they had already been choosing. Until this slice
 * that happened silently: they were moved onto a four-phase model, started on
 * Remove, and told nothing. This is the one screen that tells them, and it says
 * exactly what a new user is told at onboarding step 3.
 *
 * NOT IN A NAVIGATOR. Home renders it in place of itself for one launch, so
 * there is no route to register, nothing to deep-link and nothing to pop. That
 * is deliberate: a registered route is one a later slice can navigate to twice.
 *
 * IT FIRES ONCE, AND NOT BECAUSE OF ANYTHING HERE. resolveJourney sets
 * `migratedFrom` only on the resolve that CREATES the journey; every launch
 * after that takes rung (a) and never sets it. The journeyStates document
 * existing is the guard. There is no "seen" flag to write, nothing to clean up,
 * and no way for a failed write to leave the user stuck behind this screen.
 *
 * NO STEP INDICATOR AND NO BACK. Both would be lies: this is not step N of an
 * arc, and there is nothing behind it. The scaffold makes both optional, which
 * is why it is reused here rather than a second layout being written.
 */
import React from 'react';

import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { RouteExplainerBody } from '../../components/journey/RouteExplainerBody';
import { A2_COPY } from '../../constants/journeyCopy';
import type { DestinationKey, PhaseKey } from '../../types/models';

interface MigrationRouteScreenProps {
  destination: DestinationKey;
  /** Where the migrated user is starting. 'remove' for every journey today. */
  phaseKey?: PhaseKey;
  /** Dismiss for this session. Home stops rendering this and shows itself. */
  onContinue: () => void;
}

export const MigrationRouteScreen: React.FC<MigrationRouteScreenProps> = ({
  destination,
  phaseKey = 'remove',
  onContinue,
}) => (
  <OnboardingScaffold
    title={A2_COPY.sharedTitle}
    primaryLabel={A2_COPY.primary}
    onPrimary={onContinue}
  >
    <RouteExplainerBody
      destination={destination}
      currentPhase={phaseKey}
      testID="migration-route"
    />
  </OnboardingScaffold>
);

export default MigrationRouteScreen;
