/**
 * Lead-preference ordering for tie-broken practice selection (§9.4).
 *
 * PROVISIONAL PLACEHOLDER — pending clinical review. This ordering is NOT a
 * clinical decision and must not be treated as one. It exists only to break the
 * budget/recency ties that otherwise collapse ~20 of the 24 check-in cells onto
 * four practices (see mobile/docs/diagnostics/checkin-protocol-audit.md). The
 * domain review will revise this list and populate per-slot `leadPreference`
 * overrides in PLAN_MAP.
 *
 * Best-first. Ids absent from the applicable list rank at Infinity and fall
 * through to the alphabetical id tiebreak, so an empty or partial list
 * reproduces the prior behavior exactly.
 *
 * Bright-light is ranked LAST deliberately: its own `whenItFits` copy says it is
 * best paired and less effective as a one-off, so the check-in should not lead
 * with it.
 */
export const PRACTICE_LEAD_PREFERENCE: readonly string[] = [
  // Settle breath
  'extended-exhale-2',
  'cyclic-sighing-2',
  'box-breathing-2',
  'coherence-breathing-5',
  // Energize
  'mindful-walking-10',
  'mindful-walking-20',
  'brief-movement-5',
  'brief-movement-10',
  'bright-light-10',
  'bright-light-20',
];
