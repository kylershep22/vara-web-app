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
    case 'response':
      return reduceResponse(state, action);
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
  const ctx = state.checkInFlowContext;

  // Check-in continuation path (ctx present) — the 5-state re-check feeds
  // the response acknowledgment screen + transition classifier. Untouched
  // by B-3b Issue 2 (the check-in-launched path keeps the 5-state vocab).
  if (action.type === 'state_after_selected') {
    if (ctx) {
      return {
        step: 'response',
        protocol: state.protocol,
        sessionStartedAt: state.sessionStartedAt,
        sessionEndedAt: state.sessionEndedAt,
        durationActualSeconds: state.durationActualSeconds,
        stateAfter: action.stateAfter,
        outcome: classifyOutcome(ctx.state, action.stateAfter),
        checkInFlowContext: ctx,
      };
    }
    // True browse no longer renders the 5-state re-check, so it never
    // dispatches this. Defensive no-op (the reflection path is below).
    return state;
  }

  // True-browse path (ctx absent) — B-3b Issue 2: the modern felt
  // reflection replaces the 5-state re-check. The reflectionId is persisted
  // as-is; NO stateAfter is synthesized from the chip. Case 4 short-circuit
  // to flow_complete preserved (capture data and route, no response screen).
  if (action.type === 'reflection_selected') {
    return {
      step: 'flow_complete',
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
      stateAfter: null,
      reflectionId: action.reflectionId,
      checkInFlowContext: ctx,
      userChosenNextStep: null,
    };
  }
  return state;
}

function reduceResponse(
  state: Extract<BrowseRunFlowState, { step: 'response' }>,
  action: BrowseRunFlowAction
): BrowseRunFlowState {
  if (action.type === 'next_step_chosen') {
    return {
      step: 'flow_complete',
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
      stateAfter: state.stateAfter,
      // Check-in continuation path records a 5-state re-check, not a reflection.
      reflectionId: null,
      checkInFlowContext: state.checkInFlowContext,
      userChosenNextStep: action.choice,
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
// Schema mapping branches on checkInFlowContext (Bug B fix, round 6):
//
//   - context PRESENT (Path 1: "See other options"; Path 2: "Try
//     something longer") — the session is structurally a CheckInFlow
//     session that exited to BrowseRunFlow. stateBefore is taken from
//     the captured context. On flow_complete, outcome is computed
//     via classifyOutcome(context.state, stateAfter). Round 12 fix
//     (Finding H): userChosenNextStep is now the user's actual
//     response-screen choice (try_longer / rest_later / dismissed),
//     captured at the new `response` step. Replaces the prior always-
//     null write that produced the round-2 'auto_dismissed' fragility.
//
//   - context ABSENT (true browse — the Energy hub browse path, B-3b) —
//     stateBefore=null, outcome='browse_launched', userChosenNextStep=null
//     (no response step renders without ctx). B-3b Issue 2: the post-protocol
//     step is now the modern felt reflection, so the row also carries
//     `reflectionId` and stateAfter stays null (no 5-state is synthesized
//     from the reflection chip). Existing browse_launched shape + reflectionId,
//     NOT a new third shape.

export function mapBrowseTerminalToPayload(
  terminal: BrowseTerminalFlowState,
  intentPath: IntentPath
): ProtocolSessionWritePayload {
  const ctx = terminal.checkInFlowContext;
  // Round 12: userChosenNextStep is captured on flow_complete (the
  // response step's `next_step_chosen` action sets it). For abandoned
  // (no response step ever runs) and ctx-absent flow_complete (true-
  // browse short-circuit), it stays null.
  const userChosenNextStep =
    terminal.step === 'flow_complete' ? terminal.userChosenNextStep : null;
  const base = {
    protocolId: terminal.protocol.id,
    stateBefore: ctx ? ctx.state : null,
    // Round 10: ctx.timeWindow may be undefined when the session
    // came from the "Try something longer" path (which intentionally
    // drops the budget filter). Fall back to the protocol's
    // intrinsic timeWindow in that case — it's the most honest value
    // for "what duration did the user actually commit to" since they
    // didn't pick a fresh budget chip.
    timeWindowSelected:
      ctx?.timeWindow ?? terminal.protocol.timeWindow,
    durationActualSeconds: terminal.durationActualSeconds,
    userChosenNextStep,
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
    // Check-in continuation: the 5-state re-check → response step always
    // carries a concrete BrainState (the null case below is unreachable for
    // ctx-present flow_complete, guarded defensively rather than asserted).
    const stateAfter = terminal.stateAfter;
    if (stateAfter === null) {
      return { ...base, stateAfter: null, outcome: 'browse_launched' };
    }
    return {
      ...base,
      stateAfter,
      outcome: classifyOutcome(ctx.state, stateAfter),
    };
  }
  // True browse (B-3b Issue 2): the existing browse_launched row shape PLUS
  // the felt-reflection id. stateAfter stays null — the reflection chip is
  // NOT mapped to a synthesized 5-state.
  return {
    ...base,
    stateAfter: null,
    outcome: 'browse_launched',
    reflectionId: terminal.reflectionId,
  };
}
