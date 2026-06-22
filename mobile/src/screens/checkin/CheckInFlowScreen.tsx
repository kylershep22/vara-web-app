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
import type { Slot } from '../../engine';
import {
  clearMarker as clearFlowMarker,
  readMarkerForRecoveryOffer,
} from '../../utils/flowSessionMarker';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { ROUTES } from '../../navigation/routes';

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
    slot: Slot;
    state: BrainState;
    timeWindow?: ProtocolTimeWindow;
    fromCheckInFlow?: boolean;
    intentPath?: IntentPath;
  };
  PracticeRun: { protocolId: string; stateBefore: BrainState };
  // Focus-session pointer hand-off (Pomodoro screen). `fromCheckIn` closes the
  // loop: a focus session launched from the check-in returns to the Focus
  // reflection on "Done for now". A directly-started Pomodoro omits it.
  // `durationMinutes` is the budget-derived prefill length so the timer opens at
  // the user's chosen budget instead of the 25-min default.
  FocusTimer: { fromCheckIn: true; durationMinutes?: number } | undefined;
  // Plan pointer hand-off targets the Rhythms tab (routines live there).
  Main: { screen: 'Rhythms' } | undefined;
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
    (slot: Slot, timeWindow: ProtocolTimeWindow, stateBefore: BrainState) => {
      // The engine slot drives PracticesIndexScreen's eligiblePractices filter;
      // the bridged BrainState rides along for the downstream PracticeRun /
      // BrowseRunFlow (still five-state). fromCheckInFlow + intentPath plumb the
      // BrowseRunFlow context (classification + post-completion routing).
      navigation.navigate('Practices', {
        slot,
        state: stateBefore,
        timeWindow,
        fromCheckInFlow: true,
        intentPath: CHECKIN_FLOW_INTENT_PATH,
      });
    },
    [navigation]
  );

  const handleComplete = useCallback(
    (terminal: TerminalFlowState) => {
      // Abandoned mid-practice — return to wherever the user was.
      if (terminal.step === 'abandoned') {
        navigation.goBack();
        return;
      }

      // flow_complete. A launched pointer (focus-session / plan) hands off to
      // Pomodoro / routines; everything else returns to the launching surface.
      const completion = terminal.completion;
      const pointer =
        completion.kind === 'pointer_only'
          ? completion.pointerLaunched
          : completion.kind === 'practice'
            ? completion.pointerLaunched
            : null;

      if (pointer) {
        if (pointer.type === 'focus-session') {
          // replace removes the dead CheckInFlow frame so back from Focus
          // lands on the launching surface, not a blank check-in. fromCheckIn
          // closes the loop — the focus session returns to the Focus reflection.
          // durationMinutes prefills the timer at the budget-derived length.
          navigation.replace('FocusTimer', {
            fromCheckIn: true,
            ...(pointer.length !== undefined
              ? { durationMinutes: pointer.length }
              : {}),
          });
        } else {
          // plan pointer → routines on the Rhythms tab. Navigating to Main
          // (already below CheckInFlow in the stack) pops the flow.
          navigation.navigate(ROUTES.Main, { screen: ROUTES.Rhythms });
        }
        return;
      }

      // No pointer (practice with no continuation, zero-slot, declined offer).
      navigation.goBack();
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
