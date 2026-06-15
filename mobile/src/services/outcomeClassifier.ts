// Pure outcome classifier for the post-protocol re-check transition.
//
// Pulled forward from sub-step 2.3 because the 2.2 reducer needs it
// at the re_check → response transition. Service-layer placement
// (decoupled from UI) so Phase 5 Patterns analysis can reuse it
// without dragging the flow types along.
//
// 5×5 transition matrix (stateBefore × stateAfter → outcome):
//
//          wired   foggy   steady       clear        alive
//   wired  not     partial shifted      shifted      shifted
//   foggy  not     not     shifted      shifted      shifted
//   steady not     not     maintenance  shifted      shifted
//   clear  not     not     maintenance  maintenance  shifted
//   alive  not     not     maintenance  maintenance  maintenance
//
// Rule clusters (numbering matches inline conditionals below):
//   1. wired → foggy                        = 'partial_shift'
//   2. (wired|foggy) → green                = 'shifted'
//   3. green → green, upward                = 'shifted'
//      (steady→clear, steady→alive, clear→alive)
//   4. green → green, same or downward      = 'maintenance'
//      (incl. alive→clear, clear→steady, alive→steady)
//   5. green → (wired|foggy)                = 'not_shifted' (regression)
//   6. (wired|foggy) → (wired|foggy), excl. cluster 1 = 'not_shifted'
//
// NOT handled here:
//   - 'abandoned' — set at the AbandonedStep write site, never
//     reaches this function.
//   - 'failed' — system failures (audio_error path). Set by the
//     caller when the player surfaces a hard error, not from a
//     state transition.
//
// The "upward green-to-green = 'shifted'" rule (cluster 3) is
// inferred, not stated in Core Loop v2. See SPEC_CONSISTENCY_BACKLOG
// "Outcome classifier: upward green-to-green = 'shifted'" for
// rationale and the Phase 5 escape hatch.

import type { BrainState } from '../types/models';
import type { Pillar, SlotDirection } from '../engine';
import { reflectionSetFor } from '../components/checkin/flow/reflection';

export type ClassifierOutcome =
  | 'shifted'
  | 'partial_shift'
  | 'maintenance'
  | 'not_shifted';

// ────────────────────────────────────────────────────────────
// Reflection recorder (engine-wired check-in path)
// ────────────────────────────────────────────────────────────
// The engine loop replaced the five-state before→after re-check with a
// single-tap per-pillar reflection (Vara_Engine_Contract.md §9.6). This records
// the felt outcome from the reflection chip rather than a state delta. The old
// `classifyOutcome` above is retained ONLY for the BrowseRunFlow path (a
// separate run flow that still captures a BrainState re-check); the check-in
// flow uses this recorder.
//
// Chip → legacy outcome mapping (the three chips, in set order):
//   strong-positive (chip 0)  → 'shifted'      — the only firstShift-qualifying
//   middle          (chip 1)  → 'maintenance'  — held, did not move further
//   negative        (chip 2)  → 'not_shifted'
//
// firstShiftAt qualifies ONLY on the strong-positive chip (locked Phase B
// decision), surfaced as an explicit boolean so the gate never drifts from the
// outcome enum.

export interface ReflectionOutcome {
  outcome: ClassifierOutcome;
  qualifiesFirstShift: boolean;
}

export function classifyReflectionOutcome(
  pillar: Pillar,
  direction: SlotDirection,
  reflectionId: string
): ReflectionOutcome {
  const set = reflectionSetFor(pillar, direction);
  if (reflectionId === set.strongPositiveId) {
    return { outcome: 'shifted', qualifiesFirstShift: true };
  }
  // The third chip is the negative; everything else (the middle chip, or an
  // unrecognized id) is treated as "held, not a regression."
  const negativeId = set.chips[2].id;
  if (reflectionId === negativeId) {
    return { outcome: 'not_shifted', qualifiesFirstShift: false };
  }
  return { outcome: 'maintenance', qualifiesFirstShift: false };
}

// Ordinal rank within the green zone. Used only to detect upward vs
// downward green-to-green moves; values outside the green zone are
// never compared.
const GREEN_RANK: Readonly<Record<'steady' | 'clear' | 'alive', number>> = {
  steady: 0,
  clear: 1,
  alive: 2,
};

const GREEN_ZONE: ReadonlySet<BrainState> = new Set<BrainState>([
  'steady',
  'clear',
  'alive',
]);

function isGreen(
  state: BrainState
): state is 'steady' | 'clear' | 'alive' {
  return GREEN_ZONE.has(state);
}

export function classifyOutcome(
  stateBefore: BrainState,
  stateAfter: BrainState
): ClassifierOutcome {
  // Cluster 1 — strict partial-shift.
  if (stateBefore === 'wired' && stateAfter === 'foggy') {
    return 'partial_shift';
  }

  const beforeGreen = isGreen(stateBefore);
  const afterGreen = isGreen(stateAfter);

  // Cluster 2 — negative → green (lift into working zone).
  if (!beforeGreen && afterGreen) {
    return 'shifted';
  }

  // Clusters 3 & 4 — green → green, split by direction.
  if (beforeGreen && afterGreen) {
    return GREEN_RANK[stateAfter] > GREEN_RANK[stateBefore]
      ? 'shifted' // cluster 3
      : 'maintenance'; // cluster 4
  }

  // Clusters 5 & 6 — both produce 'not_shifted':
  //   - green → negative (regression)
  //   - negative → negative, excluding wired→foggy (cluster 1)
  return 'not_shifted';
}
