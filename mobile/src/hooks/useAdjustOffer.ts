/**
 * The adjustment offer's runtime: the weekly reads, eligibility, placement, and
 * - in a SECOND hook at the foot of this file - the one write that opens the
 * phase page's door (slice 7b, roadmap section 9 R5; split in slice 7d).
 *
 * A HOOK RATHER THAN LOGIC IN DashboardScreen, on the `useAdvanceOffer`
 * precedent: the rules are testable in isolation and Home asks one question and
 * renders the answer.
 *
 * TWO HOOKS, FOR THE REASON `useAdvanceOffer` RECORDS AT LENGTH (slice 7d).
 * `journeyActionFor` takes `adjustPlacement` as an input, so its answer cannot
 * be an argument to the hook that produced it; the write moves below the answer
 * instead, into `useAdjustDoorStamp`. Declining and choosing stay the screen's
 * to call, because both are user actions and neither belongs in an effect.
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
import type { JourneyAction } from '../journey/journeyAction';
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
   * Has the weekly read answered yet?
   *
   * IT EXISTS BECAUSE 'hidden' IS AMBIGUOUS (slice 7d). `placement` is 'hidden'
   * both when the offer is genuinely not due and when `cycles` is still the
   * empty array this hook starts from, and those are different facts with
   * different consequences. Home gates its whole journey-action slot on this:
   * until adjust has answered, `journeyActionFor` is not asked at all and the
   * slot renders nothing, which is the frame-1 loading gate (no phase, no
   * action) extended to the second async read on the screen.
   *
   * WITHOUT IT THE ADVANCEMENT CARD DRAWS AND IS THEN REPLACED. On a cold open
   * with both offers due, the frame before the weekly read lands has adjust
   * 'hidden' and advance 'today', so B2 paints, spends an exposure, and C2
   * swaps in a render later. The exposure was the defect 7d is named for; the
   * swap is the visible half of the same thing.
   *
   * IT IS TRUE WHEN THE ANSWER IN HAND IS ABOUT THE WINDOW BEING ASKED ABOUT,
   * which is subtler than a latch and had to be: a plain write-once flag gets
   * set during the FIRST render, when `phase` is still null, `enteredAtIso` is
   * therefore the empty string, the read effect bails - and the flag is then
   * stuck true for the whole session, releasing the slot on exactly the frame
   * it exists to withhold. Caught by 7d's own screen test, which is what that
   * test is for.
   *
   * SO IT IS KEYED TO (uid, enteredAtIso), the pair that decides WHICH read
   * runs. It flips true on that read resolving, on it FAILING (a failed read
   * must not withhold the slot forever - the user keeps a Today that simply
   * does not raise the question this time), and immediately when the effect
   * bails because there is no uid or no entry date, since a window with nothing
   * to read SINCE has already answered.
   *
   * IT DOES NOT RESET ON A RE-READ. `revisionToken` and `todayIso` re-run the
   * effect without changing the key, so a write to the journey document does
   * not blank Today's slot. It DOES go false when the phase entry date changes,
   * because that is a different question and the old answer is not about it.
   */
  settled: boolean;
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
  // SETTLED, not pending. With no phase there is no weekly question to ask, so
  // there is nothing for Home to wait on. `journeyActionFor` returns null on a
  // null phaseKey anyway; false here would be a second reason for the same
  // answer and would leave the slot gated on a read that is never going to run.
  settled: true,
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

  // WHICH read has answered, not WHETHER one has. See `AdjustOffer.settled`:
  // a plain boolean latches true on the first render, when there is no phase
  // yet and the effect bails, and never withholds anything again.
  const readKey = `${uid ?? ''}|${enteredAtIso}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const settled = settledKey === readKey;

  useEffect(() => {
    // A phase with no resolved entry date has nothing to read SINCE. Bailing
    // leaves `cycles` empty, which reads as "not due" rather than as a window
    // stretching back to the epoch. IT IS ALSO A SETTLED ANSWER: there is no
    // read coming, so Home must not hold the slot open waiting for one.
    if (!uid || !enteredAtIso) {
      setSettledKey(readKey);
      return;
    }
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
      })
      .then(() => {
        // BOTH OUTCOMES SETTLE, and the failure case is the one that matters:
        // a read that rejected has answered the question as far as the slot is
        // concerned, and leaving this false would withhold the journey-action
        // card from a user whose network dropped once. A second `.then` rather
        // than `.finally` so nothing depends on the es2018 lib target.
        if (active) setSettledKey(readKey);
      });
    return () => {
      active = false;
    };
    // `readKey` is derived from uid and enteredAtIso, both already here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    settled,
    // ZERO DECLINES IS THE FIRST OFFER, ONE IS THE SECOND. Read off the count
    // rather than off a stored ordinal, so there is nothing to keep in step.
    isSecondOffer: declines >= 1,
    decline,
  };
}

export interface UseAdjustDoorStampInput {
  uid: string | undefined;
  /**
   * `journeyActionFor`'s answer for THIS render: what is occupying Today's one
   * journey-action slot.
   *
   * THE SAME CORRECTION 7d MAKES ON THE ADVANCE SIDE, and it matters more here
   * than a miscounted budget does. The gate used to read `placement === 'today'`,
   * which is ELIGIBILITY. Capture beats adjust (journeyAction.ts), so a user in
   * `remove` who has not made the capture and whose two most recent reads both
   * say not_moving had `adjustOfferedAt` stamped while the CAPTURE card held the
   * slot, and C2 never drew.
   *
   * `adjustOfferedAt` IS THE PHASE PAGE'S QUALIFICATION KEY. JourneyPhaseScreen
   * says of it, exactly: non-null "if and only if the adjustment offer has
   * occupied Today at least once in this phase". Stamped on eligibility that
   * biconditional was false in one direction, and "Try a different approach"
   * appeared on the phase page for a user who had never been asked anything.
   * The door opens because the card drew, or it does not open.
   */
  action: JourneyAction;
  /**
   * `journeyStates.adjustOfferedAt` is already set for this phase.
   *
   * Carried on `PhaseContext` as a boolean rather than re-read, and it is what
   * makes the write once-per-phase rather than once-per-focus.
   */
  alreadyOffered: boolean;
}

/**
 * The one write the adjustment offer owns: `recordAdjustOffered`, the write
 * that opens the phase page's door (slice 7b, re-gated in 7d).
 *
 * A SEPARATE HOOK FROM `useAdjustOffer` for the reason the file header gives:
 * `journeyActionFor` consumes this offer's placement, so its answer can only be
 * consumed below it.
 *
 * ONCE PER PHASE, AND THE GATE IS WHAT BOUNDS IT. `adjustOfferedAt` has to be
 * stamped the first time the card actually draws and never needs stamping
 * again.
 *
 * THE GATE IS READ BEFORE THE WRITE AND OFF STATE THIS RENDER ALREADY HELD,
 * which is the same ordering `shouldRecordExposure` makes load bearing on the
 * advance side. The write bumps `updatedAt`, which feeds `revisionToken`, and
 * Home re-resolves on every focus; the re-resolve carries `adjustOffered` true
 * and this effect returns early on the next pass. Without the gate it would
 * write on every focus for as long as the card was up, and each write would
 * trigger another resolve.
 */
export function useAdjustDoorStamp(input: UseAdjustDoorStampInput): void {
  const { uid, action, alreadyOffered } = input;

  useEffect(() => {
    if (!uid || action !== 'adjust' || alreadyOffered) return;
    void recordAdjustOffered(uid)
      .then(() => {
        logEvent(uid, 'journey_adjust_offered', { definition_version: 2 });
      })
      .catch((error) => {
        // A failed write costs the door, not the card: the offer is on screen
        // and stays there, and the next render retries because the gate still
        // reads false. Logged rather than surfaced, because nothing about the
        // user's day has gone wrong.
        logger.error('[useAdjustDoorStamp] offered write failed:', error);
      });
  }, [uid, action, alreadyOffered]);
}
