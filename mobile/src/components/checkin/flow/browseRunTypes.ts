// Type definitions for BrowseRunFlow — sub-step 2.5's Case 4
// mini-flow per Core Loop v2 §Case 4.
//
// Original state machine (sub-step 2.5):
//   running → re_check → flow_complete | abandoned.
// Round 12 update (Finding H fix): when CheckInFlowContext is
// present, an additional response step renders between re_check
// and flow_complete:
//   running → re_check → response → flow_complete | abandoned (ctx)
//   running → re_check → flow_complete | abandoned             (no ctx)
// B-3b Issue 2: the `re_check` step now renders DIFFERENT views by ctx —
// the deprecated 5-state ReCheckStepView for the check-in continuation
// (ctx present), and the modern felt ReflectionStepView for true browse
// (ctx absent). The state-machine shape above is unchanged; only the
// ctx-absent transition carries a reflectionId (via `reflection_selected`)
// instead of a synthesized stateAfter (via `state_after_selected`).
//
// Why the round-12 split: sub-step 2.5's original Case 4 design
// assumed true-browse sessions (Practices-launched, no CheckInFlow
// context). After Bug B (round 6) plumbed CheckInFlowContext through
// Path 1 ("See other options") and Path 2 ("Try something longer"),
// every production BrowseRunFlow session is a CheckInFlow
// continuation. Skipping the response screen broke UX symmetry —
// CheckInFlow continuation users got no acknowledgment after the
// protocol while standard CheckInFlow users did. The context-absent
// branch is preserved for any future standalone-Practices entry
// (no production entry today).
//
// Why separate from CheckInFlow:
//   - The reducers genuinely diverge — Case 4 has no state_pick,
//     no recommendation, and no shifted/not-shifted response
//     branching. Threading 'browse_launched' through CheckInFlow's
//     reducer would mean guarding every transition against "are we
//     in browse mode?"
//   - The reducers share the inner ReCheckStepView and
//     ResponseStepView components (extracted in earlier sub-steps).
//     Visual parallelism preserved.
//   - Easier to test the Case 4 happy path in isolation.

import type { ClassifierOutcome } from '../../../services/outcomeClassifier';
import type {
  BrainState,
  IntentPath,
  Protocol,
  ProtocolTimeWindow,
} from '../../../types/models';
import type { UserChosenNextStep } from './types';

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
//
// Round 10 (Finding 3): timeWindow is optional. The "Try something
// longer" path omits it — the user's promise to themselves is
// "longer than what I just ran," not a fresh budget pick. When
// absent, the session's timeWindowSelected falls back to the
// protocol's intrinsic timeWindow at write time.
export interface CheckInFlowContext {
  state: BrainState;
  timeWindow?: ProtocolTimeWindow;
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
  | BrowseResponseStep
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

// Round 12 (Finding H fix) — response step. Reached only when
// `state_after_selected` fires AND `checkInFlowContext` was present
// (the round-6 Bug B continuation paths). When ctx is absent, the
// re_check → flow_complete short-circuit preserves true-browse
// behavior. Carries `outcome` (already classified) so the parent
// renders ResponseStepView without re-running the classifier.
export interface BrowseResponseStep {
  step: 'response';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
  // Always non-null on this step — the response step exists ONLY
  // when ctx is present. Narrowed for the parent's render shape.
  checkInFlowContext: CheckInFlowContext;
}

// Terminal — re-check / reflection completed. The post-protocol
// attestation differs by path (B-3b Issue 2):
//   - context present (check-in continuation): the 5-state re-check ran,
//     so `stateAfter` is a concrete BrainState and `reflectionId` is null.
//     outcome via classifyOutcome(context.state, stateAfter);
//     stateBefore=context.state. Routing: dashboard.
//   - context absent (true browse): the modern felt reflection ran, so
//     `reflectionId` is the chosen chip id and `stateAfter` is NULL (we do
//     NOT synthesize a 5-state from the reflection). outcome='browse_launched';
//     stateBefore=null. Routing: Practices index per SPEC_CONSISTENCY_BACKLOG
//     "Case 4 routing target after re-check".
export interface BrowseFlowCompleteStep {
  step: 'flow_complete';
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  // Concrete BrainState on the check-in continuation path; null on true
  // browse (reflection path) — no 5-state is synthesized from the chip.
  stateAfter: BrainState | null;
  // Felt-reflection chip id on the true-browse path; null on the check-in
  // continuation path (which still records a 5-state re-check).
  reflectionId: string | null;
  checkInFlowContext: CheckInFlowContext | null;
  // Round 12 (Finding H fix) — populated by `next_step_chosen`
  // when the response step ran (ctx-present continuation paths).
  // Null on the ctx-absent path (true browse skips response, so
  // no choice was made). The mapper writes this to
  // ProtocolSession.userChosenNextStep, replacing the prior
  // always-null behavior that produced the round-2 'auto_dismissed'
  // fragility flagged in PHASE_NOTES.
  userChosenNextStep: UserChosenNextStep | null;
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────
// Pure-state-machine reducer; side effects (writes, navigation)
// happen in the parent BrowseRunFlow component / its caller.

export type BrowseRunFlowAction =
  | { type: 'player_exit'; reason: BrowseRunPlayerExitReason; nowMs: number }
  // Check-in continuation path only (ctx present): the 5-state re-check.
  | { type: 'state_after_selected'; stateAfter: BrainState }
  // True-browse path only (ctx absent): the modern felt reflection. Carries
  // the chosen chip id; no BrainState is synthesized (B-3b Issue 2).
  | { type: 'reflection_selected'; reflectionId: string }
  | { type: 'next_step_chosen'; choice: UserChosenNextStep };

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
