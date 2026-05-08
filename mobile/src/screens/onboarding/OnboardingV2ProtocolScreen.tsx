/**
 * Onboarding V2 - Protocol Screen
 * Screen 3 of 3: Mounts CheckInFlow with state_preselected entry so the
 * user runs the recommended protocol with the same write contract and
 * re-check measurement as the dashboard chip-tap path. The terminal
 * fires regardless of userChosenNextStep — onboarding completion always
 * routes to dashboard via completeOnboarding.
 *
 * Sub-step 2.7 fix (Observation 3): replaced the TodaysProtocolCard
 * mount, which was a Phase 1-era self-attest UI that never launched a
 * player. The Begin button just toggled an instructions display; Done
 * called markProtocolCompleted (legacy doc only) without ever running
 * the protocol or writing a protocolSessions doc. The replacement
 * preserves Build Guide §1 (state transitions are the atomic unit of
 * value) for the first-protocol experience.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding } from '../../services/firebase/onboarding.service';
import { Colors } from '../../constants';
import { BrainState } from '../../types';
import { logger } from '../../utils/logger';
import {
  CheckInFlow,
  type TerminalFlowState,
} from '../../components/checkin/flow/CheckInFlow';

interface OnboardingV2ProtocolScreenProps {
  navigation: any;
  route: any;
}

const OnboardingV2ProtocolScreen: React.FC<OnboardingV2ProtocolScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { brainState } = route.params as { brainState: BrainState };

  const handleClose = useCallback(() => {
    // Pre-protocol cancellation (time_pick / recommendation steps).
    // Returns to OnboardingV2CheckIn so the user can re-pick their
    // brain state. After protocol_begin, CheckInFlow hides the close
    // affordance per locked decision B (no back during running /
    // re_check / response).
    navigation.goBack();
  }, [navigation]);

  const handleComplete = useCallback(
    async (_terminal: TerminalFlowState) => {
      if (!user?.uid) return;
      try {
        // Notification permission request preserved from the previous
        // onboarding completion path — independent of how the flow
        // terminated. Awaited so the prompt resolves before
        // completeOnboarding flips the AppNavigator listener and the
        // user lands on Dashboard.
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        // Onboarding completes regardless of terminal.step or
        // userChosenNextStep. The canonical navBranch tags
        // (try_longer / rest_later / dismissed / auto_dismissed) are
        // dashboard-context routing decisions; in onboarding the only
        // next step is the dashboard. AppNavigator's onSnapshot
        // listener picks up hasCompletedOnboarding=true and swaps to
        // MainNavigator.
        await completeOnboarding(user.uid);
      } catch (error) {
        logger.error(
          'Error completing onboarding after first protocol:',
          error
        );
      }
    },
    [user]
  );

  if (!user?.uid) return null;

  // Round 12 (Finding G fix) — `hideSeeOtherOptions` hides the
  // recommendation step's "See other options" affordance during
  // onboarding. Reasoning: the Practices index is unreachable from
  // the onboarding stack, so the affordance would tap-through to a
  // no-op handler (CheckInFlow's wrapper logged a warn but the
  // user saw nothing happen). Surfacing the affordance with no
  // destination violates Build Guide §6 (clarity over cleverness)
  // and the first-protocol experience already introduces the
  // brain state model, time windows, the protocol concept, and
  // the check-in/protocol/re-check loop simultaneously — adding a
  // browse-alternative decision point at this moment also
  // contradicts §4 (calm over stimulation). The button becomes
  // available on the second daily check-in onward when the user
  // has baseline context. This is a UX gate, not an architectural
  // limitation — the navigation chain to Practices from the
  // onboarding stack remains unreachable by design.
  //
  // onSeeOtherOptions stays omitted because the affordance won't
  // render; if a future onboarding redesign wires Practices into
  // the onboarding stack, both this prop and the handler can be
  // wired up together.
  return (
    <View style={styles.container}>
      <CheckInFlow
        init={{
          entrySource: 'state_preselected',
          stateBefore: brainState,
        }}
        userId={user.uid}
        onComplete={handleComplete}
        onClose={handleClose}
        hideSeeOtherOptions
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
});

export default OnboardingV2ProtocolScreen;
