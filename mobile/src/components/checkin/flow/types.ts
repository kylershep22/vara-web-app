// Type definitions for the Phase 2 sub-step 2.2 multi-step check-in
// flow. Locked decisions captured in `docs/PHASE_NOTES.md` "Sub-step
// 2.2 entry — locked decisions"; design rationale in chat checkpoints
// preceding sub-step 2.2 composition.

import type {
  BrainState,
  Protocol,
  ProtocolTimeWindow,
} from '../../../types/models';
import type { ClassifierOutcome } from '../../../services/outcomeClassifier';

// ────────────────────────────────────────────────────────────
// Entry source
// ────────────────────────────────────────────────────────────
// Drives flow shape and response copy. Overwhelm Safety Card
// (Core Loop v2 §Case 3) skips state-pick AND time-pick AND
// recommendation — the Safety Card itself is the consent moment,
// adding a recommendation screen at peak distress would be friction
// in the wrong direction.
export type FlowEntrySource = 'standard' | 'overwhelm_safety_card';

// ────────────────────────────────────────────────────────────
// Player exit reason — the only player signal the flow observes
// ────────────────────────────────────────────────────────────
// Player is OPAQUE to this reducer (locked decision A). Internal
// player states (paused, force-quit recovery, audio retry, etc.)
// never reach the flow. The flow receives one of these on the
// player's onExit callback.
export type PlayerExitReason = 'completed' | 'ended_early';

// ────────────────────────────────────────────────────────────
// User's chosen next step (terminal-state value)
// ────────────────────────────────────────────────────────────
// Captured at FlowCompleteStep. Distinguishes user-tap-dismiss
// ('dismissed') from auto-timeout-dismiss ('auto_dismissed') because
// Phase 5 Patterns may care about the difference (an auto-timeout
// after a positive shift is a quieter signal than an explicit tap).
export type UserChosenNextStep =
  | 'try_longer'
  | 'rest_later'
  | 'dismissed'
  | 'auto_dismissed';

// ────────────────────────────────────────────────────────────
// Flow state — discriminated union by `step`
// ────────────────────────────────────────────────────────────
// Each variant carries forward the data accumulated by that point.
// Type-level guarantee: by FlowCompleteStep you have every field the
// ProtocolSession write needs. Two terminal states (AbandonedStep,
// FlowCompleteStep) — parent observes either to write the session
// and unmount the flow.

export type FlowState =
  | StatePickStep
  | TimePickStep
  | RecommendationStep
  | RunningStep
  | ReCheckStep
  | ResponseStep
  | AbandonedStep
  | FlowCompleteStep;

export interface StatePickStep {
  step: 'state_pick';
  entrySource: FlowEntrySource; // always 'standard' here; field retained for uniformity
}

export interface TimePickStep {
  step: 'time_pick';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
}

// The recommender (selectProtocol) runs synchronously during the
// time→recommendation transition. selectProtocol is pure, so calling
// it inside the reducer does not violate reducer purity. In __DEV__
// it throws on no-match (sub-step 2.1 fix-forward, commit 90a5da9);
// that is contract enforcement — see the reducer's purity comment.
export interface RecommendationStep {
  step: 'recommendation';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
}

// Player runs here. Back navigation DISABLED (locked decision B).
// `sessionStartedAt` is the wall-clock timestamp the parent captured
// at dispatch time and passed in via the action payload — keeps the
// reducer pure (no `Date.now()` inside).
export interface RunningStep {
  step: 'running';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
  sessionStartedAt: number; // ms since epoch
}

// Reached only when the player exits with `reason === 'completed'`.
// `'ended_early'` short-circuits to AbandonedStep without passing
// through here. Back navigation DISABLED (locked decision B).
// `playerExitReason` is constant-by-construction at `'completed'`;
// kept on the type as documentation and for the session write.
export interface ReCheckStep {
  step: 're_check';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  playerExitReason: 'completed';
}

// Outcome is classified at entry from the (stateBefore, stateAfter)
// pair via `classifyOutcome` from `outcomeClassifier.ts`. 'abandoned'
// is unreachable here (see AbandonedStep); 'failed' is reserved for
// system failures (audio_error path) and is set outside this flow.
// `userChosenNextStep` is NOT on this step — it's captured at the
// transition to FlowCompleteStep (this step is "screen visible,
// waiting for choice", not "choice made").
export interface ResponseStep {
  step: 'response';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  playerExitReason: 'completed';
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
}

// Terminal — abandoned short-circuit.
// Reached only via `player_exit { reason: 'ended_early' }` from the
// running step. Re-check is NOT shown (Implementation Plan line 314).
// stateAfter is unset because we never asked. Parent observes
// `step === 'abandoned'`, writes ProtocolSession with
// outcome='abandoned' and stateAfter=null, navigates to Today with
// the soft "come back when ready" surface, unmounts the flow.
export interface AbandonedStep {
  step: 'abandoned';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// Terminal — normal completion path.
// Reached via `next_step_chosen` from ResponseStep. Carries the full
// session record. Parent observes `step === 'flow_complete'`, writes
// ProtocolSession with these values, navigates per `userChosenNextStep`
// ('try_longer' → Practices, 'rest_later' → Today + soft surface,
// 'dismissed' / 'auto_dismissed' → Today), unmounts the flow.
export interface FlowCompleteStep {
  step: 'flow_complete';
  entrySource: FlowEntrySource;
  stateBefore: BrainState;
  timeWindow: ProtocolTimeWindow;
  protocol: Protocol;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  playerExitReason: 'completed';
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
  userChosenNextStep: UserChosenNextStep;
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────
// The reducer is a pure state machine. Side effects (Firestore
// writes, navigation, telemetry, auto-dismiss timers) are the
// parent's job, driven by useEffect on FlowState transitions.
//
// `nowMs` is injected on actions that record a wall-clock timestamp
// so the reducer stays pure (testable with fixed clocks).

export type FlowAction =
  // Forward transitions
  | { type: 'state_selected'; state: BrainState }
  | { type: 'time_selected'; timeWindow: ProtocolTimeWindow }
  | { type: 'protocol_begin'; nowMs: number }
  | { type: 'player_exit'; reason: PlayerExitReason; nowMs: number }
  | { type: 'state_after_selected'; stateAfter: BrainState }
  | { type: 'next_step_chosen'; choice: UserChosenNextStep }
  // Back (allowed only from state_pick / time_pick / recommendation
  // per locked decision B; reducer no-ops on running, re_check,
  // response, and either terminal step).
  | { type: 'back' };

// ────────────────────────────────────────────────────────────
// Initialization input
// ────────────────────────────────────────────────────────────
// Standard entry initializes at StatePickStep. Overwhelm entry
// initializes directly at RunningStep with stateBefore='wired',
// timeWindow=2, protocol = caller-provided (Cyclic Sighing or
// Sensory Reset 2-min). The Safety Card itself is the consent
// moment, so recommendation is skipped per Q1 locked decision.
export type FlowInit =
  | { entrySource: 'standard' }
  | {
      entrySource: 'overwhelm_safety_card';
      protocol: Protocol;
      nowMs: number; // sessionStartedAt for the running step
    };
