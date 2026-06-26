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
import type { ProtocolModality } from '../../../types/models';

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
    { id: 'settled', label: 'Stayed with it' },
    { id: 'some', label: 'Drifted some' },
    { id: 'still_busy', label: 'Kept slipping' },
  ],
};

const ENERGY_SETTLE_SET: ReflectionSet = {
  pillar: 'energy',
  direction: 'settle',
  strongPositiveId: 'calmer',
  chips: [
    { id: 'calmer', label: 'Calmer' },
    { id: 'a_little', label: 'A little calmer' },
    { id: 'still_wound_up', label: 'Still wound up' },
  ],
};

const ENERGY_ENERGIZE_SET: ReflectionSet = {
  pillar: 'energy',
  direction: 'energize',
  strongPositiveId: 'more_with_it',
  chips: [
    { id: 'more_with_it', label: 'More with it' },
    { id: 'a_little', label: 'A little more' },
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

// ── display labels by practice category ─────────────────────
// Every option is a complete answer to "How does it feel now?" (the bare middle
// "A little" was the bug). The four catalog categories all map onto the existing
// (pillar, direction) id-sets — so the persisted chip ids and the outcome /
// firstShift classification are UNCHANGED — but the LABELS shown vary by the
// practice's category. Down-regulate, settle-before-focus, and rest all share
// the energy/settle id-set; they differ only in wording.
export type ReflectionCategory =
  | 'down_regulate'
  | 'energize'
  | 'settle_before_focus'
  | 'rest'
  | 'focus';

export interface ReflectionContext {
  // The completed practice's modality (audio → rest), and whether the practice
  // leads into a focus session in this plan (settle-before-focus). Both are
  // available where the reflection is rendered; absent for the focus-session
  // loop (pillar 'focus').
  modality?: ProtocolModality;
  leadsToFocus?: boolean;
}

export function reflectionCategoryFor(
  pillar: Pillar,
  direction: SlotDirection,
  ctx: ReflectionContext = {}
): ReflectionCategory {
  if (pillar === 'focus') return 'focus';
  if (pillar === 'energy' && direction === 'energize') return 'energize';
  if (pillar === 'energy' && direction === 'settle') {
    if (ctx.modality === 'audio') return 'rest'; // NSDR / narrated rest
    if (ctx.leadsToFocus) return 'settle_before_focus'; // settle breath before a focus session
    return 'down_regulate';
  }
  // pillar 'time' / any unexpected combo: a calm down-regulate default (a
  // catalog practice never resolves to the time pillar today).
  return 'down_regulate';
}

// Labels positionally match each id-set's three chips (strong-positive / middle
// / negative). The middle is a complete answer, never a bare "A little".
const CATEGORY_LABELS: Record<ReflectionCategory, [string, string, string]> = {
  down_regulate: ['Calmer', 'A little calmer', 'Still wound up'],
  energize: ['More with it', 'A little more', 'Still flat'],
  settle_before_focus: ['Clearer', 'A little clearer', 'Still scattered'],
  rest: ['More rested', 'A little more', 'Still tense'],
  focus: ['Stayed with it', 'Drifted some', 'Kept slipping'],
};

/**
 * The chips to render: stable ids (from the (pillar, direction) set the
 * classifier reads) paired with category-specific labels. The first chip is the
 * strong-positive in every set.
 */
export function reflectionDisplayChips(
  pillar: Pillar,
  direction: SlotDirection,
  ctx: ReflectionContext = {}
): ReflectionChip[] {
  const set = reflectionSetFor(pillar, direction);
  const labels = CATEGORY_LABELS[reflectionCategoryFor(pillar, direction, ctx)];
  return set.chips.map((chip, i) => ({ id: chip.id, label: labels[i] }));
}
