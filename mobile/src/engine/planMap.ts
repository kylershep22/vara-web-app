/**
 * The 24-cell map (Vara_Engine_Contract.md §7) as data, plus the §8 evening
 * clock modifier for Situation 3 (Find energy).
 *
 * The first slot listed is the lead. `mandatory` slots auto-chain; `offered`
 * slots are presented as an option and never auto-routed. Minute hints in the
 * contract resolve to size classes (§5); slots carry the class, not a minute.
 */
import type { ProtocolModality } from '../types/models';
import type {
  LengthClass,
  PlanTemplate,
  Quadrant,
  Situation,
  Slot,
  SlotMode,
} from './types';

// --- Slot builders ---
export const settleBreathSlot = (
  mode: SlotMode,
  lengthClasses: LengthClass[] = ['short']
): Slot => ({ pillar: 'energy', direction: 'settle', type: 'settle-breath', lengthClasses, mode });

export const groundingSlot = (
  mode: SlotMode,
  lengthClasses: LengthClass[] = ['short']
): Slot => ({ pillar: 'energy', direction: 'settle', type: 'grounding', lengthClasses, mode });

export const settleSlot = (
  mode: SlotMode,
  lengthClasses: LengthClass[] = ['short'],
  modalities?: ProtocolModality[]
): Slot => ({
  pillar: 'energy',
  direction: 'settle',
  type: 'settle',
  lengthClasses,
  mode,
  ...(modalities ? { modalities } : {}),
});

export const energizeSlot = (
  mode: SlotMode,
  lengthClasses: LengthClass[] = ['short']
): Slot => ({ pillar: 'energy', direction: 'energize', type: 'energize', lengthClasses, mode });

export const nsdrSlot = (
  mode: SlotMode,
  lengthClasses: LengthClass[] = ['medium']
): Slot => ({ pillar: 'energy', direction: 'settle', type: 'nsdr', lengthClasses, mode });

export const focusSessionSlot = (mode: SlotMode): Slot => ({
  pillar: 'focus',
  direction: 'neutral',
  type: 'focus-session',
  lengthClasses: [],
  mode,
});

export const planSlot = (mode: SlotMode): Slot => ({
  pillar: 'time',
  direction: 'neutral',
  type: 'plan',
  lengthClasses: [],
  mode,
});

// --- The 24-cell map (§7) ---
export const PLAN_MAP: Record<Situation, Record<Quadrant, PlanTemplate>> = {
  // 1. Get through something hard (outcome: focus session)
  get_through_hard: {
    Tense: { slots: [settleBreathSlot('mandatory'), focusSessionSlot('mandatory')] },
    Activated: { slots: [focusSessionSlot('mandatory')] },
    Depleted: { slots: [energizeSlot('mandatory'), focusSessionSlot('mandatory')] },
    // Resolution #4: grounding pre-roll (offered) leads; focus-session mandatory.
    Calm: { slots: [groundingSlot('offered'), focusSessionSlot('mandatory')] },
  },

  // 2. Quiet a busy mind (regulation is the goal)
  quiet_mind: {
    // Resolution #2: composite settle accepts breath | sensory.
    Tense: { slots: [settleSlot('mandatory', ['short'], ['breath', 'sensory'])] },
    Activated: { slots: [groundingSlot('mandatory'), focusSessionSlot('offered')] },
    Depleted: { slots: [groundingSlot('mandatory')] },
    Calm: { message: "You're already there.", slots: [settleSlot('offered')] },
  },

  // 3. Find energy I'm missing (revved ≠ energy)
  find_energy: {
    Tense: { slots: [settleBreathSlot('mandatory')] },
    Activated: { message: "You're there. Go use it.", slots: [] }, // zero-slot
    Depleted: { slots: [energizeSlot('mandatory')] },
    Calm: { message: 'A gentle lift, or permission to rest.', slots: [energizeSlot('offered')] },
  },

  // 4. Wind down and switch off (evening)
  wind_down: {
    // Resolution #2: composite settle accepts breath | audio (settle-breath or nsdr).
    Tense: { slots: [settleSlot('mandatory', ['short', 'medium'], ['breath', 'audio'])] },
    Activated: { slots: [nsdrSlot('mandatory', ['medium'])] }, // "longer downshift(10)"
    Depleted: { slots: [nsdrSlot('mandatory', ['medium', 'long'])] }, // "nsdr(10–20)"
    Calm: { slots: [settleSlot('mandatory', ['short'])] },
  },

  // 5. Get a grip on my day (outcome: plan/routine, Time)
  grip_on_day: {
    Tense: { slots: [settleBreathSlot('mandatory'), planSlot('mandatory')] },
    Activated: { slots: [planSlot('mandatory')] },
    Depleted: { message: 'Just review one thing. No pressure.', slots: [planSlot('mandatory')] },
    Calm: { slots: [planSlot('mandatory')] },
  },

  // 6. Just need a reset (no outcome; regulate to baseline)
  just_reset: {
    Tense: { slots: [settleBreathSlot('mandatory')] },
    Activated: { slots: [groundingSlot('mandatory')] },
    Depleted: { slots: [nsdrSlot('mandatory', ['medium'])] },
    Calm: { slots: [settleSlot('mandatory', ['short'])] },
  },
};

// §8 clock modifier: Situation 3 in the evening protects sleep — flip the
// lift to rest with a reframe. Everywhere else the situation already encodes
// time intent, so no clock read is needed.
const S3_EVENING_REFRAME = 'Rest is the energy move right now.';

export function getPlanTemplate(
  situation: Situation,
  quadrant: Quadrant,
  evening: boolean
): PlanTemplate {
  if (evening && situation === 'find_energy' && quadrant === 'Depleted') {
    return { message: S3_EVENING_REFRAME, slots: [nsdrSlot('mandatory', ['medium'])] };
  }
  if (evening && situation === 'find_energy' && quadrant === 'Calm') {
    return { message: S3_EVENING_REFRAME, slots: [nsdrSlot('offered', ['medium'])] };
  }
  return PLAN_MAP[situation][quadrant];
}
