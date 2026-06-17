// State acknowledgment — the quiet "Right now: [state]" felt phrase on the
// post-check-in dashboard. Derived from the circumplex QUADRANT only at launch.
//
// ⚠️ Near-final copy behind a swap seam (same pattern as the check-in's
// planReason.ts): the four phrases are treated as near-final but stay isolated
// here so a copy change is a one-file swap. Never a five-state legacy label,
// never a number/score.
//
// The `situation` parameter is a DORMANT seam: situation-refined phrasing is a
// later deliverable, so the signature already accepts it but launch ignores it.

import type { Quadrant, Situation } from '../../engine';

const QUADRANT_PHRASE: Record<Quadrant, string> = {
  Tense: 'A bit wound up',
  Activated: 'Plenty of energy',
  Depleted: 'Running low',
  Calm: 'Settled',
};

// Shown when the user is checked in for the day but no qualifying circumplex
// session was found (e.g. only an overwhelm / browse session today). Never
// empty, never a guessed quadrant — a calm, completion-agnostic line that still
// reads naturally after the "Right now:" frame.
export const NEUTRAL_ACKNOWLEDGMENT = 'Taking it as it comes';

/**
 * Felt phrase for the post-check-in acknowledgment. Pass the resolved quadrant,
 * or null when none could be read — then a neutral, non-guessing line is used.
 * `situation` is reserved (dormant) for future situation-refined phrasing.
 */
export function stateAcknowledgment(
  quadrant: Quadrant | null,
  situation?: Situation
): string {
  // situation is intentionally unused at launch — dormant seam (see header).
  void situation;
  if (quadrant == null) return NEUTRAL_ACKNOWLEDGMENT;
  return QUADRANT_PHRASE[quadrant];
}
