/**
 * Step 6 of 8 — First win. SKIPPABLE, and the only screen in the arc that hands
 * the whole viewport to another component.
 *
 * PINNED, NOT RESOLVED. The practice is looked up directly by id via
 * getProtocolById('cyclic-sighing-2') rather than through resolveOnboardingProtocol
 * / the resolve() engine. The engine picks FROM A STATE, and this arc never asks
 * for one: there is no brain-state read anywhere in V3, so there would be nothing
 * to resolve from. Cyclic Sighing is already the library-invariant onboarding
 * fallback (DEFAULT_ONBOARDING_PROTOCOL_ID), phone-only, and two minutes.
 *
 * Two phases in one screen rather than two routes: an intro that can be skipped,
 * then the player. GuidedSessionPlayer owns the full screen and has no skip
 * affordance of its own, so the choice has to be offered before it mounts.
 *
 * `stateBefore` is null. That is the documented value for a session with no
 * pre-protocol check-in, and it is threaded only into the force-quit marker and
 * the in-memory summary. Nothing is persisted from this session in this slice.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Wind } from 'lucide-react-native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { GuidedSessionPlayer } from '../../../components/protocol/GuidedSessionPlayer';
import { getProtocolById } from '../../../constants/brainStateProtocols';
import { DEFAULT_ONBOARDING_PROTOCOL_ID } from '../../../constants/onboardingStressRecovery';
import { FIRST_WIN_COPY } from './copy';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3FirstWinScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [playing, setPlaying] = useState(false);

  // DEFAULT_ONBOARDING_PROTOCOL_ID is 'cyclic-sighing-2'. Referenced through the
  // constant rather than the raw string so the pin cannot drift from the one the
  // V2 arc treats as its library invariant.
  const protocol = useMemo(
    () => getProtocolById(DEFAULT_ONBOARDING_PROTOCOL_ID),
    []
  );

  const advance = useCallback(
    () => navigation.navigate(V3_ROUTES.Reminder),
    [navigation]
  );

  if (playing && protocol) {
    return (
      <GuidedSessionPlayer
        protocol={protocol}
        stateBefore={null}
        // Fires on natural completion AND on end-early. Either way the arc
        // moves on: the practice is the win, not finishing it.
        onExit={advance}
        // Backing out at the preroll returns to the intro rather than skipping
        // the step, so a mis-tap on Start is recoverable.
        onExitBeforeStart={() => setPlaying(false)}
      />
    );
  }

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.FirstWin)}
      totalSteps={V3_TOTAL_STEPS}
      title={FIRST_WIN_COPY.title}
      // Library invariant: this protocol always ships. If it were ever missing,
      // say so plainly and let the user move on rather than dead-ending them.
      subtitle={protocol ? FIRST_WIN_COPY.subtitle : FIRST_WIN_COPY.unavailable}
      primaryLabel={FIRST_WIN_COPY.primary}
      primaryDisabled={!protocol}
      onPrimary={() => setPlaying(true)}
      onSkip={advance}
      onBack={() => navigation.goBack()}
      decorativeIcon={Wind}
      centerContent
    />
  );
};

export default OnboardingV3FirstWinScreen;
