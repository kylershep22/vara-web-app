// Late-night NSDR swap — Phase 2 sub-step 2.4 stub-extension.
//
// SCOPE: when the user is Wired AND the local hour is late evening or
// overnight, the not_shifted "Try something longer" affordance routes
// to NSDR specifically rather than to the recommender's general
// eligibility output. Per Core Loop v2 §"Path B — Not shifted" line
// 270.
//
// PHASE 2 STUB-EXTENSION — slated for absorption into Phase 4.
//
// Phase 4 owns the recommender's full algorithm, which will include
// time-of-day awareness as one of several scoring inputs. At that
// point this wrapper is no longer needed: the recommender's natural
// output for (wired, longer time-window, late-evening hour) will
// already be NSDR. Delete this file when Phase 4 lands.
//
// This wrapper exists ONLY so sub-step 2.4 can ship the spec'd
// late-night-Wired → NSDR override without muddying the Phase 2
// stub recommender's "first-match deterministic" contract.
// Late-night NSDR is the only recommender override in Phase 2.
// Additional overrides (bright-light morning, post-meal movement,
// etc.) belong in Phase 4 regardless of how mechanically simple they
// look — see PHASE_NOTES.md "Sub-step 2.4 entry — locked decisions"
// for the scope-creep guardrail.

import type { BrainState } from '../types/models';

export interface LateNightNSDROverride {
  protocolId: 'nsdr-20';
}

// Inclusive lower bound, exclusive upper bound. 22:00–23:59 and
// 00:00–03:59 trigger the override; 04:00 onward does not. 4 AM is
// the cutoff because someone Wired at that hour is closer to "give
// up and start the day" than "rest" — a 20-minute NSDR is the wrong
// recommendation past that point.
const LATE_NIGHT_START_HOUR = 22;
const LATE_NIGHT_END_HOUR_EXCLUSIVE = 4;

function isLateNightHour(hourLocal: number): boolean {
  return (
    hourLocal >= LATE_NIGHT_START_HOUR ||
    hourLocal < LATE_NIGHT_END_HOUR_EXCLUSIVE
  );
}

/**
 * Returns an NSDR override when the user is Wired AND the local
 * hour is late evening or overnight (22:00–03:59). Otherwise null.
 *
 * Pure function — caller injects `hourLocal` (0–23) so determinism
 * is preserved at the wrapper boundary. Production callers pass
 * `new Date().getHours()`; tests pass fixed values.
 *
 * Phase 2 hardcodes nsdr-20 because it's the canonical NSDR. Phase 4
 * will pick variant based on user's completion history with NSDR —
 * users who've previously abandoned NSDR-20 mid-session should get
 * NSDR-10.
 */
export function getLateNightNSDRSwap(
  stateBefore: BrainState,
  hourLocal: number
): LateNightNSDROverride | null {
  if (stateBefore !== 'wired') return null;
  if (!isLateNightHour(hourLocal)) return null;
  return { protocolId: 'nsdr-20' };
}
