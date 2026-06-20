// Plan reason — the one-line felt "why" shown under the lead on the plan screen.
//
// ⚠️ INTERIM COPY. Every user-facing string in this file is a placeholder,
// flagged INTERIM. Final reason copy is supplied separately; do not treat these
// as final. The pattern is "Because [state], [what the plan does first]" —
// felt, conditional, never a metric or score, no overclaiming.
//
// Presentation-side by necessity: the engine's ResolvedPlan carries no reason
// field, so the reason is composed here from the plan's quadrant + lead slot.
// Keyed on the RESOLVED lead slot type, so it stays honest after engine
// degradation (a degraded NSDR slot is type 'settle' → "a short reset", not a
// "rest" that isn't happening). Returns null for zero-slot plans — their
// acknowledgment message already carries the whole meaning.

import type { Quadrant, ResolvedPlan } from '../../../engine';
import { classifyPlanShape } from './planShape';

// INTERIM
const STATE_PHRASE: Record<Quadrant, string> = {
  Tense: "you're wound up",
  Activated: "you've got energy",
  Depleted: "you're running low",
  Calm: "you're steady",
};

// INTERIM — felt description of the lead catalog action, by resolved slot type.
const PRACTICE_LEAD: Record<string, string> = {
  'settle-breath': 'a few breaths to settle',
  grounding: 'a quick grounding reset',
  settle: 'a short reset',
  nsdr: 'a short rest',
  energize: 'a little movement to lift',
};
const PRACTICE_LEAD_FALLBACK = 'a short reset'; // INTERIM

// INTERIM
const POINTER_LEAD: Record<'focus-session' | 'plan', string> = {
  'focus-session': 'straight into focus',
  plan: 'line up your routines',
};

export function planReason(plan: ResolvedPlan, evening: boolean): string | null {
  const shape = classifyPlanShape(plan);
  const state = STATE_PHRASE[plan.quadrant];
  // §8: only "find energy" is clock-modified; its evening rest cells read better
  // acknowledging the hour.
  const late =
    evening && plan.situation === 'find_energy' ? " and it's late" : '';

  const practiceLead = (slotType: string): string =>
    PRACTICE_LEAD[slotType] ?? PRACTICE_LEAD_FALLBACK;

  switch (shape.kind) {
    case 'zero':
      return null; // the acknowledgment message speaks for itself
    case 'single_practice':
      return `Because ${state}${late}, ${practiceLead(shape.practice.slot.type)}.`;
    case 'message_offered':
      return `Because ${state}, a short reset is here if you want it.`;
    case 'single_pointer':
      return `Because ${state}, ${POINTER_LEAD[shape.pointer.type]}.`;
    case 'practice_then_pointer':
    case 'practice_then_offered_pointer':
      return `Because ${state}${late}, ${practiceLead(shape.practice.slot.type)} first.`;
    case 'offered_practice_then_pointer':
      return `Because ${state}, ${POINTER_LEAD[shape.pointer.type]} when you're ready.`;
  }
}
