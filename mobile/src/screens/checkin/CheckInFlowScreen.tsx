// CheckInFlowScreen — production wrapper around CheckInFlow.
//
// Mounts CheckInFlow with the appropriate FlowInit based on route
// params, threads the authenticated user's userId through, and
// handles the terminal-state navigation (Today, Practices, etc.).
//
// Sub-step 2.5 entry surfaces:
//   - Dashboard chip-tap (stateBefore in route params).
//   - 'Practices' navigation from the recommendation screen's
//     "See other options" affordance — handled by the parent caller
//     before reaching this screen.
//
// The Firestore writes themselves happen inside CheckInFlow's
// terminal useEffect (writeStandardFlowSession). This wrapper owns
// only the navigation routing per the canonical navBranch tag set.

import React, { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import {
  CheckInFlow,
  type TerminalFlowState,
} from '../../components/checkin/flow/CheckInFlow';
import type { FlowInit } from '../../components/checkin/flow/types';
import type { BrainState, ProtocolTimeWindow } from '../../types/models';
import { getLateNightNSDRSwap } from '../../services/lateNightNSDRSwap';

// Route params — discriminated by the same union shape as FlowInit
// so production callers express intent at the navigation layer
// rather than via a side prop.
export type CheckInFlowScreenParams =
  | { entrySource: 'standard' }
  | { entrySource: 'state_preselected'; stateBefore: BrainState }
  | {
      entrySource: 'overwhelm_safety_card';
      protocolId: string;
    };

type RouteParams = RouteProp<
  { CheckInFlow: CheckInFlowScreenParams },
  'CheckInFlow'
>;

type Nav = NativeStackNavigationProp<{
  Practices: { state: BrainState; timeWindow: ProtocolTimeWindow };
  PracticeRun: { protocolId: string; stateBefore: BrainState };
  Main: undefined;
}>;

export function CheckInFlowScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const params = route.params;

  const init: FlowInit = buildFlowInit(params);

  const handleClose = useCallback(() => {
    // Cancellation from the pre-protocol steps — return to the
    // surface the user came from (typically Dashboard).
    navigation.goBack();
  }, [navigation]);

  const handleSeeOtherOptions = useCallback(
    (state: BrainState, timeWindow: ProtocolTimeWindow) => {
      navigation.navigate('Practices', { state, timeWindow });
    },
    [navigation]
  );

  const handleComplete = useCallback(
    (terminal: TerminalFlowState) => {
      // Parent-side navigation routing per the canonical navBranch
      // tag set (PHASE_NOTES sub-step 2.4 + 2.5). The dev harness
      // logs which branch fired; production silently routes.
      if (terminal.step === 'abandoned') {
        // Abandoned mid-protocol — return to wherever the user was
        // (typically Dashboard).
        navigation.goBack();
        return;
      }
      // step === 'flow_complete'
      switch (terminal.userChosenNextStep) {
        case 'try_longer': {
          const override = getLateNightNSDRSwap(
            terminal.stateBefore,
            new Date().getHours()
          );
          if (override !== null) {
            // late_night_nsdr_override
            navigation.navigate('PracticeRun', {
              protocolId: override.protocolId,
              stateBefore: terminal.stateBefore,
            });
          } else {
            // no_override_practices_index
            navigation.navigate('Practices', {
              state: terminal.stateBefore,
              timeWindow: terminal.timeWindow,
            });
          }
          return;
        }
        case 'rest_later':
        case 'dismissed':
        case 'auto_dismissed':
          // All three route to Today (the dashboard). 'rest_later'
          // is the explicit "I'm done now" — Today's surface
          // handles the welcome-back card. The two dismissed paths
          // (positive outcomes) land on Today as the natural next
          // home.
          navigation.goBack();
          return;
      }
    },
    [navigation]
  );

  if (!user?.uid) {
    // Defensive — the AppNavigator should never route here without
    // an authenticated user, but the prop is required.
    logger.warn(
      '[CheckInFlowScreen] no authenticated user; closing flow'
    );
    navigation.goBack();
    return null;
  }

  return (
    <CheckInFlow
      init={init}
      userId={user.uid}
      onComplete={handleComplete}
      onClose={handleClose}
      onSeeOtherOptions={handleSeeOtherOptions}
    />
  );
}

function buildFlowInit(params: CheckInFlowScreenParams): FlowInit {
  switch (params.entrySource) {
    case 'standard':
      return { entrySource: 'standard' };
    case 'state_preselected':
      return {
        entrySource: 'state_preselected',
        stateBefore: params.stateBefore,
      };
    case 'overwhelm_safety_card': {
      // Overwhelm requires a protocol object. The route params carry
      // protocolId only (route params should be serializable); we
      // resolve to the Protocol via getProtocolById here.
      const { getProtocolById } = require('../../constants/brainStateProtocols');
      const protocol = getProtocolById(params.protocolId);
      if (!protocol) {
        throw new Error(
          `[CheckInFlowScreen] Overwhelm entry: protocolId "${params.protocolId}" not in library`
        );
      }
      return {
        entrySource: 'overwhelm_safety_card',
        protocol,
        nowMs: Date.now(),
      };
    }
  }
}
