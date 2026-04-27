// Type definitions for BrowseRunFlow — sub-step 2.5's Case 4
// mini-flow per Core Loop v2 §Case 4.
//
// State machine: running → re_check → flow_complete | abandoned.
//
// Three steps total. No state_pick, no time_pick, no recommendation,
// no response. The user came from the Practices index having
// already self-selected a protocol; the flow's job is to play it
// and capture stateAfter at re-check.
//
// Why separate from CheckInFlow:
//   - The reducers genuinely diverge — Case 4 has no state_pick,
//     no recommendation, and no shifted/not-shifted response
//     branching. Threading 'browse_launched' through CheckInFlow's
//     reducer would mean guarding every transition against "are we
//     in browse mode?"
//   - The reducers share the inner ReCheckStepView component
//     (already extracted in 2.2). Visual parallelism preserved.
//   - Easier to test the Case 4 happy path in isolation.

import type { BrainState, Protocol } from '../../../types/models';

// ────────────────────────────────────────────────────────────
// Player exit reason (mirrors the standard flow's type)
// ────────────────────────────────────────────────────────────
export type BrowseRunPlayerExitReason = 'completed' | 'ended_early';

// ────────────────────────────────────────────────────────────
// Flow state — discriminated union by `step`
// ────────────────────────────────────────────────────────────
// Two terminal states (abandoned, flow_complete) — same pattern as
// CheckInFlow.

export type BrowseRunFlowState =
  | BrowseRunningStep
  | BrowseReCheckStep
  | BrowseAbandonedStep
  | BrowseFlowCompleteStep;

export interface BrowseRunningStep {
  step: 'running';
  protocol: Protocol;
  sessionStartedAt: number;
}

// Reached only when the player exits with reason='completed'.
// 'ended_early' short-circuits to BrowseAbandonedStep (same
// short-circuit pattern as the standard flow's locked decision C).
export interface BrowseReCheckStep {
  step: 're_check';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// Terminal — abandoned short-circuit. Reached only via
// player_exit { reason: 'ended_early' } from the running step.
// stateAfter is unset (re-check never ran). Parent observes
// step === 'abandoned', writes ProtocolSession with
// outcome='abandoned' + stateBefore=null + stateAfter=null,
// navigates back to the Practices index.
export interface BrowseAbandonedStep {
  step: 'abandoned';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// Terminal — re-check completed. Carries the captured stateAfter.
// Parent observes step === 'flow_complete', writes ProtocolSession
// with outcome='browse_launched' + stateBefore=null +
// stateAfter=captured, navigates back to the Practices index per
// SPEC_CONSISTENCY_BACKLOG "Case 4 routing target after re-check".
export interface BrowseFlowCompleteStep {
  step: 'flow_complete';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  stateAfter: BrainState;
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────
// Pure-state-machine reducer; side effects (writes, navigation)
// happen in the parent BrowseRunFlow component / its caller.

export type BrowseRunFlowAction =
  | { type: 'player_exit'; reason: BrowseRunPlayerExitReason; nowMs: number }
  | { type: 'state_after_selected'; stateAfter: BrainState };

// ────────────────────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────────────────────
export interface BrowseRunFlowInit {
  protocol: Protocol;
  nowMs: number; // sessionStartedAt for the running step
}

// Public alias of the two terminal variants. Same convenience pattern
// as CheckInFlow's TerminalFlowState.
export type BrowseTerminalFlowState = Extract<
  BrowseRunFlowState,
  { step: 'abandoned' } | { step: 'flow_complete' }
>;
