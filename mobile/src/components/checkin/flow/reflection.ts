// Per-pillar reflection chip sets (Vara_Engine_Contract.md §9.6, open item #1
// resolved). After a completed catalog practice the flow shows a single-tap,
// non-judgmental reflection. The set is chosen by the *slot's* (pillar,
// direction) — the slot direction is what the user was trying to do, so a
// `both`-tagged practice (e.g. Cold Water Reset) reflects via the slot it
// filled, not its ambiguous own direction.
//
// Brand: calm, no guilt, no streaks. The first chip in each set is the
// strong-positive — the ONLY value that qualifies a session for firstShiftAt
// (locked Phase B decision; "A little" / middle chips do NOT qualify).

import type { Pillar, SlotDirection } from '../../../engine';

export interface ReflectionChip {
  // Stable id persisted on the session record. Unique within a set; the
  // (pillar, direction) context disambiguates the repeated "a_little".
  id: string;
  label: string;
}

export interface ReflectionSet {
  pillar: Pillar;
  direction: SlotDirection;
  // The strong-positive chip id — the only value that counts as a shift.
  strongPositiveId: string;
  chips: [ReflectionChip, ReflectionChip, ReflectionChip];
}

const FOCUS_SET: ReflectionSet = {
  pillar: 'focus',
  direction: 'neutral',
  strongPositiveId: 'settled',
  chips: [
    { id: 'settled', label: 'Settled' },
    { id: 'some', label: 'Some' },
    { id: 'still_busy', label: 'Still busy' },
  ],
};

const ENERGY_SETTLE_SET: ReflectionSet = {
  pillar: 'energy',
  direction: 'settle',
  strongPositiveId: 'calmer',
  chips: [
    { id: 'calmer', label: 'Calmer' },
    { id: 'a_little', label: 'A little' },
    { id: 'still_wound_up', label: 'Still wound up' },
  ],
};

const ENERGY_ENERGIZE_SET: ReflectionSet = {
  pillar: 'energy',
  direction: 'energize',
  strongPositiveId: 'more_with_it',
  chips: [
    { id: 'more_with_it', label: 'More with it' },
    { id: 'a_little', label: 'A little' },
    { id: 'still_flat', label: 'Still flat' },
  ],
};

const TIME_SET: ReflectionSet = {
  pillar: 'time',
  direction: 'neutral',
  strongPositiveId: 'clearer',
  chips: [
    { id: 'clearer', label: 'Clearer' },
    { id: 'a_little', label: 'A little' },
    { id: 'still_scattered', label: 'Still scattered' },
  ],
};

/**
 * Resolve the reflection set for a completed practice's slot. Energy splits on
 * direction (settle vs energize); focus and time have a single set each.
 * Defaults to the energy-settle set for any unexpected (pillar, direction)
 * combination so the UI always has a usable set rather than crashing.
 */
export function reflectionSetFor(
  pillar: Pillar,
  direction: SlotDirection
): ReflectionSet {
  if (pillar === 'focus') return FOCUS_SET;
  if (pillar === 'time') return TIME_SET;
  if (pillar === 'energy') {
    return direction === 'energize' ? ENERGY_ENERGIZE_SET : ENERGY_SETTLE_SET;
  }
  return ENERGY_SETTLE_SET;
}

/**
 * True when the chosen reflection id is the set's strong-positive value — the
 * only reflection that qualifies a session for the firstShiftAt marker.
 */
export function isStrongPositiveReflection(
  pillar: Pillar,
  direction: SlotDirection,
  reflectionId: string
): boolean {
  return reflectionSetFor(pillar, direction).strongPositiveId === reflectionId;
}
