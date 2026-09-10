/**
 * What occupies Today's ONE journey-action slot (slice 7a decision 3).
 *
 * ONE SLOT, ONE FUNCTION, AND THE FUNCTION IS PURE. Section 8 gives Today a
 * three-card ceiling: hero, the journey-action card, and the close entry. The
 * Start here row and the journey line do not count against it, deliberately -
 * they are rows, not cards, and StartHereRow.tsx's header records why the
 * distinction is load bearing rather than cosmetic.
 *
 * REMOVE CAPTURE COUNTS AGAINST THE CEILING (decision 3). It shipped in 3c-i as
 * an unconditional sibling of whatever else was below the hero, at a moment when
 * the slot beside it held a continuity count that has since retired. If it looks
 * like a card it occupies attention like a card, so it competes for this slot
 * rather than sitting outside the question.
 *
 * WHY A FUNCTION AND NOT A TERNARY IN DashboardScreen. Three offers with a
 * priority order between them is a rule, and a rule expressed as nested JSX
 * conditionals can only be verified by rendering. Here every boundary is a unit
 * test, including the two that matter most and are the least obvious.
 *
 * THE PRIORITY, AND WHY IT IS THIS ORDER:
 *
 *   1. capture  - a user who has not named what they are working on should not
 *                 be offered advancement AWAY from it. The capture is the thing
 *                 the phase is about; offering to leave before it exists asks
 *                 them to move on from nothing.
 *   2. adjust   - C2 BEATS B2. A user can satisfy the behavioural advancement
 *                 threshold while having twice told us "not really yet", and
 *                 offering to move forward at that moment contradicts what they
 *                 explicitly said. WHAT THE USER TELLS US BEATS WHAT WE INFER
 *                 FROM TAPS. Advancement stays eligible internally - this is a
 *                 question of which offer is right to make proactively, never of
 *                 whether the user has earned anything.
 *   3. advance  - B2.
 *   4. null     - nothing. The slot renders nothing at all, not a placeholder.
 *
 * THE ADJUST BRANCH IS BUILT HERE AND UNREACHABLE IN 7a. Slice 7b supplies the
 * C2 card and the derivation that can return a non-hidden adjust placement; 7a
 * passes 'hidden' at the only call site. The branch and its ordering test exist
 * now so that 7b adds a card rather than discovering a priority question late,
 * and so the capture/adjust/advance ordering is settled by test before either of
 * the two later cards is designed against it.
 */
import type { PhaseKey } from '../types/models';
import type { OfferPlacement } from './offerPlacement';

/** What the single journey-action slot shows, or null for nothing. */
export type JourneyAction = 'capture' | 'adjust' | 'advance' | null;

export interface JourneyActionInput {
  /**
   * The phase in progress, or null when there is no journey to act on.
   *
   * NULL IS ALSO THE FLAG-OFF ENCODING and needs no separate term.
   * `useJourneyLanding` sets `phase` to null whenever JOURNEY_IA is off, there
   * is no uid, the weekly guard has not answered, or the user is floor-gated
   * (useJourneyLanding.ts:108-115). Every one of those must show no journey
   * action, and every one of them arrives here as null.
   */
  phaseKey: PhaseKey | null;
  /** Has the user completed the Remove capture? */
  hasRemoveCapture: boolean;
  /** Dismissed for this session only. Not persisted, by 3c-i's design. */
  captureDismissed: boolean;
  /** Slice 7b. 7a passes 'hidden'. */
  adjustPlacement: OfferPlacement;
  advancePlacement: OfferPlacement;
}

export function journeyActionFor(input: JourneyActionInput): JourneyAction {
  if (input.phaseKey === null) return null;

  // PHASE-SCOPED, not global. The capture belongs to the Remove phase, so a
  // user in recover with no capture is not chased for one. This reproduces the
  // gate DashboardScreen carried inline before this function existed.
  if (
    input.phaseKey === 'remove' &&
    !input.hasRemoveCapture &&
    !input.captureDismissed
  ) {
    return 'capture';
  }

  if (input.adjustPlacement === 'today') return 'adjust';
  if (input.advancePlacement === 'today') return 'advance';
  return null;
}
