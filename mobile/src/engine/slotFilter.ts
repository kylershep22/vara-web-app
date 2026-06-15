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
import type { CatalogSlotType, LengthClass, Slot, SlotDirection } from './types';
import { lengthClassWithinBudget, timeWindowToLengthClass } from './lengthClass';

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
