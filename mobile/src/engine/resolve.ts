/**
 * Engine resolution (Vara_Engine_Contract.md §9).
 *
 * resolve() is pure: clock time, time budget, history, ranker, and catalog are
 * all injected (catalog/ranker default to the real ones). Same inputs always
 * produce the same plan.
 *
 * resolve() NEVER throws on a valid selection (the prior dev fail-loud throw is
 * replaced by graceful degradation §9.4): if a catalog slot's primary type has
 * no in-budget candidate (e.g. an NSDR rest slot at a 2-min budget), a mandatory
 * slot widens to any practice of its direction within budget (and, only if
 * nothing fits, the shortest available); an offered slot is simply dropped.
 */
import { getAllProtocols } from '../constants/brainStateProtocols';
import type { Protocol } from '../types/models';
import type {
  LengthClass,
  PracticePointer,
  Ranker,
  ResolveInput,
  ResolvedPlan,
  ResolvedSlot,
  Slot,
  ClockTime,
  SessionHistory,
} from './types';
import { classifyQuadrant } from './quadrant';
import { isEvening } from './clock';
import { getPlanTemplate } from './planMap';
import { timeWindowToLengthClass } from './lengthClass';
import {
  DIRECTION_MODALITIES,
  eligiblePractices,
  practicesForDirection,
} from './slotFilter';
import { defaultRanker } from './ranker';

function isPointerSlot(slot: Slot): boolean {
  return slot.type === 'focus-session' || slot.type === 'plan';
}

const ALL_LENGTH_CLASSES: LengthClass[] = ['short', 'medium', 'long'];

// The degraded slot keeps pillar / direction / mode (so the reflection set and
// "See other options" stay correct) but widens its type/modalities/length to
// the whole direction, so downstream re-filters (eligiblePractices) reproduce
// the broadened candidate set the engine actually picked from.
function degradeSlot(slot: Slot): Slot {
  const direction = slot.direction === 'energize' ? 'energize' : 'settle';
  return {
    ...slot,
    type: direction === 'energize' ? 'energize' : 'settle',
    modalities: DIRECTION_MODALITIES[direction],
    lengthClasses: ALL_LENGTH_CLASSES,
  };
}

interface FilledSlot {
  practice: Protocol;
  slot: Slot;
}

// Fill one catalog slot, never throwing. Returns null when the slot should be
// dropped (an offered slot that can't fit the budget, or — defensively — a slot
// with no candidate of its direction at all).
function fillCatalogSlot(
  slot: Slot,
  catalog: Protocol[],
  budgetClass: LengthClass,
  evening: boolean,
  ranker: Ranker,
  clockTime: ClockTime,
  history: SessionHistory | undefined
): FilledSlot | null {
  const rank = (candidates: Protocol[], s: Slot): Protocol =>
    ranker(candidates, {
      lengthClasses: s.lengthClasses,
      budgetClass,
      clockTime,
      history,
    })[0];

  // Primary: the slot's own type/modalities, within budget.
  const primary = eligiblePractices(slot, catalog, budgetClass, evening);
  if (primary.length > 0) {
    return { practice: rank(primary, slot), slot };
  }

  // Offered slot that can't fill in budget → drop it (an optional slot that
  // doesn't fit the time simply isn't offered). Do NOT substitute.
  if (slot.mode === 'offered') return null;

  // Mandatory lead: degrade. 1) widen to any practice of this direction within
  // budget (a brief reset that fits); 2) if none, relax the budget cap and
  // serve the shortest available of the direction; 3) if still none, drop.
  const direction = slot.direction === 'energize' ? 'energize' : 'settle';
  let candidates = practicesForDirection(
    slot.pillar,
    direction,
    catalog,
    budgetClass,
    evening,
    true
  );
  if (candidates.length === 0) {
    candidates = practicesForDirection(
      slot.pillar,
      direction,
      catalog,
      budgetClass,
      evening,
      false
    );
    if (candidates.length === 0) return null;
  }
  const degraded = degradeSlot(slot);
  return { practice: rank(candidates, degraded), slot: degraded };
}

export function resolve(input: ResolveInput): ResolvedPlan {
  const {
    situation,
    state,
    clockTime,
    timeBudget,
    history,
    ranker = defaultRanker,
    catalog = getAllProtocols(),
  } = input;

  // §9.1 read state → quadrant.
  const quadrant = classifyQuadrant(state.arousal, state.valence);
  // §9.2 apply the clock modifier (lives inside getPlanTemplate for §8).
  const evening = isEvening(clockTime);
  // §9.3 look up the cell → plan template (0–2 slots).
  const template = getPlanTemplate(situation, quadrant, evening);
  const budgetClass = timeWindowToLengthClass(timeBudget);

  // §9.4 fill each slot; §9.5 offered slots are presented, not auto-chained
  // (mode is carried through to the resolved slot). Unfillable slots degrade
  // (mandatory) or drop (offered) — resolve() never throws.
  const slots: ResolvedSlot[] = [];
  for (const slot of template.slots) {
    if (isPointerSlot(slot)) {
      const pointer: PracticePointer = {
        pillar: slot.pillar,
        type: slot.type as PracticePointer['type'],
      };
      slots.push({ kind: 'pointer', slot, pointer, mode: slot.mode });
      continue;
    }

    const filled = fillCatalogSlot(
      slot,
      catalog,
      budgetClass,
      evening,
      ranker,
      clockTime,
      history
    );
    if (filled === null) continue; // offered/unfillable → dropped
    slots.push({
      kind: 'practice',
      slot: filled.slot,
      practice: filled.practice,
      mode: slot.mode,
    });
  }

  return { situation, quadrant, message: template.message, slots };
}
