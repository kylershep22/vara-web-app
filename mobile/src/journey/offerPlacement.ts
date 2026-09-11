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
 *
 * TWO OFFERS LIVE HERE NOW (slice 7b). `placeAdvanceOffer` and
 * `placeAdjustOffer` share this module and share the `OfferPlacement` union,
 * and they deliberately do NOT share a policy: advancement is bounded by an
 * exposure budget and a calendar cap, adjustment by the weekly question itself
 * and a two-offer cap. The argument for keeping them apart is at
 * `placeAdjustOffer`. What they share is the SHAPE - eligibility in, placement
 * out, no Firestore, no clock - and the meaning of 'journey', which for
 * advancement is the map's next-phase row and for adjustment is the phase
 * page's door.
 */
import {
  ADJUST_MAX_PROACTIVE_OFFERS,
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


export interface AdjustPlacementInput {
  /** From `deriveAdjustDue`. This module never recomputes eligibility. */
  due: boolean;
  /** `journeyStates.adjustDeclines`. How many proactive offers were refused. */
  declines: number;
}

/**
 * Place the adjustment offer.
 *
 * THE PROACTIVE WINDOW, STATED AS A RULE RATHER THAN INHERITED AS AN
 * IMPLEMENTATION CONSEQUENCE (slice 7b):
 *
 *   A proactive adjustment offer remains eligible on Today until the user acts
 *   or a newer read supersedes the pair, whichever comes first.
 *
 * That sentence is the specification. It is written here because it is
 * otherwise invisible: it falls out of slice 6's present-tense read, of
 * rollover not carrying `phaseRead` forward, and of `deriveAdjustDue`'s window
 * being reads rather than weeks, and nobody tracing one of those three files
 * alone would find it. Each clause has a mechanism:
 *
 *   - "until the user acts" - declining and choosing an alternative both stamp
 *     the re-arm floor, so both drop `due` to false on the next resolve.
 *   - "or a newer read supersedes the pair" - the next weekly reset writes a
 *     third read into the window, which displaces the older of the two. If that
 *     read is not_moving the offer stays due on a fresher pair; if it is
 *     anything else the run breaks.
 *   - "whichever comes first" - there is no third exit. In particular MERE TIME
 *     IS NOT ONE. A rolled-over week the user has not answered is not a read
 *     and does not displace anything.
 *
 * NO EXPOSURE MODEL, AND THIS IS A DECISION RATHER THAN AN OMISSION. R3's
 * exposure budget, its one-per-day gate and its seven-day calendar cap are
 * SCOPED TO ADVANCEMENT ONLY, and the two offers are not analogous. The
 * advancement offer is due indefinitely once a threshold is crossed, so without
 * a budget it would sit on Today forever; the adjustment offer is due only
 * while the user's two most recent reads both say not_moving, so the weekly
 * question already bounds it. Adding a counter here would spend an offer on
 * days the user was absent and withdraw a live complaint nobody answered.
 *
 *   1. Not due                -> hidden. Nothing to surface anywhere.
 *   2. Cap spent              -> journey. Vara stops knocking; the door stays.
 *   3. Otherwise              -> today.
 *
 * 'journey' IS THE PHASE PAGE'S DOOR, and that is what makes the cap humane
 * rather than a silencing. R5: "the door is open, Vara just stops knocking."
 * `JourneyPhaseScreen` renders "Try a different approach" for the rest of the
 * phase on the strength of `adjustOfferedAt`, which the first exposure stamps,
 * so a capped user loses the card and keeps the agency. Collapsing this branch
 * into 'hidden' would take both.
 *
 * NOTHING RE-PROMOTES FROM THE CAP. There is no branch back to 'today' once
 * `declines` has reached the cap, and there is no way for `declines` to fall:
 * it is only ever incremented, and only ever cleared by a phase change through
 * CLEARED_OFFERS. A new phase is a new set of offers, which is correct.
 */
export function placeAdjustOffer(input: AdjustPlacementInput): OfferPlacement {
  if (!input.due) return 'hidden';
  if (input.declines >= ADJUST_MAX_PROACTIVE_OFFERS) return 'journey';
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
