// CheckInFlow — composition of the Phase 2 multi-step check-in
// surface. Owns the reducer; renders the active step's view; wires
// the GuidedSessionPlayer when running; observes the two terminal
// steps (abandoned / flow_complete) and surfaces them to the parent
// via `onComplete`.
//
// Reducer is opaque to the player (locked decision A): the player's
// onExit callback dispatches a single `player_exit` action with
// reason='completed' or 'ended_early', mapped from the player's
// ProtocolSessionSummary.
//
// Locked decision B is enforced two ways:
//   1. The reducer no-ops `back` from running, re_check, response,
//      and either terminal step (see flowReducer's per-step handlers).
//   2. This component does not render a back affordance during the
//      running / re_check / response steps. There's no UI surface to
//      tap, so a stray dispatch never gets through.
//
// Session-write side effect:
//   For sub-step 2.2, this component does NOT call
//   protocolSession.service yet — that wiring is part of sub-step
//   2.5's caller migration. The terminal-state effect logs the
//   would-be write so device testing can verify the right data
//   arrives. Sub-step 2.5 replaces the log with a real Firestore
//   write.

import React, { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import type {
  BrainState,
  ProtocolTimeWindow,
} from '../../../types/models';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { ProtocolRecommendation } from '../ProtocolRecommendation';
import { TimeWindowSelector } from '../TimeWindowSelector';

import { flowReducer, initFlow } from './reducer';
import type { FlowInit, FlowState } from './types';
import { StatePickStepView } from './StatePickStepView';
import { ReCheckStepView } from './ReCheckStepView';
import { ResponseStepView } from './ResponseStepView';

export interface CheckInFlowProps {
  init: FlowInit;
  // Fires once when the flow reaches a terminal state. Parent owns:
  //   - Persisting the ProtocolSession record (sub-step 2.5).
  //   - Navigating to Today, Practices, etc.
  //   - Unmounting this component.
  onComplete: (terminal: TerminalFlowState) => void;
  // Top-left close affordance. Available only on state_pick,
  // time_pick, recommendation. Hidden during running / re_check /
  // response per locked decision B. Optional — overwhelm-entry
  // typically wires this to nothing (the only escape during a
  // running protocol is End early through the player).
  onClose?: () => void;
  // Recommendation screen's "See other options" affordance. The
  // parent screen owns navigation; this component just hands off
  // the (state, timeWindow) pair so Practices can filter to the
  // user's current eligibility envelope. Optional — when omitted,
  // the affordance no-ops with a logger warning so device testing
  // surfaces the gap.
  onSeeOtherOptions?: (
    state: BrainState,
    timeWindow: ProtocolTimeWindow
  ) => void;
}

// Public alias of the two terminal variants. Convenient for parents
// that want to switch on `step` without importing every variant.
export type TerminalFlowState = Extract<
  FlowState,
  { step: 'abandoned' } | { step: 'flow_complete' }
>;

export function CheckInFlow({
  init,
  onComplete,
  onClose,
  onSeeOtherOptions,
}: CheckInFlowProps) {
  const [state, dispatch] = useReducer(
    flowReducer,
    init,
    initFlow
  );

  // Terminal-state observer. The reducer transitions to abandoned or
  // flow_complete; this effect surfaces that to the parent exactly
  // once. Logging the would-be ProtocolSession payload is a 2.2
  // affordance for device testing — sub-step 2.5 replaces with the
  // real Firestore write.
  useEffect(() => {
    if (state.step === 'abandoned' || state.step === 'flow_complete') {
      logger.log('[CheckInFlow] Terminal state reached', {
        step: state.step,
        protocolId: state.protocol.id,
        stateBefore: state.stateBefore,
        durationActualSeconds: state.durationActualSeconds,
        // Conditional fields kept narrow for log clarity.
        ...(state.step === 'flow_complete' && {
          stateAfter: state.stateAfter,
          outcome: state.outcome,
          userChosenNextStep: state.userChosenNextStep,
        }),
      });
      onComplete(state);
    }
    // Intentionally narrow: re-run only when the step changes. State
    // mutations within a non-terminal step (none currently exist;
    // every transition produces a new step) wouldn't fire this.
  }, [state, onComplete]);

  return (
    <View style={styles.container} testID="checkin-flow">
      {renderStep(state, dispatch, onClose, onSeeOtherOptions)}
    </View>
  );
}

// Pure rendering switch. Pulled out as a function so the test surface
// for terminal-state handling stays in the container useEffect, not
// in the render path.
function renderStep(
  state: FlowState,
  dispatch: React.Dispatch<Parameters<typeof flowReducer>[1]>,
  onClose?: () => void,
  onSeeOtherOptions?: (
    state: BrainState,
    timeWindow: ProtocolTimeWindow
  ) => void
): React.ReactNode {
  switch (state.step) {
    case 'state_pick':
      return (
        <StatePickStepView
          onSelect={(brainState) =>
            dispatch({ type: 'state_selected', state: brainState })
          }
          onClose={onClose}
        />
      );

    case 'time_pick':
      return (
        <TimeWindowSelector
          onSelect={(timeWindow) =>
            dispatch({ type: 'time_selected', timeWindow })
          }
          onBack={() => dispatch({ type: 'back' })}
          onClose={onClose}
        />
      );

    case 'recommendation':
      return (
        <ProtocolRecommendation
          protocol={state.protocol}
          brainState={state.stateBefore}
          timeWindow={state.timeWindow}
          onBegin={() =>
            dispatch({ type: 'protocol_begin', nowMs: Date.now() })
          }
          onSeeOtherOptions={() => {
            if (onSeeOtherOptions) {
              onSeeOtherOptions(state.stateBefore, state.timeWindow);
            } else {
              logger.warn(
                '[CheckInFlow] onSeeOtherOptions invoked but parent did not provide a handler'
              );
            }
          }}
          onBack={() => dispatch({ type: 'back' })}
          onClose={onClose}
        />
      );

    case 'running':
      return (
        <GuidedSessionPlayer
          protocol={state.protocol}
          stateBefore={state.stateBefore}
          onExit={(summary) => {
            dispatch({
              type: 'player_exit',
              reason: summary.completed ? 'completed' : 'ended_early',
              nowMs: Date.now(),
            });
          }}
        />
      );

    case 're_check':
      return (
        <ReCheckStepView
          protocol={state.protocol}
          onSelect={(stateAfter) =>
            dispatch({ type: 'state_after_selected', stateAfter })
          }
        />
      );

    case 'response':
      return (
        <ResponseStepView
          stateBefore={state.stateBefore}
          stateAfter={state.stateAfter}
          outcome={state.outcome}
          durationActualSeconds={state.durationActualSeconds}
          onChoose={(choice) =>
            dispatch({ type: 'next_step_chosen', choice })
          }
        />
      );

    case 'abandoned':
    case 'flow_complete':
      // Terminal states. Parent's onComplete handler unmounts this
      // component on the same tick — render an empty container to
      // avoid a flash of blank UI between dispatch and unmount.
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
});
