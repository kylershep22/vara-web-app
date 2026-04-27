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

import React, { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import type {
  BrainState,
  IntentPath,
  Protocol,
} from '../../../types/models';
import { writeProtocolSession } from '../../../services/firebase/protocolSession.service';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { ReCheckStepView } from './ReCheckStepView';
import {
  browseRunReducer,
  initBrowseRunFlow,
  mapBrowseTerminalToPayload,
} from './browseRunReducer';
import type {
  BrowseRunFlowState,
  BrowseTerminalFlowState,
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
}

export function BrowseRunFlow({
  protocol,
  stateBefore,
  userId,
  onComplete,
  intentPath = 'default',
  writeMode = 'production',
}: BrowseRunFlowProps) {
  const [state, dispatch] = useReducer(
    browseRunReducer,
    { protocol, nowMs: Date.now() },
    initBrowseRunFlow
  );

  useEffect(() => {
    if (state.step === 'abandoned' || state.step === 'flow_complete') {
      const dryRun = writeMode === 'dev_dry_run';
      writeProtocolSession(
        userId,
        mapBrowseTerminalToPayload(state, intentPath),
        { dryRun }
      ).catch((error) => {
        // Silent-failure visibility: BrowseRunFlow has NO legacy
        // parallel write to fall back on (Case 4 sessions skip
        // brainStateCheckIns). A failure here means zero data lands
        // for this session.
        logger.error(
          '[BrowseRunFlow] writeProtocolSession failed (session NOT persisted, no legacy fallback):',
          error
        );
      });
      onComplete(state);
    }
  }, [state, onComplete, userId, intentPath, writeMode]);

  return (
    <View style={styles.container} testID="browse-run-flow">
      {renderStep(state, dispatch, stateBefore)}
    </View>
  );
}

function renderStep(
  state: BrowseRunFlowState,
  dispatch: React.Dispatch<Parameters<typeof browseRunReducer>[1]>,
  stateBefore: BrainState
): React.ReactNode {
  switch (state.step) {
    case 'running':
      return (
        <GuidedSessionPlayer
          protocol={state.protocol}
          stateBefore={stateBefore}
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
