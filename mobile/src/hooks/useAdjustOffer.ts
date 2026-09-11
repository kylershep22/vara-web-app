/**
 * The adjustment offer's runtime: the weekly reads, eligibility, placement, and
 * the one write that opens the phase page's door (slice 7b, roadmap section 9
 * R5).
 *
 * A HOOK RATHER THAN LOGIC IN DashboardScreen, on the `useAdvanceOffer`
 * precedent: the rules are testable in isolation and Home asks one question and
 * renders the answer.
 *
 * IT OWNS EXACTLY ONE WRITE. `recordAdjustOffered`, when the offer first
 * occupies Today. Declining and choosing are the screen's to call, because both
 * are user actions and neither belongs in an effect.
 *
 * IT READS weeklyCycles, AND THAT IS A DEPARTURE FROM `useAdvanceOffer`'s "NO
 * SECOND READ" RULE. The departure is forced rather than chosen: advancement is
 * derived from `dailyLogs` and `enteredAt`, which Home already holds, while
 * adjustment is derived from the weekly phase reads, and the resolver fetches
 * only the LATEST cycle. There is no way to answer this question from state
 * already in hand.
 *
 * SO THE READ IS BOUNDED BY ITS DEPENDENCIES INSTEAD. Home re-resolves the
 * journey on every focus, and an unguarded read here would run on every tab
 * switch. The effect below depends on the uid, the phase entry date, today, and
 * the journey's `revisionToken` - which is to say it re-runs once a day, once
 * per phase, and once per write to the journey document. A decline bumps
 * `updatedAt` and therefore `revisionToken`, which re-reads exactly once and is
 * what makes the card disappear on the render after the tap rather than on the
 * next launch.
 *
 * `getWeeklyCyclesSince` IS INDEX-FREE AND READS ~52 ROWS A YEAR. That is the
 * service's own stated design (it filters on userId and narrows in memory
 * precisely so no composite index is needed), and nothing here adds an
 * `orderBy` that would strand it.
 *
 * THE ORDER THE SERVICE RETURNS IS THE ORDER THE DERIVATION CONSUMES. Nothing
 * in this file sorts. See `deriveAdjustDue`.
 *
 * `todayIso` IS PASSED IN, NOT COMPUTED, for the reason `useAdvanceOffer`
 * records: `useTodayCard` already holds today as state with an AppState
 * listener, and a second definition of today on one screen is how one of them
 * goes stale.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { deriveAdjustDue } from '../journey/derive';
import { placeAdjustOffer, type OfferPlacement } from '../journey/offerPlacement';
import type { PhaseContext } from '../journey/resolveJourney';
import {
  recordAdjustDeclined,
  recordAdjustOffered,
} from '../services/firebase/journeyState.service';
import { getWeeklyCyclesSince } from '../services/firebase/weeklyCycle.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import type { WeeklyCycle } from '../types/models';
import { logger } from '../utils/logger';

export interface AdjustOffer {
  /** Where the offer belongs. 'hidden' when it is not due at all. */
  placement: OfferPlacement;
  /**
   * Which body is honest right now: the first offer or the second.
   *
   * A BOOLEAN, NOT A COUNT, AND NOT AN ORDINAL. The card needs to know which of
   * two strings to render and must never learn, or be able to render, how many
   * times the user has been asked. `adjustDeclines` stays in the engine.
   */
  isSecondOffer: boolean;
  /**
   * Decline. Re-arms the counter from this week and spends one of the two
   * proactive offers.
   *
   * OPTIMISTIC IN THE UI SENSE, on the `useAdvanceOffer` precedent: the local
   * dismissal happens whether or not the write lands. A failed decline that
   * left the card up would re-ask a user who has just answered.
   */
  decline: () => void;
}

export interface UseAdjustOfferInput {
  uid: string | undefined;
  /** null on every legacy path and whenever JOURNEY_IA is off. */
  phase: PhaseContext | null;
  /** From useTodayCard. The one definition of today on this screen. */
  todayIso: string;
}

const NOT_DUE: AdjustOffer = {
  placement: 'hidden',
  isSecondOffer: false,
  decline: () => {},
};

export function useAdjustOffer(input: UseAdjustOfferInput): AdjustOffer {
  const { uid, phase, todayIso } = input;

  // Local dismissal, so a decline takes effect on the current render rather
  // than waiting for the re-read. Cleared by the re-read's own answer arriving
  // with the new floor in `adjustArmedFromIso`.
  const [dismissed, setDismissed] = useState(false);
  const [cycles, setCycles] = useState<WeeklyCycle[]>([]);

  const enteredAtIso = phase?.enteredAtIso ?? '';
  const revisionToken = phase?.revisionToken ?? 0;

  useEffect(() => {
    // A phase with no resolved entry date has nothing to read SINCE. Bailing
    // leaves `cycles` empty, which reads as "not due" rather than as a window
    // stretching back to the epoch.
    if (!uid || !enteredAtIso) return;
    let active = true;
    void getWeeklyCyclesSince(uid, enteredAtIso)
      .then((rows) => {
        // Oldest first, exactly as returned. NOT RE-SORTED, here or anywhere
        // downstream: the service's fallback-aware ordering is the contract.
        if (active) setCycles(rows);
      })
      .catch((error) => {
        // A failed read costs the offer, never the screen. The user keeps a
        // Today that simply does not raise the question this time.
        logger.error('[useAdjustOffer] weekly cycle read failed:', error);
      });
    return () => {
      active = false;
    };
  }, [uid, enteredAtIso, todayIso, revisionToken]);

  const due = useMemo<boolean>(() => {
    if (!phase) return false;
    return deriveAdjustDue({
      cyclesOldestFirst: cycles,
      phaseKey: phase.phaseKey,
      armedFromIso: phase.adjustArmedFromIso,
    });
  }, [phase, cycles]);

  const placement = useMemo<OfferPlacement>(() => {
    if (!phase) return 'hidden';
    if (dismissed) return 'journey';
    return placeAdjustOffer({ due, declines: phase.adjustDeclines });
  }, [phase, due, dismissed]);

  const declines = phase?.adjustDeclines ?? 0;
  const alreadyOffered = phase?.adjustOffered ?? false;

  useEffect(() => {
    // THE DOOR-OPENING WRITE, ONCE PER PHASE, AND THE GATE IS WHAT BOUNDS IT.
    // `adjustOfferedAt` is what `JourneyPhaseScreen` reads to decide whether
    // "Try a different approach" belongs on the page, so it has to be stamped
    // the first time the offer reaches Today and never needs stamping again.
    //
    // THE GATE IS READ BEFORE THE WRITE AND OFF STATE THIS RENDER ALREADY
    // HELD, which is the same ordering `shouldRecordExposure` makes load
    // bearing on the advance side. The write bumps `updatedAt`, which feeds
    // `revisionToken`, and Home re-resolves on every focus; the re-resolve
    // carries `adjustOffered` true and this effect returns early on the next
    // pass. Without the gate it would write on every focus for as long as the
    // card was up, and each write would trigger another resolve.
    if (!uid || placement !== 'today' || alreadyOffered) return;
    void recordAdjustOffered(uid)
      .then(() => {
        logEvent(uid, 'journey_adjust_offered', {});
      })
      .catch((error) => {
        // A failed write costs the door, not the card: the offer is on screen
        // and stays there, and the next render retries because the gate still
        // reads false. Logged rather than surfaced, because nothing about the
        // user's day has gone wrong.
        logger.error('[useAdjustOffer] offered write failed:', error);
      });
  }, [uid, placement, alreadyOffered]);

  const decline = useCallback(() => {
    setDismissed(true);
    if (!uid) return;
    logEvent(uid, 'journey_adjust_declined', {});
    void recordAdjustDeclined(uid).catch((error) => {
      logger.error('[useAdjustOffer] decline write failed:', error);
    });
  }, [uid]);

  if (!phase) return NOT_DUE;
  return {
    placement,
    // ZERO DECLINES IS THE FIRST OFFER, ONE IS THE SECOND. Read off the count
    // rather than off a stored ordinal, so there is nothing to keep in step.
    isSecondOffer: declines >= 1,
    decline,
  };
}
