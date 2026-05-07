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
import type { CheckInFlowContext } from '../../components/checkin/flow/browseRunTypes';
import type {
  BrainState,
  IntentPath,
  ProtocolTimeWindow,
} from '../../types/models';

export interface PracticeRunRouteParams {
  protocolId: string;
  // The state the user filtered on at Practices index. Forwarded to
  // GuidedSessionPlayer (which requires a stateBefore for its
  // recovery summary). When this run came from CheckInFlow (Bug B
  // fix, round 5), it doubles as the captured stateBefore on the
  // ProtocolSession record.
  stateBefore: BrainState;
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
    if (!fromCheckInFlow) return undefined;
    return {
      state: stateBefore,
      timeWindow,
      intentPath: intentPath ?? 'default',
    };
  }, [fromCheckInFlow, timeWindow, stateBefore, intentPath]);

  const handleComplete = useCallback(() => {
    // Bug B fix (round 5): when CheckInFlow context is present, route
    // to dashboard. The user originated in CheckInFlow; their mental
    // model is "I checked in, I ran a protocol, take me home." Stack
    // shape on this path: Dashboard → CheckInFlow → Practices →
    // PracticeRun. popToTop unwinds back to Dashboard in one move.
    //
    // When context is absent (true browse — no production entry as of
    // round 5), preserve the legacy locked decision and goBack to
    // Practices.
    if (checkInFlowContext) {
      navigation.popToTop();
      return;
    }
    navigation.goBack();
  }, [navigation, checkInFlowContext]);

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
