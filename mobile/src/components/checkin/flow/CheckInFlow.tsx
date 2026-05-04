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

import React, { useEffect, useReducer, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import type {
  BrainState,
  IntentPath,
  MovementModality,
  ProtocolSessionSummary,
  ProtocolTimeWindow,
} from '../../../types/models';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { LightMovementProtocolFlow } from '../../protocol/LightMovementProtocolFlow';
import { ProtocolRecommendation } from '../ProtocolRecommendation';
import { TimeWindowSelector } from '../TimeWindowSelector';
import { writeStandardFlowSession } from '../../../services/firebase/brainStateCheckIn.service';
import {
  clearMarker as clearFlowMarker,
  writeMarker as writeFlowMarker,
} from '../../../utils/flowSessionMarker';

import { flowReducer, initFlow } from './reducer';
import type { FlowInit, FlowState } from './types';
import { StatePickStepView } from './StatePickStepView';
import { ReCheckStepView } from './ReCheckStepView';
import { RecoveryConfirmStepView } from './RecoveryConfirmStepView';
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

  // Sub-step 2.7 round 4 (Obs 10) — selected modality for the
  // brief-movement family's pre-timer picker. Stored in a ref rather
  // than reducer state so the change doesn't ripple through the
  // FlowState union (this value is captured before `running` and
  // only consumed at the terminal write — adding it to the reducer
  // would inflate every step variant for a single-protocol concern).
  // Read by the terminal-write effect below.
  const selectedModalityRef = useRef<MovementModality | null>(null);

  // Terminal-state observer. Awaits the Firestore write AND a
  // 1500ms minimum display window for the "moving from one state to
  // the next" transition message before surfacing the terminal to
  // the parent for navigation.
  //
  // Why await (Obs 11 fix): the prior fire-and-forget pattern raced
  // the dashboard's useFocusEffect refetch. If the legacy
  // brainStateCheckIns write was still in flight when the dashboard
  // re-read on focus, the predicate (`brainStateCheckIn ? checked-in
  // : pre-checkin`) saw stale null and flipped back to the chip
  // picker. Awaiting the write here closes the window. See
  // PHASE_NOTES "Sub-step 2.7 round 4 — Obs 11 fix".
  //
  // Why the 1500ms floor: the transition message is meaningful UX,
  // not a loading spinner. If the write resolves in 200ms (typical),
  // the user still gets ~1300ms on the affirming message — feels
  // intentional, not laggy. If the write takes longer than 1500ms
  // (rare), navigation waits — preferable to navigating with stale
  // state.
  //
  // Error handling: write failures are caught + logged (preserving
  // the prior "session NOT persisted" wording for log scanners) but
  // do NOT block navigation. A failed write must not strand the user
  // on the message screen — the legacy parallel write may still
  // succeed, and the user can re-engage on their next session.
  useEffect(() => {
    if (state.step !== 'abandoned' && state.step !== 'flow_complete') return;

    const dryRun = writeMode === 'dev_dry_run';
    let cancelled = false;

    const selectedModality = selectedModalityRef.current;
    const writeOptions: Parameters<typeof writeStandardFlowSession>[3] = { dryRun };
    if (selectedModality != null) {
      writeOptions.selectedModality = selectedModality;
    }

    (async () => {
      try {
        await Promise.all([
          writeStandardFlowSession(userId, state, intentPath, writeOptions),
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch (error) {
        // The writer logs internally; this catch keeps the
        // unhandled rejection from bubbling. The explicit "session
        // NOT persisted" wording matters: the legacy
        // brainStateCheckIns write may still have succeeded (or
        // vice versa), but the message that a TestFlight tester /
        // on-call sees needs to make the data-loss consequence
        // visible — silent-failure mode is the risk.
        logger.error(
          '[CheckInFlow] writeStandardFlowSession failed (session NOT persisted to protocolSessions):',
          error
        );
      }
      if (cancelled) return;
      onComplete(state);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally narrow: re-run only when the step changes. State
    // mutations within a non-terminal step (none currently exist;
    // every transition produces a new step) wouldn't fire this.
  }, [state, onComplete, userId, intentPath, writeMode]);

  // Sub-step 2.7 — flow-level force-quit recovery marker.
  //
  //   - On entry to re_check (from running, NOT from recovery_confirm):
  //     write the marker. The "from running" check uses prevStepRef
  //     to skip writing on the recovered-re_check entry path — the
  //     existing marker (with recoveryOfferedAt set) is preserved so
  //     a force-quit during the recovered re_check silent-clears on
  //     next mount instead of looping.
  //   - On entry to response, abandoned, or flow_complete: clear the
  //     marker. response means stateAfter was captured (no need to
  //     recover); the two terminals are defensive.
  //   - On the recovery_confirm → state_pick transition (decline
  //     path): clear the marker. Matches the spec's "Both options
  //     clear the marker." (Confirm path's clear is implicit — the
  //     marker rides through to re_check → response, which clears.)
  //
  // Skipped entirely under writeMode='dev_dry_run' — harness shouldn't
  // pollute AsyncStorage with markers that survive across dev runs.
  //
  // ONE-SHOT GUARANTEE: re_check recovery is one-shot-per-marker. If
  // the user force-quits during recovery_confirm itself, the marker
  // survives but recoveryOfferedAt is set; CheckInFlowScreen's
  // readMarkerForRecoveryOffer will silent-clear instead of looping.
  // If the user force-quits during the RECOVERED re_check, same path
  // — recoveryOfferedAt is still set on the preserved marker.
  const prevStepRef = useRef<FlowState['step']>(state.step);
  useEffect(() => {
    if (writeMode === 'dev_dry_run') {
      prevStepRef.current = state.step;
      return;
    }

    if (state.step === 're_check' && prevStepRef.current !== 'recovery_confirm') {
      // Original re_check entry from running. Write a fresh marker.
      (async () => {
        await writeFlowMarker({
          protocolId: state.protocol.id,
          stateBefore: state.stateBefore,
          timeWindowSelected: state.timeWindow,
          sessionStartedAt: state.sessionStartedAt,
          sessionEndedAt: state.sessionEndedAt,
          durationActualSeconds: state.durationActualSeconds,
          intentPath,
          entrySource: state.entrySource,
          recoveryOfferedAt: null,
        });
      })();
    } else if (
      state.step === 'response' ||
      state.step === 'abandoned' ||
      state.step === 'flow_complete'
    ) {
      clearFlowMarker();
    } else if (
      state.step === 'state_pick' &&
      prevStepRef.current === 'recovery_confirm'
    ) {
      // Decline path. Explicit clear per locked spec ("Both options
      // clear the marker"). Without this, the marker would stay in
      // storage with recoveryOfferedAt set until next mount or
      // expiry — functionally equivalent (next mount silent-clears)
      // but leaves obviously-defunct data lingering.
      clearFlowMarker();
    }

    prevStepRef.current = state.step;
  }, [state, intentPath, writeMode]);

  // Top-edge SafeAreaView per Observation 5 (sub-step 2.7 round 2).
  // Bottom edge intentionally unhandled — step views render their own
  // bottom-anchored controls (PlayerTransport, response CTAs) which
  // already account for home-indicator inset via their own padding.
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
      testID="checkin-flow"
    >
      {renderStep(
        state,
        dispatch,
        onClose,
        onSeeOtherOptions,
        (modality) => {
          selectedModalityRef.current = modality;
        }
      )}
    </SafeAreaView>
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
  ) => void,
  // Sub-step 2.7 round 4 (Obs 10) — only fired by Light Movement's
  // pre-timer picker; other protocols never invoke this.
  onModalitySelected?: (modality: MovementModality) => void
): React.ReactNode {
  switch (state.step) {
    case 'recovery_confirm':
      return (
        <RecoveryConfirmStepView
          protocol={state.recoveredPayload.protocol}
          onConfirm={() => dispatch({ type: 'recovery_confirmed' })}
          onDecline={() => dispatch({ type: 'recovery_declined' })}
        />
      );

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

    case 'running': {
      const handlePlayerExit = (summary: ProtocolSessionSummary) => {
        dispatch({
          type: 'player_exit',
          reason: summary.completed ? 'completed' : 'ended_early',
          nowMs: Date.now(),
        });
      };
      // Sub-step 2.7 round 4 (Obs 10) — Light Movement uses a
      // pre-timer modality picker (Walk vs Stretch). All other
      // protocols mount the player directly with no behavior change.
      // `onClose` doubles as the picker's Cancel target — Cancel on
      // the picker should exit the entire CheckInFlow back to the
      // launching surface (typically Dashboard), which is what
      // onClose already does for state_pick / time_pick /
      // recommendation. If onClose is not provided (rare — only the
      // overwhelm entry omits it), Cancel becomes a no-op.
      if (state.protocol.family === 'brief-movement') {
        return (
          <LightMovementProtocolFlow
            protocol={state.protocol}
            stateBefore={state.stateBefore}
            onExit={handlePlayerExit}
            onModalitySelected={onModalitySelected}
            onCancel={onClose ?? (() => {})}
            timeWindowSelected={state.timeWindow}
          />
        );
      }
      return (
        <GuidedSessionPlayer
          protocol={state.protocol}
          stateBefore={state.stateBefore}
          onExit={handlePlayerExit}
        />
      );
    }

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
          // entrySource threaded for Phase 5's Overwhelm not-shifted
          // copy variant. Unused in 2.6.
          entrySource={state.entrySource}
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
