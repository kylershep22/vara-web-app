// Type definitions for the reworked (engine-wired) multi-step check-in flow.
//
// The flow now reads a situation (§3) + the two-tap circumplex (§2), calls the
// recommendation engine's resolve() (§9), presents the 0-2 slot plan (§6/§7),
// runs the lead catalog practice, and captures a per-pillar reflection (§9.6).
// The prior five-chip BrainState pick, single-protocol recommendation, and
// before→after re-check are retired on this path.
//
// Engine concepts are imported from `../../../engine`; BrainState survives only
// on the recovery payload (whose AsyncStorage marker stores a bridged value)
// and is converted at the edges via the engine state bridge.

import type {
  IntentPath,
  Protocol,
  ProtocolTimeWindow,
  BrainState,
} from '../../../types/models';
import type {
  Arousal,
  PracticePointer,
  Pillar,
  Quadrant,
  ResolvedPlan,
  Situation,
  SlotDirection,
  Valence,
} from '../../../engine';

// ────────────────────────────────────────────────────────────
// Entry source / player exit reason
// ────────────────────────────────────────────────────────────
export type FlowEntrySource =
  | 'standard'
  | 'overwhelm_safety_card'
  | 'state_preselected';

// Player is OPAQUE to this reducer (locked decision A). One of these arrives on
// the player's onExit callback.
export type PlayerExitReason = 'completed' | 'ended_early';

// Retained for the BrowseRunFlow path + its response views (ShiftedResponse /
// NotShiftedResponse), which are out of scope for the engine wiring and still
// model an explicit post-response next-step choice. The engine-wired check-in
// no longer uses it (terminal navigation is derived from the FlowCompletion).
export type UserChosenNextStep =
  | 'try_longer'
  | 'rest_later'
  | 'dismissed'
  | 'auto_dismissed';

// ────────────────────────────────────────────────────────────
// Resolved context — everything captured once resolve() has run.
// Carried forward through running / reflection / terminals so the
// session write has the full circumplex + situation + plan.
// ────────────────────────────────────────────────────────────
export interface ResolvedContext {
  situation: Situation;
  arousal: Arousal;
  valence: Valence;
  quadrant: Quadrant;
  timeWindow: ProtocolTimeWindow;
  plan: ResolvedPlan;
}

// ────────────────────────────────────────────────────────────
// Flow state — discriminated union by `step`
// ────────────────────────────────────────────────────────────
export type FlowState =
  | RecoveryConfirmStep
  | SituationPickStep
  | StatePickStep
  | TimePickStep
  | RecommendationStep
  | RunningStep
  | ReflectionStep
  | PointerOfferStep
  | AbandonedStep
  | FlowCompleteStep;

export interface SituationPickStep {
  step: 'situation_pick';
  entrySource: FlowEntrySource;
}

export interface StatePickStep {
  step: 'state_pick';
  entrySource: FlowEntrySource;
  situation: Situation;
}

export interface TimePickStep {
  step: 'time_pick';
  entrySource: FlowEntrySource;
  situation: Situation;
  arousal: Arousal;
  valence: Valence;
}

// resolve() has run; `plan` is the 0-2 slot ResolvedPlan. Pure: the device
// clock is injected via the `time_selected` action's nowMs, never read here.
export interface RecommendationStep extends ResolvedContext {
  step: 'recommendation';
  entrySource: FlowEntrySource;
}

// The lead catalog practice is running. `pillar` / `direction` are the SLOT's
// (drives the reflection set). Back DISABLED (locked decision B).
export interface RunningStep extends ResolvedContext {
  step: 'running';
  entrySource: FlowEntrySource;
  protocol: Protocol;
  pillar: Pillar;
  direction: SlotDirection;
  sessionStartedAt: number;
}

// Post-practice reflection. Reached only when a catalog practice completed.
export interface ReflectionStep extends ResolvedContext {
  step: 'reflection';
  entrySource: FlowEntrySource;
  protocol: Protocol;
  pillar: Pillar;
  direction: SlotDirection;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// Post-reflection OFFERED pointer (§7 S2/Activated: grounding → focus-session
// [offer]). The user accepts (launch) or declines (done). Mandatory pointers
// never pass through here — they launch directly from reflection.
export interface PointerOfferStep extends ResolvedContext {
  step: 'pointer_offer';
  entrySource: FlowEntrySource;
  protocol: Protocol;
  pillar: Pillar;
  direction: SlotDirection;
  reflection: string;
  pointer: PracticePointer;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// Terminal — abandoned short-circuit (player ended_early). A practice was
// running, so it carries the protocol + timing for the abandoned-session write.
export interface AbandonedStep extends ResolvedContext {
  step: 'abandoned';
  entrySource: FlowEntrySource;
  protocol: Protocol;
  pillar: Pillar;
  direction: SlotDirection;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
}

// How the flow completed — drives the terminal write + navigation.
//   practice      — a catalog practice ran; write a protocolSession. May also
//                   carry a launched pointer (practice → mandatory pointer).
//   pointer_only  — no practice ran; the flow handed off to a pointer
//                   (focus-session / plan). No protocolSession written.
//   acknowledged  — zero-slot / declined-offer; nothing ran, nothing launched.
export type FlowCompletion =
  | {
      kind: 'practice';
      protocol: Protocol;
      pillar: Pillar;
      direction: SlotDirection;
      reflection: string;
      sessionStartedAt: number;
      sessionEndedAt: number;
      durationActualSeconds: number;
      pointerLaunched: PracticePointer | null;
    }
  | { kind: 'pointer_only'; pointerLaunched: PracticePointer }
  | { kind: 'acknowledged' };

// Terminal — normal completion.
export interface FlowCompleteStep extends ResolvedContext {
  step: 'flow_complete';
  entrySource: FlowEntrySource;
  completion: FlowCompletion;
}

// ────────────────────────────────────────────────────────────
// Recovery confirm (sub-step 2.7) — unchanged BrainState-based marker
// payload. On confirm the reducer bridges the stored BrainState back to
// the circumplex and resumes at the reflection step.
// ────────────────────────────────────────────────────────────
export interface RecoveryConfirmStep {
  step: 'recovery_confirm';
  entrySource: FlowEntrySource; // ORIGINAL — preserved from the marker
  recoveredPayload: {
    protocol: Protocol;
    stateBefore: BrainState;
    timeWindow: ProtocolTimeWindow;
    sessionStartedAt: number;
    sessionEndedAt: number;
    durationActualSeconds: number;
    intentPath: IntentPath;
  };
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────
export type FlowAction =
  | { type: 'situation_selected'; situation: Situation }
  | { type: 'state_selected'; arousal: Arousal; valence: Valence }
  // nowMs injects the device clock so resolve() (called in the reducer) stays
  // pure — same pattern as player timestamps.
  | { type: 'time_selected'; timeWindow: ProtocolTimeWindow; nowMs: number }
  // Plan CTAs. The reducer interprets primary/secondary against the plan shape.
  | { type: 'plan_primary'; nowMs: number }
  | { type: 'plan_secondary'; nowMs: number }
  | { type: 'player_exit'; reason: PlayerExitReason; nowMs: number }
  | { type: 'reflection_selected'; reflectionId: string }
  // Post-reflection offered pointer.
  | { type: 'pointer_accepted' }
  | { type: 'pointer_declined' }
  // Recovery confirm transitions.
  | { type: 'recovery_confirmed' }
  | { type: 'recovery_declined' }
  | { type: 'back' };

// ────────────────────────────────────────────────────────────
// Initialization input
// ────────────────────────────────────────────────────────────
export type FlowInit =
  | { entrySource: 'standard' }
  | {
      entrySource: 'overwhelm_safety_card';
      protocol: Protocol;
      nowMs: number; // sessionStartedAt for the running step
    }
  | {
      // Dashboard chip-tap etc. captured a BrainState up front. Bridged to the
      // circumplex and routed straight to time_pick with situation='just_reset'.
      entrySource: 'state_preselected';
      stateBefore: BrainState;
    }
  | {
      entrySource: 'recovery';
      recoveredPayload: {
        protocol: Protocol;
        stateBefore: BrainState;
        timeWindow: ProtocolTimeWindow;
        sessionStartedAt: number;
        sessionEndedAt: number;
        durationActualSeconds: number;
        intentPath: IntentPath;
        entrySource: FlowEntrySource;
      };
    };

// Public alias of the two terminal variants.
export type TerminalFlowState = Extract<
  FlowState,
  { step: 'abandoned' } | { step: 'flow_complete' }
>;
