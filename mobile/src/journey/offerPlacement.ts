/**
 * WHERE an offer is surfaced, given that it is due (Journey Architecture
 * Roadmap v3, section 9 R3; slice 7a decision 1).
 *
 * A SEPARATE MODULE FROM derive.ts, AND THAT IS THE POINT OF THE SLICE.
 * `deriveAdvanceDue` answers ONE question - has this user reached a threshold -
 * and must know nothing about exposures, Today or the map. This module answers
 * the second question. The two were one function until slice 7a, and the seam
 * they hid is recorded at `deriveAdvanceDue`: a decline made eligibility return
 * false, which would have hidden the offer from the map as well as from Today
 * and contradicted R3's "then map only".
 *
 * PURE, on the same terms as derive.ts: no Firestore, no clock, no service
 * imports. `todayIso` arrives as an argument so the boundaries are testable as
 * literals rather than only through a mocked date.
 *
 * THREE PLACEMENTS, AND 'journey' IS NOT 'hidden'. A demoted offer has not been
 * withdrawn; it has stopped occupying Today. R3 is explicit that the map is
 * where the offer lives after demotion, and it is reachable there because every
 * journey map row opens, including the ones ahead (JourneyMapScreen.tsx:267-277,
 * roadmap section 8 "AHEAD opens"). Collapsing 'journey' into 'hidden' would
 * make a demoted offer vanish, which is the failure this union exists to name.
 */
import {
  ADVANCE_MAX_TODAY_EXPOSURES,
  ADVANCE_TODAY_CAP_DAYS,
} from '../constants/journey';
import { daysBetweenIso } from '../utils/weekStart';

/**
 * Where a due offer belongs right now.
 *
 * 'today'   - occupies the journey-action slot beneath the hero.
 * 'journey' - demoted. Reachable from the map, never re-promoted.
 * 'hidden'  - not due at all. Nothing to surface anywhere.
 */
export type OfferPlacement = 'today' | 'journey' | 'hidden';

export interface AdvancePlacementInput {
  /** From `deriveAdvanceDue`. This module never recomputes eligibility. */
  due: boolean;
  /** Has the user dismissed the offer in this phase? */
  declined: boolean;
  /** Eligible Today exposures already spent in this phase. */
  exposures: number;
  /** ISO date of the FIRST exposure, or null before there has been one. */
  firstOfferedOn: string | null;
  /** Today, ISO YYYY-MM-DD. */
  todayIso: string;
}

/**
 * Place the advancement offer.
 *
 * ORDER MATTERS AND IS THE POLICY, so the branches are spelled out rather than
 * collapsed into one boolean expression:
 *
 *   1. Not due at all         -> hidden. Nothing has been earned or elapsed.
 *   2. Dismissed              -> journey, IMMEDIATELY (R3: "Dismiss removes it
 *                                immediately"). Not hidden: the door stays open.
 *   3. Exposure budget spent  -> journey.
 *   4. Calendar cap elapsed   -> journey, whether or not the budget was spent.
 *   5. Otherwise              -> today.
 *
 * NOTHING RE-PROMOTES. There is no branch back to 'today' from 'journey',
 * because R3 forbids one: no badge, no "you haven't responded" language, no
 * re-promotion. The only way a user sees this on Today again is a NEW phase,
 * and a phase change clears every field this function reads (CLEARED_OFFERS in
 * journeyState.service.ts).
 *
 * A BACKWARDS CLOCK KEEPS THE OFFER ON TODAY. `daysBetweenIso` is signed, so a
 * `firstOfferedOn` in the future yields a negative that fails the cap test and
 * leaves the offer where it is. That is the safe direction: a device whose date
 * was corrected should not silently demote an offer the user never saw.
 */
export function placeAdvanceOffer(input: AdvancePlacementInput): OfferPlacement {
  if (!input.due) return 'hidden';
  if (input.declined) return 'journey';
  if (input.exposures >= ADVANCE_MAX_TODAY_EXPOSURES) return 'journey';
  if (
    input.firstOfferedOn !== null &&
    daysBetweenIso(input.firstOfferedOn, input.todayIso) >= ADVANCE_TODAY_CAP_DAYS
  ) {
    return 'journey';
  }
  return 'today';
}

/**
 * May this exposure be recorded today?
 *
 * THE DAY GATE, AND IT IS A SEPARATE FUNCTION SO THE ORDERING IS INSPECTABLE.
 * R3 allows at most one exposure per calendar day. The caller must evaluate
 * this BEFORE the write, never after: an exposure write bumps `updatedAt`,
 * which feeds `revisionToken` (resolveJourney.ts:70-75), and Home re-resolves
 * on every focus (DashboardScreen.tsx:212-220), so a write-then-gate ordering
 * would spend the whole budget in an afternoon of tab switches. What stops that
 * recurring is that the re-resolve carries the freshly written
 * `lastExposedOn === todayIso` and this returns false on the next pass.
 *
 * Placement is passed in rather than recomputed so that "the card is on Today"
 * and "today has not been spent" are one decision at one call site.
 */
export function shouldRecordExposure(
  placement: OfferPlacement,
  lastExposedOn: string | null,
  todayIso: string
): boolean {
  if (placement !== 'today') return false;
  return lastExposedOn !== todayIso;
}
