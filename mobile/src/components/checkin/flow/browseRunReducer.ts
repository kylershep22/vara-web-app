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
import { classifyOutcome } from '../../../services/outcomeClassifier';
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
    checkInFlowContext: init.checkInFlowContext ?? null,
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
        checkInFlowContext: state.checkInFlowContext,
      };
    }
    return {
      step: 're_check',
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt,
      durationActualSeconds,
      checkInFlowContext: state.checkInFlowContext,
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
      checkInFlowContext: state.checkInFlowContext,
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
// Schema mapping branches on checkInFlowContext (Bug B fix, round 5):
//
//   - context PRESENT (Path 1: "See other options"; Path 2: "Try
//     something longer") — the session is structurally a CheckInFlow
//     session that exited to BrowseRunFlow. stateBefore is taken from
//     the captured context. On flow_complete, outcome is computed
//     via classifyOutcome(context.state, stateAfter) — same
//     classifier the standard CheckInFlow uses. timeWindowSelected
//     reflects the user's original chip pick (context.timeWindow),
//     not the protocol's intrinsic timeWindow.
//
//   - context ABSENT (true browse — no production entry as of round
//     5; reachable only from dev harnesses) — preserves the original
//     Case 4 mapping: stateBefore=null, outcome='browse_launched',
//     timeWindowSelected=protocol.timeWindow.
//
//   - userChosenNextStep is null in both branches — BrowseRunFlow
//     has no response screen.

export function mapBrowseTerminalToPayload(
  terminal: BrowseTerminalFlowState,
  intentPath: IntentPath
): ProtocolSessionWritePayload {
  const ctx = terminal.checkInFlowContext;
  const base = {
    protocolId: terminal.protocol.id,
    stateBefore: ctx ? ctx.state : null,
    timeWindowSelected: ctx ? ctx.timeWindow : terminal.protocol.timeWindow,
    durationActualSeconds: terminal.durationActualSeconds,
    userChosenNextStep: null,
    // Prefer the context's intentPath (the user's CheckInFlow
    // session inherited it) over the BrowseRunFlow caller's default.
    intentPath: ctx ? ctx.intentPath : intentPath,
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
  if (ctx) {
    return {
      ...base,
      stateAfter: terminal.stateAfter,
      outcome: classifyOutcome(ctx.state, terminal.stateAfter),
    };
  }
  return {
    ...base,
    stateAfter: terminal.stateAfter,
    outcome: 'browse_launched',
  };
}
