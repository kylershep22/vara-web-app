/**
 * The advancement offer's runtime: eligibility, placement, and the one write
 * that spends an exposure (slice 7a, roadmap section 9 R2/R3).
 *
 * A HOOK RATHER THAN LOGIC IN DashboardScreen, for the reason `journeyActionFor`
 * exists at all: the rules here are testable in isolation, and Home should ask
 * one question and render the answer.
 *
 * IT OWNS EXACTLY ONE WRITE. `recordAdvanceExposure`, behind the day gate.
 * Accepting and declining are the screen's to call, because both are user
 * actions with navigation attached and neither belongs in an effect.
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
 * reintroducing while "simplifying" the effect.
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

  const lastExposedOn = phase?.advanceLastExposedOn ?? null;
  const firstOfferedOn = phase?.advanceFirstOfferedOn ?? null;

  useEffect(() => {
    // THE GATE, BEFORE THE WRITE. Both arguments are values this render already
    // held; nothing is fetched between the decision and the effect of it.
    if (!uid || !shouldRecordExposure(placement, lastExposedOn, todayIso)) return;
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
        logger.error('[useAdvanceOffer] exposure write failed:', error);
      });
  }, [uid, placement, lastExposedOn, firstOfferedOn, todayIso, door]);

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
