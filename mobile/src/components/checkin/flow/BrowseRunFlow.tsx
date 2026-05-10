// BrowseRunFlow — Case 4 mini-flow per Core Loop v2 §Case 4.
//
// State machine: running → re_check → flow_complete | abandoned.
//
// Used by PracticeRunScreen when the user launches a protocol from
// the Practices index without going through the standard check-in
// flow. The user has already self-selected the protocol; this flow
// plays it and captures stateAfter at re-check so we still get a
// state-transition data point (re-check IS the measurement, per
// Build Guide §1).
//
// Differences from CheckInFlow:
//   - No state_pick / time_pick / recommendation steps.
//   - No response screen (Core Loop v2 line 309-310 says capture
//     data and route to Today; SPEC_CONSISTENCY_BACKLOG overrides
//     to Practices index).
//   - stateBefore is null in the written ProtocolSession — no
//     pre-protocol check-in was captured.
//   - No legacy brainStateCheckIns parallel write — browse-launched
//     sessions didn't exist in v1, no backward-compat dependency.
//
// Writes happen inside this component's terminal useEffect via
// writeProtocolSession (fire-and-forget). writeMode controls
// production vs dev_dry_run identically to CheckInFlow.

import React, { useEffect, useReducer, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import type {
  BrainState,
  IntentPath,
  MovementModality,
  Protocol,
  ProtocolSessionSummary,
} from '../../../types/models';
import { writeProtocolSession } from '../../../services/firebase/protocolSession.service';
import {
  writeBrainStateCheckInDoc,
  maybeMarkFirstShift,
} from '../../../services/firebase/brainStateCheckIn.service';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { LightMovementProtocolFlow } from '../../protocol/LightMovementProtocolFlow';
import { ReCheckStepView } from './ReCheckStepView';
import { ResponseStepView } from './ResponseStepView';
import {
  browseRunReducer,
  initBrowseRunFlow,
  mapBrowseTerminalToPayload,
} from './browseRunReducer';
import type {
  BrowseRunFlowState,
  BrowseTerminalFlowState,
  CheckInFlowContext,
} from './browseRunTypes';

export type BrowseRunFlowWriteMode = 'production' | 'dev_dry_run';

export interface BrowseRunFlowProps {
  protocol: Protocol;
  // The state the user filtered on at the Practices index. Forwarded
  // to GuidedSessionPlayer because the player's signature requires
  // it (used for the recovery summary). NOT written to the
  // ProtocolSession record — Case 4 sessions persist stateBefore=null.
  stateBefore: BrainState;
  userId: string;
  // Required at the call site — the parent navigates back to
  // Practices on terminal entry.
  onComplete: (terminal: BrowseTerminalFlowState) => void;
  // Optional — Phase 3 wires the user's resolved intent path; until
  // then, defaults to 'default'.
  intentPath?: IntentPath;
  // Optional — defaults to 'production'. Dev harness uses 'dev_dry_run'.
  writeMode?: BrowseRunFlowWriteMode;
  // Sub-step 2.7 round 4 (Obs 10) — fired when the Light Movement
  // pre-timer modality picker's Cancel/X is tapped. Parent navigates
  // back to the launching surface (typically Practices index). No
  // session has started, so no terminal write fires for this path.
  // Optional — non-Light-Movement protocols never invoke this.
  onCancel?: () => void;
  // Sub-step 2.7 round 5 (Bug B fix) — present when this BrowseRunFlow
  // was launched from CheckInFlow (Path 1: "See other options"; Path
  // 2: "Try something longer"). When present, the terminal write
  // produces a standard outcome via classifyOutcome, captures
  // stateBefore from context, and the parent routes to dashboard
  // rather than Practices. Absent for true browse entries (no
  // production entry today; reserved for future standalone Practices
  // entry surfaces).
  checkInFlowContext?: CheckInFlowContext;
}

export function BrowseRunFlow({
  protocol,
  stateBefore,
  userId,
  onComplete,
  intentPath = 'default',
  writeMode = 'production',
  onCancel,
  checkInFlowContext,
}: BrowseRunFlowProps) {
  const [state, dispatch] = useReducer(
    browseRunReducer,
    { protocol, nowMs: Date.now(), checkInFlowContext },
    initBrowseRunFlow
  );

  // Sub-step 2.7 round 4 (Obs 10) — selected modality for the
  // brief-movement family's pre-timer picker. Stored in a ref so it
  // can be appended to the terminal write payload without inflating
  // the BrowseRunFlowState union for a single-protocol concern.
  const selectedModalityRef = useRef<MovementModality | null>(null);

  // Round 7 (Bug A v2 / Bug B follow-up): when CheckInFlowContext is
  // present, the BrowseRunFlow session is structurally a CheckInFlow
  // session that exited to BrowseRunFlow. The dashboard reads the
  // legacy `brainStateCheckIns` collection (NOT `protocolSessions`)
  // to decide "show chip picker vs show summary." Without the legacy
  // write, the dashboard sees null after BrowseRunFlow returns and
  // flips back to the chip picker — the same dashboard-stale symptom
  // originally reported in round 4.
  //
  // Mirror CheckInFlow's terminal pattern:
  //   1. Authoritative protocolSessions write.
  //   2. When context present: legacy + first-shift via shared helper.
  //   3. Promise.all wraps both alongside a 1500ms minimum display
  //      window. onComplete fires only after Promise.all resolves —
  //      same race-prevention shape that closed the original Obs 11.
  useEffect(() => {
    if (state.step !== 'abandoned' && state.step !== 'flow_complete') return;

    const dryRun = writeMode === 'dev_dry_run';
    const payload = mapBrowseTerminalToPayload(state, intentPath);
    const selectedModality = selectedModalityRef.current;
    if (selectedModality != null) {
      payload.selectedModality = selectedModality;
    }
    const ctx = state.checkInFlowContext;
    let cancelled = false;

    (async () => {
      try {
        const writes: Promise<unknown>[] = [
          writeProtocolSession(userId, payload, { dryRun }),
        ];
        if (ctx) {
          // Round 14 split — was a single
          // writeBrainStateCheckInLegacyEffects call. Now two
          // independent helpers run in sequence inside an async
          // wrapper so the Promise.all timing is unchanged.
          // BrowseRunFlow's ctx-present sessions are CheckInFlow
          // continuations with a user-attested stateBefore (from
          // ctx.state), so both writes fire — overwhelm-style
          // skipping doesn't apply here (overwhelm enters via
          // CheckInFlow, never BrowseRunFlow).
          //
          // Round 15 (dashboard summary card stateBefore-vs-
          // stateAfter fix): same step-based conditional applied
          // here as in writeStandardFlowSession. For flow_complete,
          // pass state.stateAfter (the user's post-protocol
          // attestation captured by BrowseRunFlow's own re_check).
          // For abandoned, fall back to ctx.state (the only
          // attestation available — re-check never ran in a
          // BrowseRunFlow session that abandoned, and the original
          // CheckInFlow context's state is the most recent
          // attestation we have for the user).
          const stateForLegacyDoc =
            state.step === 'flow_complete' ? state.stateAfter : ctx.state;
          writes.push(
            (async () => {
              await writeBrainStateCheckInDoc(
                userId,
                stateForLegacyDoc,
                state.step === 'flow_complete',
                // Round 8 (Bug F fix): pass the actually-completed
                // protocol's id so the legacy doc reflects what the
                // user ran, not the default-recommended fallback
                // (which produced the "Light Movement — Completed"
                // mislabel when the user actually ran Cold Water
                // Reset, etc.).
                state.protocol.id,
                { dryRun }
              );
              await maybeMarkFirstShift(userId, payload.outcome, {
                dryRun,
              });
            })()
          );
        }
        await Promise.all([
          ...writes,
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch (error) {
        // Silent-failure visibility: BrowseRunFlow's authoritative
        // write failure means zero data lands for this session.
        // (Legacy + first-shift errors are swallowed inside the
        // helpers; only the protocolSessions write can throw here.)
        logger.error(
          '[BrowseRunFlow] writeProtocolSession failed (session NOT persisted):',
          error
        );
      }
      if (cancelled) return;
      onComplete(state);
    })();

    return () => {
      cancelled = true;
    };
  }, [state, onComplete, userId, intentPath, writeMode]);

  // Top-edge SafeAreaView per Observation 5 (sub-step 2.7 round 2).
  // Mirrors CheckInFlow's wrapper — same modal presentation, same
  // status-bar overlap risk. Bottom edge intentionally unhandled —
  // step views render their own bottom-anchored controls.
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
      testID="browse-run-flow"
    >
      {renderStep(
        state,
        dispatch,
        stateBefore,
        (modality) => {
          selectedModalityRef.current = modality;
        },
        onCancel
      )}
    </SafeAreaView>
  );
}

function renderStep(
  state: BrowseRunFlowState,
  dispatch: React.Dispatch<Parameters<typeof browseRunReducer>[1]>,
  stateBefore: BrainState,
  onModalitySelected?: (modality: MovementModality) => void,
  onCancel?: () => void
): React.ReactNode {
  switch (state.step) {
    case 'running': {
      const handlePlayerExit = (summary: ProtocolSessionSummary) => {
        dispatch({
          type: 'player_exit',
          reason: summary.completed ? 'completed' : 'ended_early',
          nowMs: Date.now(),
        });
      };
      // Sub-step 2.7 round 4 (Obs 10) — Light Movement uses a
      // pre-timer modality picker. All other protocols mount the
      // player directly with no behavior change.
      if (state.protocol.family === 'brief-movement') {
        return (
          <LightMovementProtocolFlow
            protocol={state.protocol}
            stateBefore={stateBefore}
            onExit={handlePlayerExit}
            onModalitySelected={onModalitySelected}
            onCancel={onCancel ?? (() => {})}
          />
        );
      }
      return (
        <GuidedSessionPlayer
          protocol={state.protocol}
          stateBefore={stateBefore}
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
      // Round 12 (Finding H fix) — response step renders only when
      // checkInFlowContext is present (the round-6 Bug B continuation
      // paths). All inputs come from the captured context + the
      // re_check transition. ResponseStepView is the same component
      // CheckInFlow uses, so Path 1/2 users get the same emotional
      // resolution as standard CheckInFlow users.
      return (
        <ResponseStepView
          stateBefore={state.checkInFlowContext.state}
          stateAfter={state.stateAfter}
          outcome={state.outcome}
          durationActualSeconds={state.durationActualSeconds}
          intentPath={state.checkInFlowContext.intentPath}
          onChoose={(choice) =>
            dispatch({ type: 'next_step_chosen', choice })
          }
        />
      );
    case 'abandoned':
    case 'flow_complete':
      // Terminal — parent unmounts on entry.
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
});
