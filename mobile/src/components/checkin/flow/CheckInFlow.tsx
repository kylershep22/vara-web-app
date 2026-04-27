// CheckInFlow — composition of the Phase 2 multi-step check-in
// surface. Owns the reducer; renders the active step's view; wires
// the GuidedSessionPlayer when running; observes the two terminal
// steps (abandoned / flow_complete) and (a) writes the
// ProtocolSession record + legacy brainStateCheckIns parallel write,
// (b) surfaces the terminal to the parent via `onComplete` so the
// parent handles navigation.
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
// Firestore writes (sub-step 2.5):
//   The terminal useEffect calls `writeStandardFlowSession` fire-
//   and-forget — UX shouldn't block on Firestore. Errors are logged
//   inside the writer and don't propagate to onComplete. The parent's
//   navigation happens immediately on terminal-state arrival.
//   `writeMode='dev_dry_run'` skips both writes (new + legacy) and
//   logs the payload via logger.log — used by the dev harness.

import React, { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import type {
  BrainState,
  IntentPath,
  ProtocolTimeWindow,
} from '../../../types/models';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { ProtocolRecommendation } from '../ProtocolRecommendation';
import { TimeWindowSelector } from '../TimeWindowSelector';
import { writeStandardFlowSession } from '../../../services/firebase/brainStateCheckIn.service';

import { flowReducer, initFlow } from './reducer';
import type { FlowInit, FlowState } from './types';
import { StatePickStepView } from './StatePickStepView';
import { ReCheckStepView } from './ReCheckStepView';
import { ResponseStepView } from './ResponseStepView';

export type CheckInFlowWriteMode = 'production' | 'dev_dry_run';

export interface CheckInFlowProps {
  init: FlowInit;
  // Required — the authenticated user. Used as the prefix of the
  // ProtocolSession doc ID and as the write target's userId field.
  userId: string;
  // Fires once when the flow reaches a terminal state. Parent owns
  // navigation. Firestore writes happen inside this component before
  // onComplete fires (fire-and-forget — the writes don't block the
  // callback).
  onComplete: (terminal: TerminalFlowState) => void;
  // Optional — Phase 3 wires the user's resolved intent path through
  // the flow. Until then, defaults to 'default' (the only path the
  // 2.3 copy tables populate).
  intentPath?: IntentPath;
  // Optional — controls the Firestore write behavior. Production
  // callers omit (defaults to 'production', real writes); dev harness
  // passes 'dev_dry_run' to skip writes and log payloads instead.
  writeMode?: CheckInFlowWriteMode;
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
  userId,
  onComplete,
  intentPath = 'default',
  writeMode = 'production',
  onClose,
  onSeeOtherOptions,
}: CheckInFlowProps) {
  const [state, dispatch] = useReducer(
    flowReducer,
    init,
    initFlow
  );

  // Terminal-state observer. Fires the Firestore writes
  // (fire-and-forget, errors logged inside the writer) and surfaces
  // the terminal to the parent for navigation. The parent's
  // onComplete runs immediately — UX doesn't block on Firestore.
  useEffect(() => {
    if (state.step === 'abandoned' || state.step === 'flow_complete') {
      const dryRun = writeMode === 'dev_dry_run';
      writeStandardFlowSession(userId, state, intentPath, { dryRun }).catch(
        (error) => {
          // The writer logs internally; this catch keeps the
          // unhandled rejection from bubbling. Production callers'
          // onComplete still fires; navigation continues. The
          // explicit "session NOT persisted" wording matters: the
          // legacy brainStateCheckIns write may still have succeeded
          // (or vice versa), but the message that a TestFlight
          // tester / on-call sees needs to make the data-loss
          // consequence visible — silent-failure mode is the risk.
          logger.error(
            '[CheckInFlow] writeStandardFlowSession failed (session NOT persisted to protocolSessions):',
            error
          );
        }
      );
      onComplete(state);
    }
    // Intentionally narrow: re-run only when the step changes. State
    // mutations within a non-terminal step (none currently exist;
    // every transition produces a new step) wouldn't fire this.
  }, [state, onComplete, userId, intentPath, writeMode]);

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
