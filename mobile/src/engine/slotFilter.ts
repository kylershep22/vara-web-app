/**
 * Slot filling — candidate filter (Vara_Engine_Contract.md §5, §8, §9.4).
 *
 * Given a catalog slot, return the practices eligible to fill it after
 * pillar / modality / direction / length / budget filtering and the evening
 * bright-light exclusion.
 */
import type {
  Protocol,
  ProtocolModality,
  ProtocolRegulationDirection,
} from '../types/models';
import type {
  CatalogSlotType,
  LengthClass,
  Pillar,
  Slot,
  SlotDirection,
} from './types';
import { lengthClassWithinBudget, timeWindowToLengthClass } from './lengthClass';

// Full catalog modality set per regulation direction. Used by the engine's
// graceful-degradation fallback (resolve) when a slot's primary type has no
// in-budget candidate: the slot widens to any practice of its direction.
// `cold` is bidirectional (regulationDirection 'both'), so it appears in both
// sets; directionMatches still gates it.
export const DIRECTION_MODALITIES: Record<'settle' | 'energize', ProtocolModality[]> = {
  settle: ['breath', 'sensory', 'audio', 'cold'],
  energize: ['movement', 'environmental', 'cold'],
};

// Slot type → acceptable practice modalities. Overridden per-slot by
// Slot.modalities for composite cells (resolution #2).
export const SLOT_TYPE_MODALITIES: Record<CatalogSlotType, ProtocolModality[]> = {
  'settle-breath': ['breath'],
  grounding: ['sensory'],
  settle: ['breath', 'sensory', 'audio'],
  energize: ['movement', 'environmental'],
  nsdr: ['audio'],
  cold: ['cold'],
};

// §5: a settle slot accepts settle|both; an energize slot accepts energize|both.
export function directionMatches(
  slotDirection: SlotDirection,
  practiceDirection: ProtocolRegulationDirection
): boolean {
  if (slotDirection === 'settle') {
    return practiceDirection === 'settle' || practiceDirection === 'both';
  }
  if (slotDirection === 'energize') {
    return practiceDirection === 'energize' || practiceDirection === 'both';
  }
  return true; // 'neutral' — pointer slots are never filtered through here
}

export function slotModalities(slot: Slot): ProtocolModality[] {
  return slot.modalities ?? SLOT_TYPE_MODALITIES[slot.type as CatalogSlotType];
}

export function eligiblePractices(
  slot: Slot,
  catalog: Protocol[],
  budgetClass: LengthClass,
  evening: boolean
): Protocol[] {
  const modalities = slotModalities(slot);
  return catalog.filter((p) => {
    if (p.pillar !== slot.pillar) return false;
    if (!modalities.includes(p.modality)) return false;
    if (!directionMatches(slot.direction, p.regulationDirection)) return false;
    const lc = timeWindowToLengthClass(p.timeWindow);
    if (!slot.lengthClasses.includes(lc)) return false;
    if (!lengthClassWithinBudget(lc, budgetClass)) return false;
    // §8: bright light is circadian-activating, so it must never be served late
    // even through a non-S3 energize cell. Hardcoded family exclusion; promote
    // to a `daytimeOnly` practice flag if more such practices are added.
    if (evening && slot.direction === 'energize' && p.family === 'bright-light') {
      return false;
    }
    return true;
  });
}

/**
 * All catalog practices of a given pillar + regulation direction — the engine's
 * graceful-degradation candidate set (resolve) when a slot's primary type has
 * no in-budget match. Ignores the slot's specific type/modalities (a settle
 * nsdr slot at a 2-min budget degrades to any short settle breath/grounding).
 *
 * `capByBudget=true` keeps it within the time budget (step 1: prefer a brief
 * reset that fits); `false` ignores the cap (last-resort: serve the shortest
 * available even if longer than budget). The §8 evening bright-light exclusion
 * always applies.
 */
export function practicesForDirection(
  pillar: Pillar,
  direction: SlotDirection,
  catalog: Protocol[],
  budgetClass: LengthClass,
  evening: boolean,
  capByBudget: boolean
): Protocol[] {
  return catalog.filter((p) => {
    if (p.pillar !== pillar) return false;
    if (!directionMatches(direction, p.regulationDirection)) return false;
    const lc = timeWindowToLengthClass(p.timeWindow);
    if (capByBudget && !lengthClassWithinBudget(lc, budgetClass)) return false;
    if (evening && direction === 'energize' && p.family === 'bright-light') {
      return false;
    }
    return true;
  });
}
