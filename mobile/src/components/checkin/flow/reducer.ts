// Pure reducer for the engine-wired multi-step check-in flow.
//
// State machine (standard entry):
//   situation_pick → state_pick → time_pick → recommendation
//     → running → reflection → [pointer_offer] → flow_complete
//                                              or → abandoned (ended_early)
//
// Engine wiring (Vara_Engine_Contract.md §9):
//   - time_selected calls resolve() synchronously. resolve() is PURE: the
//     device clock is injected via the action's `nowMs` (→ ClockTime.hour), the
//     time budget comes from the kept time_pick step, and catalog/ranker default
//     to the real ones. The reducer stays pure (clock injected, not read).
//   - resolve() THROWS if a catalog slot can't be filled. That is contract
//     enforcement (the old selectProtocol __DEV__ throw served the same role);
//     the reducer intentionally does not catch it.
//
// Locked decisions carried over:
//   A. Player is OPAQUE — only `player_exit` (completed | ended_early).
//   B. Back enabled on situation_pick / state_pick / time_pick / recommendation
//      only; no-op on running / reflection / pointer_offer / terminals.
//   C. ended_early short-circuits running → abandoned (no reflection).
//   D2. Pointer hand-off ends the flow — a pointer slot launches Pomodoro /
//      routines and terminates (no in-flow return, no Focus/Time reflection).

import { classifyQuadrant, brainStateToCircumplex } from '../../../engine';
import { resolve } from '../../../engine';
import type {
  Pillar,
  Quadrant,
  ResolvedPlan,
  Situation,
  Slot,
  SlotDirection,
} from '../../../engine';
import type { Protocol } from '../../../types/models';
import { classifyPlanShape, type PlanPractice } from './planShape';
import type { FlowAction, FlowInit, FlowState, ResolvedContext } from './types';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

// The reflection set keys on the slot direction; an `energize` practice reflects
// via the energize set, everything else (settle / both / neutral) via settle.
// Exported so the true-browse path (BrowseRunFlow) derives the same reflection
// inputs the check-in loop uses, without forking a browse-specific variant.
export function slotDirectionForPractice(p: Protocol): SlotDirection {
  return p.regulationDirection === 'energize' ? 'energize' : 'settle';
}

// Synthetic single-practice plan for the entries that bypass resolve()
// (overwhelm / recovery): they already hold a concrete protocol.
function singlePracticePlan(
  protocol: Protocol,
  situation: Situation,
  quadrant: Quadrant
): ResolvedPlan {
  const direction = slotDirectionForPractice(protocol);
  const slot: Slot = {
    pillar: protocol.pillar,
    direction,
    type: direction === 'energize' ? 'energize' : 'settle',
    lengthClasses: [],
    mode: 'mandatory',
  };
  return {
    situation,
    quadrant,
    slots: [{ kind: 'practice', slot, practice: protocol, mode: 'mandatory' }],
  };
}

function durationSeconds(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round((endedAt - startedAt) / 1000));
}

// Pull the ResolvedContext fields off any post-resolve step.
function contextOf(state: ResolvedContext): ResolvedContext {
  return {
    situation: state.situation,
    arousal: state.arousal,
    valence: state.valence,
    quadrant: state.quadrant,
    timeWindow: state.timeWindow,
    plan: state.plan,
  };
}

// ────────────────────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────────────────────

export function initFlow(init: FlowInit): FlowState {
  switch (init.entrySource) {
    case 'standard':
      return { step: 'situation_pick', entrySource: 'standard' };

    case 'overwhelm_safety_card': {
      // Safety Card consent already happened; land directly on running with a
      // synthetic Tense / just_reset context around the caller's protocol.
      const situation: Situation = 'just_reset';
      const quadrant: Quadrant = 'Tense';
      return {
        step: 'running',
        entrySource: 'overwhelm_safety_card',
        situation,
        arousal: 'revved',
        valence: 'hard',
        quadrant,
        timeWindow: 2,
        plan: singlePracticePlan(init.protocol, situation, quadrant),
        protocol: init.protocol,
        pillar: init.protocol.pillar,
        direction: slotDirectionForPractice(init.protocol),
        sessionStartedAt: init.nowMs,
      };
    }

    case 'state_preselected': {
      // Dashboard chip-tap captured a BrainState but no situation. Bridge to the
      // circumplex and default the situation to a reset; land on time_pick.
      const { arousal, valence } = brainStateToCircumplex(init.stateBefore);
      return {
        step: 'time_pick',
        entrySource: 'state_preselected',
        situation: 'just_reset',
        arousal,
        valence,
      };
    }

    case 'recovery':
      return {
        step: 'recovery_confirm',
        entrySource: init.recoveredPayload.entrySource,
        recoveredPayload: {
          protocol: init.recoveredPayload.protocol,
          stateBefore: init.recoveredPayload.stateBefore,
          timeWindow: init.recoveredPayload.timeWindow,
          sessionStartedAt: init.recoveredPayload.sessionStartedAt,
          sessionEndedAt: init.recoveredPayload.sessionEndedAt,
          durationActualSeconds: init.recoveredPayload.durationActualSeconds,
          intentPath: init.recoveredPayload.intentPath,
        },
      };
  }
}

// ────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (state.step) {
    case 'recovery_confirm':
      return reduceRecoveryConfirm(state, action);
    case 'situation_pick':
      return reduceSituationPick(state, action);
    case 'state_pick':
      return reduceStatePick(state, action);
    case 'time_pick':
      return reduceTimePick(state, action);
    case 'recommendation':
      return reduceRecommendation(state, action);
    case 'running':
      return reduceRunning(state, action);
    case 'reflection':
      return reduceReflection(state, action);
    case 'pointer_offer':
      return reducePointerOffer(state, action);
    case 'abandoned':
    case 'flow_complete':
      return state; // terminal — absorbing
  }
}

// ── situation_pick ──────────────────────────────────────────
function reduceSituationPick(
  state: Extract<FlowState, { step: 'situation_pick' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'situation_selected') {
    return {
      step: 'state_pick',
      entrySource: state.entrySource,
      situation: action.situation,
    };
  }
  return state; // back is a no-op (parent owns dismissal)
}

// ── state_pick (two-tap circumplex) ─────────────────────────
function reduceStatePick(
  state: Extract<FlowState, { step: 'state_pick' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'state_selected') {
    return {
      step: 'time_pick',
      entrySource: state.entrySource,
      situation: state.situation,
      arousal: action.arousal,
      valence: action.valence,
    };
  }
  if (action.type === 'back') {
    return { step: 'situation_pick', entrySource: state.entrySource };
  }
  return state;
}

// ── time_pick → recommendation (resolve()) ──────────────────
function reduceTimePick(
  state: Extract<FlowState, { step: 'time_pick' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'time_selected') {
    const quadrant = classifyQuadrant(state.arousal, state.valence);
    // Pure resolve(): device clock injected via action.nowMs.
    const plan = resolve({
      situation: state.situation,
      state: { arousal: state.arousal, valence: state.valence },
      clockTime: { hour: new Date(action.nowMs).getHours() },
      timeBudget: action.timeWindow,
    });
    return {
      step: 'recommendation',
      entrySource: state.entrySource,
      situation: state.situation,
      arousal: state.arousal,
      valence: state.valence,
      quadrant,
      timeWindow: action.timeWindow,
      plan,
    };
  }
  if (action.type === 'back') {
    return {
      step: 'state_pick',
      entrySource: state.entrySource,
      situation: state.situation,
    };
  }
  return state;
}

// ── recommendation → running / flow_complete ────────────────
function reduceRecommendation(
  state: Extract<FlowState, { step: 'recommendation' }>,
  action: FlowAction
): FlowState {
  const ctx = contextOf(state);
  const shape = classifyPlanShape(state.plan);

  if (action.type === 'plan_primary') {
    switch (shape.kind) {
      case 'zero':
      case 'message_offered':
        // Acknowledged / declined the offered reset — nothing ran.
        return { step: 'flow_complete', entrySource: state.entrySource, ...ctx, completion: { kind: 'acknowledged' } };
      case 'single_practice':
      case 'practice_then_pointer':
      case 'practice_then_offered_pointer':
        return runningFrom(state, ctx, shape.practice, action.nowMs);
      case 'single_pointer':
        return {
          step: 'flow_complete',
          entrySource: state.entrySource,
          ...ctx,
          completion: { kind: 'pointer_only', pointerLaunched: shape.pointer },
        };
      case 'offered_practice_then_pointer':
        // Primary skips the pre-roll and launches the pointer directly.
        return {
          step: 'flow_complete',
          entrySource: state.entrySource,
          ...ctx,
          completion: { kind: 'pointer_only', pointerLaunched: shape.pointer },
        };
    }
  }

  if (action.type === 'plan_secondary') {
    if (shape.kind === 'message_offered' || shape.kind === 'offered_practice_then_pointer') {
      return runningFrom(state, ctx, shape.practice, action.nowMs);
    }
    return state;
  }

  if (action.type === 'back') {
    return {
      step: 'time_pick',
      entrySource: state.entrySource,
      situation: state.situation,
      arousal: state.arousal,
      valence: state.valence,
    };
  }
  return state;
}

function runningFrom(
  state: Extract<FlowState, { step: 'recommendation' }>,
  ctx: ResolvedContext,
  practice: PlanPractice,
  nowMs: number
): FlowState {
  return {
    step: 'running',
    entrySource: state.entrySource,
    ...ctx,
    protocol: practice.practice,
    pillar: practice.pillar,
    direction: practice.direction,
    sessionStartedAt: nowMs,
  };
}

// ── running → reflection / abandoned ────────────────────────
function reduceRunning(
  state: Extract<FlowState, { step: 'running' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'player_exit') {
    const ctx = contextOf(state);
    const sessionEndedAt = action.nowMs;
    const dur = durationSeconds(state.sessionStartedAt, sessionEndedAt);
    const shared = {
      entrySource: state.entrySource,
      ...ctx,
      protocol: state.protocol,
      pillar: state.pillar,
      direction: state.direction,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt,
      durationActualSeconds: dur,
    };
    if (action.reason === 'ended_early') {
      return { step: 'abandoned', ...shared }; // locked decision C
    }
    return { step: 'reflection', ...shared };
  }
  return state; // back is a no-op (locked decision B)
}

// ── reflection → flow_complete / pointer_offer ──────────────
function reduceReflection(
  state: Extract<FlowState, { step: 'reflection' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'reflection_selected') {
    const ctx = contextOf(state);
    const shape = classifyPlanShape(state.plan);

    const base = {
      kind: 'practice' as const,
      protocol: state.protocol,
      pillar: state.pillar,
      direction: state.direction,
      reflection: action.reflectionId,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
    };

    // A mandatory pointer follows → launch it now (hand-off ends the flow).
    if (shape.kind === 'practice_then_pointer' || shape.kind === 'offered_practice_then_pointer') {
      return {
        step: 'flow_complete',
        entrySource: state.entrySource,
        ...ctx,
        completion: { ...base, pointerLaunched: shape.pointer },
      };
    }
    // An OFFERED pointer follows → present it, never auto-chain.
    if (shape.kind === 'practice_then_offered_pointer') {
      return {
        step: 'pointer_offer',
        entrySource: state.entrySource,
        ...ctx,
        protocol: state.protocol,
        pillar: state.pillar,
        direction: state.direction,
        reflection: action.reflectionId,
        pointer: shape.pointer,
        sessionStartedAt: state.sessionStartedAt,
        sessionEndedAt: state.sessionEndedAt,
        durationActualSeconds: state.durationActualSeconds,
      };
    }
    // No pointer — done.
    return {
      step: 'flow_complete',
      entrySource: state.entrySource,
      ...ctx,
      completion: { ...base, pointerLaunched: null },
    };
  }
  return state; // back is a no-op
}

// ── pointer_offer → flow_complete ───────────────────────────
function reducePointerOffer(
  state: Extract<FlowState, { step: 'pointer_offer' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'pointer_accepted' || action.type === 'pointer_declined') {
    const ctx = contextOf(state);
    return {
      step: 'flow_complete',
      entrySource: state.entrySource,
      ...ctx,
      completion: {
        kind: 'practice',
        protocol: state.protocol,
        pillar: state.pillar,
        direction: state.direction,
        reflection: state.reflection,
        sessionStartedAt: state.sessionStartedAt,
        sessionEndedAt: state.sessionEndedAt,
        durationActualSeconds: state.durationActualSeconds,
        pointerLaunched: action.type === 'pointer_accepted' ? state.pointer : null,
      },
    };
  }
  return state; // back is a no-op
}

// ── recovery_confirm → reflection / situation_pick ──────────
function reduceRecoveryConfirm(
  state: Extract<FlowState, { step: 'recovery_confirm' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'recovery_confirmed') {
    const p = state.recoveredPayload;
    const { arousal, valence } = brainStateToCircumplex(p.stateBefore);
    const quadrant = classifyQuadrant(arousal, valence);
    const situation: Situation = 'just_reset';
    const pillar: Pillar = p.protocol.pillar;
    const direction = slotDirectionForPractice(p.protocol);
    return {
      step: 'reflection',
      entrySource: state.entrySource,
      situation,
      arousal,
      valence,
      quadrant,
      timeWindow: p.timeWindow,
      plan: singlePracticePlan(p.protocol, situation, quadrant),
      protocol: p.protocol,
      pillar,
      direction,
      sessionStartedAt: p.sessionStartedAt,
      sessionEndedAt: p.sessionEndedAt,
      durationActualSeconds: p.durationActualSeconds,
    };
  }
  if (action.type === 'recovery_declined') {
    return { step: 'situation_pick', entrySource: 'standard' };
  }
  return state; // back is a no-op
}
