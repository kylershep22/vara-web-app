// Pure reducer for BrowseRunFlow — Case 4's three-step state machine.
//
// Mirrors the CheckInFlow reducer's structure where applicable:
//   - Pure (no clocks; nowMs injected via action payload).
//   - Terminal states are absorbing (any action returns the same
//     state — parent unmounts on entry).
//   - Locked decision: ended_early short-circuits to abandoned
//     (re-check never runs), same as the standard flow.

import type { IntentPath } from '../../../types/models';
import type { ProtocolSessionWritePayload } from '../../../services/firebase/protocolSession.service';
import type {
  BrowseRunFlowAction,
  BrowseRunFlowInit,
  BrowseRunFlowState,
  BrowseTerminalFlowState,
} from './browseRunTypes';

// ────────────────────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────────────────────

export function initBrowseRunFlow(
  init: BrowseRunFlowInit
): BrowseRunFlowState {
  return {
    step: 'running',
    protocol: init.protocol,
    sessionStartedAt: init.nowMs,
  };
}

// ────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────

export function browseRunReducer(
  state: BrowseRunFlowState,
  action: BrowseRunFlowAction
): BrowseRunFlowState {
  switch (state.step) {
    case 'running':
      return reduceRunning(state, action);
    case 're_check':
      return reduceReCheck(state, action);
    case 'abandoned':
    case 'flow_complete':
      // Terminal — absorbing.
      return state;
  }
}

function reduceRunning(
  state: Extract<BrowseRunFlowState, { step: 'running' }>,
  action: BrowseRunFlowAction
): BrowseRunFlowState {
  if (action.type === 'player_exit') {
    const sessionEndedAt = action.nowMs;
    const durationActualSeconds = Math.max(
      0,
      Math.round((sessionEndedAt - state.sessionStartedAt) / 1000)
    );
    if (action.reason === 'ended_early') {
      return {
        step: 'abandoned',
        protocol: state.protocol,
        sessionStartedAt: state.sessionStartedAt,
        sessionEndedAt,
        durationActualSeconds,
      };
    }
    return {
      step: 're_check',
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt,
      durationActualSeconds,
    };
  }
  return state;
}

function reduceReCheck(
  state: Extract<BrowseRunFlowState, { step: 're_check' }>,
  action: BrowseRunFlowAction
): BrowseRunFlowState {
  if (action.type === 'state_after_selected') {
    return {
      step: 'flow_complete',
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
      stateAfter: action.stateAfter,
    };
  }
  return state;
}

// ────────────────────────────────────────────────────────────
// Terminal → ProtocolSessionWritePayload mapper
// ────────────────────────────────────────────────────────────
// Pure; lives in the reducer module (not BrowseRunFlow.tsx) so the
// reducer tests can import it without pulling in React Native /
// expo-haptics via the component tree.
//
// Case 4 schema mapping:
//   - stateBefore is ALWAYS null (no pre-protocol check-in captured).
//   - outcome is 'browse_launched' on flow_complete, 'abandoned' on
//     abandoned. (Distinct from standard-flow abandons only by
//     stateBefore=null.)
//   - userChosenNextStep is null (no response screen, no choice).
//   - timeWindowSelected is the protocol's intrinsic timeWindow —
//     informationally useful for queries even though the user
//     didn't pick a window.

export function mapBrowseTerminalToPayload(
  terminal: BrowseTerminalFlowState,
  intentPath: IntentPath
): ProtocolSessionWritePayload {
  const base = {
    protocolId: terminal.protocol.id,
    stateBefore: null,
    timeWindowSelected: terminal.protocol.timeWindow,
    durationActualSeconds: terminal.durationActualSeconds,
    userChosenNextStep: null,
    intentPath,
    sessionStartedAt: terminal.sessionStartedAt,
  } as const;

  if (terminal.step === 'abandoned') {
    return {
      ...base,
      stateAfter: null,
      outcome: 'abandoned',
    };
  }
  // step === 'flow_complete'
  return {
    ...base,
    stateAfter: terminal.stateAfter,
    outcome: 'browse_launched',
  };
}
