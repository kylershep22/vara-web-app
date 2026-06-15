/**
 * Engine resolution (Vara_Engine_Contract.md §9).
 *
 * resolve() is pure: clock time, time budget, history, ranker, and catalog are
 * all injected (catalog/ranker default to the real ones). Same inputs always
 * produce the same plan.
 */
import { getAllProtocols } from '../constants/brainStateProtocols';
import type {
  PracticePointer,
  ResolveInput,
  ResolvedPlan,
  ResolvedSlot,
  Slot,
} from './types';
import { classifyQuadrant } from './quadrant';
import { isEvening } from './clock';
import { getPlanTemplate } from './planMap';
import { timeWindowToLengthClass } from './lengthClass';
import { eligiblePractices } from './slotFilter';
import { defaultRanker } from './ranker';

function isPointerSlot(slot: Slot): boolean {
  return slot.type === 'focus-session' || slot.type === 'plan';
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
  // (mode is carried through to the resolved slot).
  const slots: ResolvedSlot[] = template.slots.map((slot) => {
    if (isPointerSlot(slot)) {
      const pointer: PracticePointer = {
        pillar: slot.pillar,
        type: slot.type as PracticePointer['type'],
      };
      return { kind: 'pointer', slot, pointer, mode: slot.mode };
    }

    const candidates = eligiblePractices(slot, catalog, budgetClass, evening);
    if (candidates.length === 0) {
      throw new Error(
        `Engine: no practice fills slot ${slot.type}/${slot.direction} ` +
          `(lengthClasses=${slot.lengthClasses.join('|')}, budget=${budgetClass}) ` +
          `for ${situation}/${quadrant}.`
      );
    }
    const [pick] = ranker(candidates, {
      lengthClasses: slot.lengthClasses,
      budgetClass,
      clockTime,
      history,
    });
    return { kind: 'practice', slot, practice: pick, mode: slot.mode };
  });

  return { situation, quadrant, message: template.message, slots };
}
