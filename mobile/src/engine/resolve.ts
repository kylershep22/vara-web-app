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
import type { Protocol, ProtocolFamily, ProtocolTimeWindow } from '../types/models';
import type {
  LengthClass,
  PracticePointer,
  Quadrant,
  Ranker,
  ResolveInput,
  ResolvedPlan,
  ResolvedSlot,
  Slot,
  SlotDirection,
  SlotMode,
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

// Pomodoro timer options (PomodoroTab DurationChips). A focus-session pointer's
// length is snapped to the nearest of these so the timer opens at the user's
// budget instead of the 25-min default. Ascending + strict-less comparison
// breaks ties toward the LOWER option (e.g. a 20-min budget → 15, staying
// within budget rather than overrunning to 25).
const TIMER_OPTIONS = [10, 15, 25, 45, 60, 90];

function snapBudgetToTimerOption(budget: number): number {
  let best = TIMER_OPTIONS[0];
  let bestDiff = Infinity;
  for (const opt of TIMER_OPTIONS) {
    const diff = Math.abs(opt - budget);
    if (diff < bestDiff) {
      best = opt;
      bestDiff = diff;
    }
  }
  return best;
}

// ≤5-min budget mapping for a pointer slot that must NOT hand off to the focus
// timer / plan screen. Keyed by quadrant (the spec's per-state short practice):
// revved/ready → box breathing, wound-up → extended exhale, depleted → a brief
// movement lift, steady → box breathing. Falls back to direction degradation
// when the preferred id is absent from the injected catalog.
// Timer-based, self-guided practices honor the budget as a CEILING (the same way
// focus pointers snap down, never up): the served countdown = the budget clamped
// to the practice's sensible range. Fixed-length audio (NSDR, narrated breath)
// can't flex and keep their shortest-available + honest-copy fallback.
const TIMER_FLEX_RANGE: Partial<
  Record<ProtocolFamily, { min: number; max: number }>
> = {
  'brief-movement': { min: 2, max: 5 },
};

// Derive a duration-clamped copy of a timer-flexible practice for the budget.
// Overrides timeWindow + durationSeconds + the timer step so the plan ring and
// the running countdown both reflect the served length. No-op for fixed-length
// practices and when the clamp lands on the practice's existing window.
function clampTimerPractice(practice: Protocol, budgetMinutes: number): Protocol {
  const range = TIMER_FLEX_RANGE[practice.family];
  if (!range) return practice;
  const minutes = Math.max(range.min, Math.min(range.max, budgetMinutes));
  if (minutes === practice.timeWindow) return practice;
  const seconds = minutes * 60;
  return {
    ...practice,
    timeWindow: minutes as ProtocolTimeWindow,
    durationSeconds: seconds,
    steps: practice.steps.map((s) =>
      s.kind === 'timer' ? { ...s, durationSeconds: seconds } : s
    ),
  };
}

// BACKLOG (not built this pass): the short-rest cells (wind_down / just_reset
// Depleted) fall back to a short settle breath at a ≤5 budget because NSDR
// starts at 10; a ≤5 rest practice (needs new audio) would close that for an
// exact-fit short budget. (The former find-energy short gap is now CLOSED —
// timer-based movement flexes down to the budget via clampTimerPractice.)
const SHORT_POINTER_PRACTICE: Record<
  Quadrant,
  { id: string; direction: 'settle' | 'energize' }
> = {
  Activated: { id: 'box-breathing-2', direction: 'settle' },
  Tense: { id: 'extended-exhale-2', direction: 'settle' },
  Depleted: { id: 'brief-movement-5', direction: 'energize' },
  Calm: { id: 'box-breathing-2', direction: 'settle' },
};

// Build the catalog Slot a degraded short practice fills. Carries pillar 'energy'
// and the mapped direction (not the pointer's 'neutral'/'focus'/'time') so the
// reflection set and "See other options" re-filter resolve to the energy
// practice the user actually got.
function shortPracticeSlot(
  direction: 'settle' | 'energize',
  mode: SlotMode,
  practice: Protocol
): Slot {
  return {
    pillar: 'energy',
    direction,
    type: direction,
    lengthClasses: ['short'],
    mode,
    modalities: [practice.modality],
  };
}

// Degrade a ≤5-budget pointer slot to a concrete short practice. Prefers the
// quadrant-mapped id; if the injected catalog lacks it, widens to any short
// practice of the mapped direction (reusing fillCatalogSlot's degradation).
function degradePointerToShortPractice(
  pointerSlot: Slot,
  quadrant: Quadrant,
  catalog: Protocol[],
  budgetClass: LengthClass,
  evening: boolean,
  ranker: Ranker,
  clockTime: ClockTime,
  history: SessionHistory | undefined
): FilledSlot | null {
  const pref = SHORT_POINTER_PRACTICE[quadrant];
  const preferred = catalog.find((p) => p.id === pref.id);
  if (preferred) {
    return {
      practice: preferred,
      slot: shortPracticeSlot(pref.direction, pointerSlot.mode, preferred),
    };
  }
  // Fallback: any short practice of the mapped direction.
  const synthetic: Slot = {
    pillar: 'energy',
    direction: pref.direction as SlotDirection,
    type: pref.direction,
    lengthClasses: ['short'],
    mode: 'mandatory',
  };
  return fillCatalogSlot(
    synthetic,
    catalog,
    budgetClass,
    evening,
    ranker,
    clockTime,
    history
  );
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
      leadPreference: s.leadPreference,
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
  // A ≤5 budget can't honor a focus-session (the Pomodoro floor is 10) and a
  // sub-5 "focus session" is a reset wearing the wrong label, so short budgets
  // branch away from pointers to a brief practice (§ time-budget fix).
  const isShortBudget = budgetClass === 'short';

  const slots: ResolvedSlot[] = [];
  let hasPractice = false;
  for (const slot of template.slots) {
    if (isPointerSlot(slot)) {
      if (isShortBudget) {
        // Never hand off to the focus timer / plan screen at ≤5. If a sibling
        // practice already leads the plan, drop the pointer (a single short
        // practice IS the plan); offered pointers drop too. Otherwise degrade
        // the mandatory pointer to a mapped short practice.
        if (slot.mode === 'offered' || hasPractice) continue;
        const degraded = degradePointerToShortPractice(
          slot,
          quadrant,
          catalog,
          budgetClass,
          evening,
          ranker,
          clockTime,
          history
        );
        if (degraded === null) continue;
        slots.push({
          kind: 'practice',
          slot: degraded.slot,
          practice: clampTimerPractice(degraded.practice, timeBudget),
          mode: slot.mode,
        });
        hasPractice = true;
        continue;
      }
      // Medium/long budget: keep the pointer. focus-session carries a
      // budget-derived length so the Pomodoro opens at the chosen budget
      // (not the 25-min default); plan pointers are untimed (no length).
      const pointer: PracticePointer = {
        pillar: slot.pillar,
        type: slot.type as PracticePointer['type'],
        ...(slot.type === 'focus-session'
          ? { length: snapBudgetToTimerOption(timeBudget) }
          : {}),
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
      practice: clampTimerPractice(filled.practice, timeBudget),
      mode: slot.mode,
    });
    hasPractice = true;
  }

  return { situation, quadrant, message: template.message, slots };
}
