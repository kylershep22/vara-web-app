// Plan-shape classifier (Vara_Engine_Contract.md §6/§7 presentation).
//
// resolve() returns 0–2 ResolvedSlots, each a catalog `practice` or a typed
// `pointer` (focus-session → Pomodoro, plan → routines), each `mandatory` or
// `offered`. The 24-cell map only ever produces seven concrete presentation
// shapes. This pure helper collapses a ResolvedPlan into one of them so the
// reducer and the PlanRecommendation view agree on how to drive it.
//
// Pointer hand-off ends the flow (locked Phase B decision D2), so a plan runs
// at most one in-flow catalog practice before any pointer; that bounds the
// shapes below.

import type {
  PracticePointer,
  Pillar,
  ResolvedPlan,
  Slot,
  SlotDirection,
} from '../../../engine';
import type { Protocol } from '../../../types/models';

// A resolved catalog practice plus the slot it filled. The slot's (pillar,
// direction) — not the practice's own, possibly `both`, direction — is what the
// reflection set keys on; the full slot is forwarded to "See other options" so
// the Practices index can re-run the engine's eligiblePractices filter.
export interface PlanPractice {
  practice: Protocol;
  pillar: Pillar;
  direction: SlotDirection;
  slot: Slot;
}

export type PlanShape =
  // No actionable slot — message + acknowledgment only (S3/Activated).
  | { kind: 'zero'; message?: string }
  // Message + a single OFFERED practice (S2/Calm, S3/Calm, S3/Calm-evening).
  | { kind: 'message_offered'; message?: string; practice: PlanPractice }
  // One mandatory catalog practice (most regulate cells).
  | { kind: 'single_practice'; message?: string; practice: PlanPractice }
  // One mandatory pointer — focus-session or plan (S1/Activated, S5/*).
  | { kind: 'single_pointer'; message?: string; pointer: PracticePointer }
  // Mandatory practice → mandatory pointer (S1/Tense, S1/Depleted, S5/Tense).
  | { kind: 'practice_then_pointer'; message?: string; practice: PlanPractice; pointer: PracticePointer }
  // Mandatory practice → OFFERED pointer (S2/Activated).
  | { kind: 'practice_then_offered_pointer'; message?: string; practice: PlanPractice; pointer: PracticePointer }
  // OFFERED practice pre-roll → mandatory pointer (S1/Calm).
  | { kind: 'offered_practice_then_pointer'; message?: string; practice: PlanPractice; pointer: PracticePointer };

function toPlanPractice(
  slot: ResolvedPlan['slots'][number]
): PlanPractice | null {
  if (slot.kind !== 'practice') return null;
  return {
    practice: slot.practice,
    pillar: slot.slot.pillar,
    direction: slot.slot.direction,
    slot: slot.slot,
  };
}

// The slot the lead catalog practice filled, or null for pointer-only / zero
// plans. Used by "See other options" to re-run eligiblePractices.
export function leadPracticeSlot(plan: ResolvedPlan): Slot | null {
  const shape = classifyPlanShape(plan);
  switch (shape.kind) {
    case 'single_practice':
    case 'message_offered':
    case 'practice_then_pointer':
    case 'practice_then_offered_pointer':
    case 'offered_practice_then_pointer':
      return shape.practice.slot;
    default:
      return null;
  }
}

// True when the plan runs a catalog practice that hands off to a focus session
// (used to pick the "settle before focus" reflection labels). Plan/routine
// pointers and non-pointer plans return false.
export function leadsToFocusSession(plan: ResolvedPlan): boolean {
  const shape = classifyPlanShape(plan);
  if (
    shape.kind === 'practice_then_pointer' ||
    shape.kind === 'practice_then_offered_pointer' ||
    shape.kind === 'offered_practice_then_pointer'
  ) {
    return shape.pointer.type === 'focus-session';
  }
  return false;
}

export function classifyPlanShape(plan: ResolvedPlan): PlanShape {
  const { slots, message } = plan;

  if (slots.length === 0) {
    return { kind: 'zero', message };
  }

  if (slots.length === 1) {
    const [only] = slots;
    if (only.kind === 'pointer') {
      return { kind: 'single_pointer', message, pointer: only.pointer };
    }
    const practice = toPlanPractice(only)!;
    return only.mode === 'offered'
      ? { kind: 'message_offered', message, practice }
      : { kind: 'single_practice', message, practice };
  }

  // Two slots. The map only emits practice→pointer or pointer-lead-with-
  // offered-practice; classify on the practice/pointer modes.
  const [first, second] = slots;
  const firstPractice = toPlanPractice(first);
  const secondPractice = toPlanPractice(second);

  if (firstPractice && second.kind === 'pointer') {
    if (first.mode === 'offered') {
      return {
        kind: 'offered_practice_then_pointer',
        message,
        practice: firstPractice,
        pointer: second.pointer,
      };
    }
    return second.mode === 'offered'
      ? {
          kind: 'practice_then_offered_pointer',
          message,
          practice: firstPractice,
          pointer: second.pointer,
        }
      : {
          kind: 'practice_then_pointer',
          message,
          practice: firstPractice,
          pointer: second.pointer,
        };
  }

  // Defensive fallback for any unmapped two-slot arrangement: drive the first
  // practice if present, else acknowledge. Keeps the flow from crashing on a
  // map the classifier doesn't recognize.
  if (firstPractice) {
    return { kind: 'single_practice', message, practice: firstPractice };
  }
  if (secondPractice) {
    return { kind: 'single_practice', message, practice: secondPractice };
  }
  return { kind: 'zero', message };
}
