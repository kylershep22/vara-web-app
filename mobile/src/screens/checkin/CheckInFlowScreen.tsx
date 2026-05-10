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

import React, { useCallback, useEffect, useState } from 'react';
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
import type {
  BrainState,
  IntentPath,
  ProtocolTimeWindow,
} from '../../types/models';
import { getLateNightNSDRSwap } from '../../services/lateNightNSDRSwap';
import {
  clearMarker as clearFlowMarker,
  readMarkerForRecoveryOffer,
} from '../../utils/flowSessionMarker';
import { getProtocolById } from '../../constants/brainStateProtocols';

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
  Practices: {
    state: BrainState;
    // Round 10: timeWindow is now optional. Standard "See other
    // options" path on the recommendation screen still passes it
    // (the user's original budget). The "Try something longer"
    // path omits it so PracticesIndexScreen surfaces all eligible
    // protocols for the state across all time budgets.
    timeWindow?: ProtocolTimeWindow;
    fromCheckInFlow?: boolean;
    intentPath?: IntentPath;
  };
  PracticeRun: { protocolId: string; stateBefore: BrainState };
  Main: undefined;
}>;

// Sub-step 2.7 round 5 (Bug B fix) — until Phase 3 wires real intent
// paths through, both CheckInFlow.intentPath and the params passed
// to Practices default to 'default'. When Phase 3 lands, replace
// this constant with whatever resolution logic resolves the user's
// intent path at flow time.
const CHECKIN_FLOW_INTENT_PATH: IntentPath = 'default';

export function CheckInFlowScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const params = route.params;

  // Sub-step 2.7 — async marker check before constructing FlowInit.
  // The marker resolution lives at the screen layer (not in
  // CheckInFlow's reducer init) because protocol resolution can fail
  // (protocol retired between force-quit and recovery), and useReducer's
  // lazy initializer can't safely throw — error boundaries catch
  // crashes uncatchably from the parent. Resolving here lets us
  // silently fall back to normal flow on any failure.
  //
  // Resolution policy:
  //   - No marker / outside 30-min timeout / recoveryOfferedAt set →
  //     marker silent-cleared by readMarkerForRecoveryOffer; normal
  //     buildFlowInit(params).
  //   - Marker eligible AND protocol resolves → 'recovery' FlowInit
  //     with the resolved Protocol attached to the recoveredPayload.
  //   - Marker eligible BUT protocol retired → silent clear, normal
  //     buildFlowInit(params). Phase 1 sessionMarker uses the same
  //     "carry recovery-essential data on the marker" defense; for
  //     re_check the live Protocol is needed for the chip display
  //     (and Phase 5 not-shifted copy branching), so we can't fall
  //     back to a synthetic.
  const [init, setInit] = useState<FlowInit | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const eligible = await readMarkerForRecoveryOffer(Date.now());
      if (cancelled) return;
      if (eligible !== null) {
        const protocol = getProtocolById(eligible.protocolId);
        if (protocol !== null) {
          setInit({
            entrySource: 'recovery',
            recoveredPayload: {
              protocol,
              stateBefore: eligible.stateBefore,
              timeWindow: eligible.timeWindowSelected,
              sessionStartedAt: eligible.sessionStartedAt,
              sessionEndedAt: eligible.sessionEndedAt,
              durationActualSeconds: eligible.durationActualSeconds,
              intentPath: eligible.intentPath,
              entrySource: eligible.entrySource,
            },
          });
          return;
        }
        // Protocol retired — clear the marker (it's already been
        // marked as offered via readMarkerForRecoveryOffer; clearing
        // here ensures no stale data lingers) and fall through.
        await clearFlowMarker();
      }
      setInit(buildFlowInit(params));
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const handleClose = useCallback(() => {
    // Cancellation from the pre-protocol steps — return to the
    // surface the user came from (typically Dashboard).
    navigation.goBack();
  }, [navigation]);

  const handleSeeOtherOptions = useCallback(
    (state: BrainState, timeWindow: ProtocolTimeWindow) => {
      // Bug B fix (round 5): plumb fromCheckInFlow + intentPath so
      // PracticesIndexScreen can forward to PracticeRunScreen, which
      // builds the BrowseRunFlow checkInFlowContext that drives both
      // (a) standard outcome classification on the session write and
      // (b) post-completion routing back to dashboard rather than
      // Practices. See PHASE_NOTES round 5 locked decision.
      navigation.navigate('Practices', {
        state,
        timeWindow,
        fromCheckInFlow: true,
        intentPath: CHECKIN_FLOW_INTENT_PATH,
      });
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
          // Round 14 (try_longer back-button fix) — both branches use
          // navigation.replace instead of navigation.navigate. CheckInFlow
          // is in flow_complete terminal state at this moment; its render
          // returns null. If we push the next screen on top via navigate,
          // the user's back button (header back on Practices, or system
          // back gesture out of PracticeRun) lands on this dead
          // CheckInFlow frame — visible as a blank white screen with
          // only the FAB rendered. replace removes CheckInFlow from the
          // stack so back from Practices/PracticeRun lands on the
          // launching surface (typically Dashboard). The post-completion
          // popToTop pattern (PracticeRunScreen.handleComplete for ctx-
          // present sessions) handles the AFTER-completion case; this
          // handles the BEFORE-second-protocol case.
          if (override !== null) {
            // late_night_nsdr_override
            navigation.replace('PracticeRun', {
              protocolId: override.protocolId,
              stateBefore: terminal.stateBefore,
            });
          } else {
            // no_override_practices_index
            // Bug B fix (round 5) — same fromCheckInFlow + intentPath
            // plumbing as handleSeeOtherOptions above. Path 2 ("Try
            // something longer" on not-shifted response) is also a
            // CheckInFlow continuation: the user did a check-in, did
            // a protocol, and wants to do another one. Their session
            // should classify with the original stateBefore, and
            // post-completion they should land on dashboard.
            //
            // Round 10 (Finding 3): timeWindow is intentionally
            // OMITTED from these nav params. The button's promise is
            // "show me something longer than what I just ran." Passing
            // the original timeWindow filter would re-show the same-
            // budget options (potentially the same protocols, since
            // the eligibility filter is `<= timeWindow`), contradicting
            // the affordance the user just tapped. With timeWindow
            // omitted, PracticesIndexScreen renders the full set of
            // protocols suitable for the user's state across all time
            // budgets. Do not "fix" this by re-adding the filter —
            // see PHASE_NOTES round 10 locked decisions.
            navigation.replace('Practices', {
              state: terminal.stateBefore,
              fromCheckInFlow: true,
              intentPath: CHECKIN_FLOW_INTENT_PATH,
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

  if (init === null) {
    // Brief async wait while readMarkerForRecoveryOffer resolves.
    // AsyncStorage reads complete in single-digit ms in practice, so
    // this typically renders nothing for less than a frame. No
    // spinner needed; a flash of nothing is preferable to a flash of
    // misleading content (e.g. state_pick that immediately replaces
    // itself with recovery_confirm).
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
