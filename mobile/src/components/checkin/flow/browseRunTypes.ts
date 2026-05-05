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

import type {
  BrainState,
  IntentPath,
  Protocol,
  ProtocolTimeWindow,
} from '../../../types/models';

// Context plumbed through when BrowseRunFlow is launched FROM
// CheckInFlow (either via "See other options" on the recommendation
// screen, or via "Try something longer" on the not-shifted response
// screen). When present, the terminal write uses the standard
// outcome classifier (shifted/maintenance/partial_shift/not_shifted/
// abandoned) with the captured stateBefore, and post-completion
// routing returns to the dashboard rather than the Practices index.
//
// When absent (true browse — user started from Practices index with
// no prior CheckInFlow session), the legacy behavior is preserved:
// outcome='browse_launched', stateBefore=null, route back to
// Practices.
//
// As of round 5: there is no production entry to Practices outside
// CheckInFlow, so the absent branch is reachable only from dev
// harnesses. It is preserved as a defensive default and as the
// surface Phase 4+ would hook into if a standalone Practices entry
// is ever added.
export interface CheckInFlowContext {
  state: BrainState;
  timeWindow: ProtocolTimeWindow;
  intentPath: IntentPath;
}

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
  checkInFlowContext: CheckInFlowContext | null;
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
  checkInFlowContext: CheckInFlowContext | null;
}

// Terminal — abandoned short-circuit. Reached only via
// player_exit { reason: 'ended_early' } from the running step.
// stateAfter is unset (re-check never ran). Parent observes
// step === 'abandoned', writes ProtocolSession with
// outcome='abandoned' + stateAfter=null. stateBefore is taken
// from checkInFlowContext when present, otherwise null.
// Routing: dashboard when checkInFlowContext present, Practices
// index when absent.
export interface BrowseAbandonedStep {
  step: 'abandoned';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  checkInFlowContext: CheckInFlowContext | null;
}

// Terminal — re-check completed. Carries the captured stateAfter.
// Parent observes step === 'flow_complete' and writes a
// ProtocolSession; the outcome and stateBefore depend on
// checkInFlowContext:
//   - context present: outcome via classifyOutcome(context.state,
//     stateAfter); stateBefore=context.state. Routing: dashboard.
//   - context absent: outcome='browse_launched'; stateBefore=null.
//     Routing: Practices index per SPEC_CONSISTENCY_BACKLOG
//     "Case 4 routing target after re-check".
export interface BrowseFlowCompleteStep {
  step: 'flow_complete';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  stateAfter: BrainState;
  checkInFlowContext: CheckInFlowContext | null;
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
  // Optional. Present when BrowseRunFlow is launched from
  // CheckInFlow (Path 1: "See other options"; Path 2: "Try
  // something longer"). Absent for true browse entries (dev
  // harnesses today; future standalone Practices entry).
  checkInFlowContext?: CheckInFlowContext;
}

// Public alias of the two terminal variants. Same convenience pattern
// as CheckInFlow's TerminalFlowState.
export type BrowseTerminalFlowState = Extract<
  BrowseRunFlowState,
  { step: 'abandoned' } | { step: 'flow_complete' }
>;
