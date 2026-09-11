/**
 * The advancement offer's runtime: eligibility, placement, and - in a SECOND
 * hook at the foot of this file - the one write that spends an exposure
 * (slice 7a, roadmap section 9 R2/R3; split in slice 7d).
 *
 * A HOOK RATHER THAN LOGIC IN DashboardScreen, for the reason `journeyActionFor`
 * exists at all: the rules here are testable in isolation, and Home should ask
 * one question and render the answer.
 *
 * TWO HOOKS, AND THE SPLIT IS FORCED BY A RENDER-ORDER CYCLE (slice 7d). The
 * exposure write has to know whether the advancement card is the thing actually
 * OCCUPYING Today's one journey-action slot, and only `journeyActionFor` knows
 * that. But `journeyActionFor` takes `advancePlacement` as an INPUT
 * (journeyAction.ts), which is this hook's own output, so its answer cannot be
 * an argument to the hook it is computed from. The write therefore moves below
 * the answer instead: `useAdvanceOffer` returns the placement, the screen asks
 * `journeyActionFor`, and `useAdvanceExposure` takes that answer and owns the
 * write. `journeyActionFor` keeps its signature, its branch and its ordering
 * tests; the precedence rule stays in exactly one place.
 *
 * ACCEPTING AND DECLINING STAY THE SCREEN'S TO CALL, because both are user
 * actions with navigation attached and neither belongs in an effect.
 *
 * NO SECOND READ. Every input arrives on `PhaseContext`, which the resolver
 * built from a document it had already fetched. A `getJourneyState` call here
 * would answer even with JOURNEY_IA off, which is the trap slice 6 recorded on
 * the weekly reset screen.
 *
 * `todayIso` IS PASSED IN, NOT COMPUTED. `useTodayCard` already holds today as
 * state with an AppState listener and a render sync, because an app left open
 * past midnight otherwise reads yesterday's row all day. Recomputing it here
 * would be a second definition of "today" on one screen, and the one in an
 * effect with no date-derived dependency is exactly the version that goes stale.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { deriveAdvanceDoor, deriveCalendarDays } from '../journey/derive';
import {
  placeAdvanceOffer,
  shouldRecordExposure,
  type OfferPlacement,
} from '../journey/offerPlacement';
import type { PhaseContext } from '../journey/resolveJourney';
import type { AdvanceDoor } from '../journey/derive';
import type { JourneyAction } from '../journey/journeyAction';
import {
  recordAdvanceDeclined,
  recordAdvanceExposure,
} from '../services/firebase/journeyState.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import { logger } from '../utils/logger';

export interface AdvanceOffer {
  /** Where the offer belongs. 'hidden' when it is not due at all. */
  placement: OfferPlacement;
  /** Which door opened, or null when none has. Chooses the card's copy. */
  door: AdvanceDoor;
  /**
   * Dismiss. Demotes to the journey immediately and never re-promotes.
   *
   * OPTIMISTIC IN THE UI SENSE: the local demotion happens whether or not the
   * write lands. A failed dismiss that left the card up would re-ask a user who
   * has just answered, which is worse than a dismissal that is forgotten on the
   * next launch.
   */
  dismiss: () => void;
}

export interface UseAdvanceOfferInput {
  uid: string | undefined;
  /** null on every legacy path and whenever JOURNEY_IA is off. */
  phase: PhaseContext | null;
  /** From useTodayCard. Completed days in this phase. */
  consistentDays: number;
  /** From useTodayCard. The one definition of today on this screen. */
  todayIso: string;
}

const NOT_DUE: AdvanceOffer = {
  placement: 'hidden',
  door: null,
  dismiss: () => {},
};

export function useAdvanceOffer(input: UseAdvanceOfferInput): AdvanceOffer {
  const { uid, phase, consistentDays, todayIso } = input;

  // Local demotion, so a dismiss takes effect on the current render rather than
  // waiting for the next resolve. Keyed to nothing: it is cleared by the
  // resolver's own answer arriving with `advanceDeclined` true.
  const [dismissed, setDismissed] = useState(false);

  const door = useMemo<AdvanceDoor>(() => {
    if (!phase) return null;
    return deriveAdvanceDoor({
      consistentDays,
      // The first production caller of this derivation. `enteredAtIso` is the
      // empty string until the server resolves `enteredAt`, and the function
      // returns 0 for an unparseable date rather than counting from the epoch,
      // so an unresolved phase reads as day zero rather than as long overdue.
      calendarDays: deriveCalendarDays(phase.enteredAtIso, todayIso),
    });
  }, [phase, consistentDays, todayIso]);

  const placement = useMemo<OfferPlacement>(() => {
    if (!phase) return 'hidden';
    return placeAdvanceOffer({
      due: door !== null,
      declined: phase.advanceDeclined || dismissed,
      exposures: phase.advanceExposures,
      firstOfferedOn: phase.advanceFirstOfferedOn,
      todayIso,
    });
  }, [phase, door, dismissed, todayIso]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (!uid || door === null) return;
    logEvent(uid, 'journey_advance_declined', { from: 'card' });
    void recordAdvanceDeclined(uid).catch((error) => {
      logger.error('[useAdvanceOffer] decline write failed:', error);
    });
  }, [uid, door]);

  if (!phase) return NOT_DUE;
  return { placement, door, dismiss };
}

export interface UseAdvanceExposureInput {
  uid: string | undefined;
  /**
   * `journeyActionFor`'s answer for THIS render: what is occupying Today's one
   * journey-action slot.
   *
   * THE WHOLE POINT OF SLICE 7d. Until 7d the gate read `placement === 'today'`,
   * which is ELIGIBILITY - the offer is allowed on Today - and says nothing
   * about whether anything else outranked it. Capture beats adjust beats
   * advance (journeyAction.ts), so an eligible advancement offer sitting behind
   * the capture card or behind C2 spent an exposure on a card that never drew.
   * Observed twice on device during 7b's walk, and it contradicts R3 as
   * `ADVANCE_MAX_TODAY_EXPOSURES` states it: "This counts occasions the user
   * could actually have seen it."
   *
   * NULL IS ALSO THE NOT-YET-SETTLED ENCODING and needs no separate term. Home
   * computes this only once `useAdjustOffer` has answered (DashboardScreen), so
   * the frame where the weekly read is still in flight arrives here as null and
   * writes nothing. That frame is not hypothetical: adjust's read is async, so
   * on a cold open with both offers due there is a render where adjust is
   * 'hidden' only because it does not know yet.
   */
  action: JourneyAction;
  /** From `useAdvanceOffer`. Null when no door has opened. */
  door: AdvanceDoor;
  /** null on every legacy path and whenever JOURNEY_IA is off. */
  phase: PhaseContext | null;
  /** From useTodayCard. The one definition of today on this screen. */
  todayIso: string;
}

/**
 * The one write the advancement offer owns: `recordAdvanceExposure`, behind the
 * day gate and behind the rendered slot (slice 7a, re-gated in 7d).
 *
 * A SEPARATE HOOK FROM `useAdvanceOffer`, AND NOT A STYLISTIC ONE. The argument
 * is at the top of this file: `journeyActionFor` consumes `useAdvanceOffer`'s
 * placement, so the only place its answer can be consumed in turn is below it.
 *
 * IT RETURNS NOTHING. There is no state here the screen needs; the card's copy
 * and its controls all come off `useAdvanceOffer`. A hook that returns void is
 * the honest shape for "this effect belongs to this feature", and it keeps the
 * write's reasoning next to the offer it belongs to rather than in the screen.
 *
 * THE ORDERING THAT MAKES THIS SAFE, and it is the whole reason the effect below
 * looks the way it does. An exposure write bumps `updatedAt`, which feeds
 * `revisionToken` (resolveJourney.ts), and Home re-resolves the journey on EVERY
 * focus (DashboardScreen useFocusEffect). So a write here is always followed by
 * a re-resolve, and the re-resolve re-runs this effect. What stops that
 * recurring is not luck and not a ref: the re-resolve carries the freshly
 * written `advanceLastExposedOn`, `shouldRecordExposure` compares it to
 * `todayIso`, and the second pass returns false. THE GATE IS EVALUATED BEFORE
 * THE WRITE AND READS STATE THE RENDER ALREADY HELD. A write-then-gate ordering
 * would spend the entire three-exposure budget in one afternoon of tab
 * switching, which is the defect this comment exists to prevent someone
 * reintroducing while "simplifying" the effect. 7d added a term to the gate and
 * did not touch that ordering.
 */
export function useAdvanceExposure(input: UseAdvanceExposureInput): void {
  const { uid, action, door, phase, todayIso } = input;

  const lastExposedOn = phase?.advanceLastExposedOn ?? null;
  const firstOfferedOn = phase?.advanceFirstOfferedOn ?? null;

  useEffect(() => {
    // THE GATE, BEFORE THE WRITE. Every argument is a value this render already
    // held; nothing is fetched between the decision and the effect of it. The
    // effect runs after the commit that drew the card, so by the time this
    // writes, the card the exposure is being spent on is on the screen.
    if (!uid || !shouldRecordExposure(action === 'advance', lastExposedOn, todayIso)) {
      return;
    }
    if (door === null) return;

    void recordAdvanceExposure(uid, todayIso, firstOfferedOn)
      .then(() => {
        logEvent(uid, 'journey_advance_offered', { door });
      })
      .catch((error) => {
        // A failed exposure write costs the budget one day of accounting, never
        // the card: the offer is already on screen and stays there. Logged
        // rather than surfaced, because there is nothing the user can do and
        // nothing about their day has gone wrong.
        logger.error('[useAdvanceExposure] exposure write failed:', error);
      });
  }, [uid, action, lastExposedOn, firstOfferedOn, todayIso, door]);
}
