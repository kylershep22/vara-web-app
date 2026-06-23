// PracticeRun — wrapper that mounts BrowseRunFlow for a single
// user-selected protocol from the Practices index.
//
// Sub-step 2.5 update — replaces the bare GuidedSessionPlayer +
// goBack pattern with the Case 4 mini-flow per Core Loop v2 §Case 4.
// The user still picks a protocol from Practices and runs it; the
// difference is that re-check now runs at the end so we capture a
// state-transition data point. ProtocolSession is written with
// outcome='browse_launched' and stateBefore=null.
//
// Routing on terminal: back to Practices index per the override in
// SPEC_CONSISTENCY_BACKLOG "Case 4 routing target after re-check"
// (the spec says Today; we route to Practices to preserve the
// user's exploration context).

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography } from '../../constants';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { useAuth } from '../../context/AuthContext';
import { BrowseRunFlow } from '../../components/checkin/flow/BrowseRunFlow';
import type {
  BrowseTerminalFlowState,
  CheckInFlowContext,
} from '../../components/checkin/flow/browseRunTypes';
import { getLateNightNSDRSwap } from '../../services/lateNightNSDRSwap';
import type {
  BrainState,
  IntentPath,
  ProtocolTimeWindow,
} from '../../types/models';

export interface PracticeRunRouteParams {
  protocolId: string;
  // The state the user filtered on at Practices index, or null for a true
  // browse pick (Energy hub) with no pre-protocol state. Forwarded to
  // GuidedSessionPlayer (recovery summary only). When this run came from
  // CheckInFlow (Bug B fix, round 5) it is always a real state and doubles
  // as the captured stateBefore on the ProtocolSession record.
  stateBefore: BrainState | null;
  // Sub-step 2.7 round 5 (Bug B fix) — when present and true, this
  // PracticeRun was launched from CheckInFlow (via "See other
  // options" or "Try something longer"). Combined with intentPath
  // and timeWindow, builds the BrowseRunFlow's checkInFlowContext.
  // When absent or false, the legacy true-browse behavior applies
  // (outcome='browse_launched', stateBefore=null, route to Practices).
  fromCheckInFlow?: boolean;
  intentPath?: IntentPath;
  timeWindow?: ProtocolTimeWindow;
}

type RouteParams = RouteProp<
  { PracticeRun: PracticeRunRouteParams },
  'PracticeRun'
>;

// Native-stack supports popToTop which unwinds the entire stack to
// the root screen (Dashboard). Used by Bug B fix to return home
// after a CheckInFlow-launched browse session completes.
type NavigationProp = NativeStackNavigationProp<Record<string, object | undefined>>;

export function PracticeRunScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { protocolId, stateBefore, fromCheckInFlow, intentPath, timeWindow } =
    route.params;
  const protocol = getProtocolById(protocolId);

  // Sub-step 2.7 round 5 (Bug B fix) — build the CheckInFlowContext
  // when the route was reached from CheckInFlow. Both Path 1 ("See
  // other options") and Path 2 ("Try something longer") flow through
  // PracticesIndexScreen which forwards fromCheckInFlow + intentPath
  // (+ timeWindow on the Path 1 / "See other options" surface).
  //
  // Round 10 (Finding 3): timeWindow is now OPTIONAL on the context.
  // The "Try something longer" path omits it because the affordance's
  // intent contradicts a fresh budget pick. The context is still
  // built in that case — fromCheckInFlow alone is sufficient to
  // identify a CheckInFlow continuation. mapBrowseTerminalToPayload
  // falls back to the protocol's intrinsic timeWindow when
  // ctx.timeWindow is null.
  const checkInFlowContext = useMemo<CheckInFlowContext | undefined>(() => {
    // CheckInFlow continuations always carry a real stateBefore; a true browse
    // pick passes null and has no context. The `stateBefore == null` guard makes
    // that type-safe (CheckInFlowContext.state is a non-null BrainState) without
    // fabricating a state — null means "no pre-state captured."
    if (!fromCheckInFlow || stateBefore == null) return undefined;
    return {
      state: stateBefore,
      timeWindow,
      intentPath: intentPath ?? 'default',
    };
  }, [fromCheckInFlow, timeWindow, stateBefore, intentPath]);

  const handleComplete = useCallback(
    (terminal: BrowseTerminalFlowState) => {
      // Bug B fix (round 6): when CheckInFlow context is present, the
      // session is a CheckInFlow continuation; routing branches on
      // the user's response-screen choice (round 12 Finding H added
      // the response step in BrowseRunFlow). Mirrors
      // CheckInFlowScreen.handleComplete's switch.
      //
      // When context is absent (true browse — no production entry),
      // preserve the legacy locked decision: goBack to Practices.

      // Abandoned terminal — never reached the response step.
      // Dashboard or Practices depending on context.
      if (terminal.step === 'abandoned') {
        if (checkInFlowContext) {
          navigation.popToTop();
        } else {
          navigation.goBack();
        }
        return;
      }

      // step === 'flow_complete'
      if (!checkInFlowContext) {
        // True browse — preserve legacy goBack-to-Practices.
        navigation.goBack();
        return;
      }

      // CheckInFlow continuation — route by the response-screen
      // choice. Stack shape: Dashboard → CheckInFlow → Practices
      // → PracticeRun. popToTop unwinds back to Dashboard in one
      // move; the try_longer branches use replace (round 14
      // sibling-of-CheckInFlow-fix) so the current PracticeRun is
      // removed from the stack at the moment of transition. Without
      // replace, PracticeRun (in BrowseRunFlow's flow_complete
      // terminal state, render=null) sits underneath the new
      // Practices/PracticeRun screen as a blank white frame; back
      // from the new top of stack would surface the dead frame
      // instead of landing on Dashboard. Same architectural
      // pattern as CheckInFlowScreen.handleComplete try_longer.
      switch (terminal.userChosenNextStep) {
        case 'try_longer': {
          const override = getLateNightNSDRSwap(
            checkInFlowContext.state,
            new Date().getHours()
          );
          if (override !== null) {
            navigation.replace('PracticeRun', {
              protocolId: override.protocolId,
              stateBefore: checkInFlowContext.state,
              fromCheckInFlow: true,
              intentPath: checkInFlowContext.intentPath,
            });
          } else {
            // Round 10 (Finding 3): timeWindow OMITTED — the button's
            // promise is "longer," and a budget filter contradicts
            // that.
            navigation.replace('Practices', {
              state: checkInFlowContext.state,
              fromCheckInFlow: true,
              intentPath: checkInFlowContext.intentPath,
            });
          }
          return;
        }
        case 'rest_later':
        case 'dismissed':
        case 'auto_dismissed':
        case null:
          // All routes to Dashboard. null is defensive (shouldn't
          // occur on flow_complete with ctx, but the type allows it).
          navigation.popToTop();
          return;
      }
    },
    [navigation, checkInFlowContext]
  );

  // Sub-step 2.7 round 4 (Obs 10) — fires when the Light Movement
  // pre-timer modality picker is cancelled. No session was started,
  // so no write fires; we just route back. Cancel routes match the
  // completion routing — dashboard when from CheckInFlow, Practices
  // otherwise.
  const handleCancel = useCallback(() => {
    if (checkInFlowContext) {
      navigation.popToTop();
      return;
    }
    navigation.goBack();
  }, [navigation, checkInFlowContext]);

  if (!protocol) {
    return (
      <View style={styles.errorContainer} testID="practice-run-error">
        <Text style={styles.errorTitle}>Protocol not found</Text>
        <Text style={styles.errorBody}>
          This protocol is no longer available. Try going back and picking
          another option.
        </Text>
      </View>
    );
  }

  if (!user?.uid) {
    // Defensive — AppNavigator shouldn't route here without an
    // authenticated user, but BrowseRunFlow's userId prop is required.
    navigation.goBack();
    return null;
  }

  return (
    <BrowseRunFlow
      protocol={protocol}
      stateBefore={stateBefore}
      userId={user.uid}
      onComplete={handleComplete}
      onCancel={handleCancel}
      checkInFlowContext={checkInFlowContext}
      intentPath={checkInFlowContext?.intentPath}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  errorBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 22,
  },
});
