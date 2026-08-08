/**
 * The day's action for Home, sourced from the user's current weekly cycle.
 *
 * Mirrors the read path WeeklyTodayScreen performs (WeeklyTodayScreen.tsx:118-155)
 * because both surfaces must resolve the SAME protocol for the same week. The
 * derivation is deliberately identical:
 *
 *   week number  <- countWeeklyCyclesForOutcome (the single source; do not add
 *                   a second derivation, it would run against a different
 *                   database state and could disagree about the quick win)
 *   protocol     <- applyQuickWin(selectProtocol(outcome, capacityCurrent), weekNo)
 *   floor        <- read ONLY when capacityCurrent is 'slammed' (spec 9, 10.1)
 *
 * capacityCurrent, never capacityInitial: the current tier is what the user is
 * living in. capacityInitial is the weekly forecast and exists so the gap
 * between forecast and reality stays measurable; rendering from it would show
 * the user a protocol they are no longer on.
 *
 * COMPLETION IS KEYED TO THE DATE AND NOTHING ELSE. dailyLogs documents are
 * `${userId}_${date}` and the DailyLog type carries no capacity and no
 * protocolId (models.ts:323-334). So a mid-week capacity change cannot clear a
 * completed day: there is no field on the record for it to invalidate. That is
 * a property of the schema, not behavior implemented here, and it is why this
 * hook re-reads the log by date rather than by cycle.
 *
 * ALSO HERE, ported from WeeklyTodayScreen so Home can serve the whole Today
 * surface: the continuity count (spec 1) and the dynamic in-week capacity
 * re-set (spec 7). Both are SECONDARY to the day's action, and neither may
 * block it. See changeTier for why the re-set delegates its reload upwards.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  applyQuickWin,
  selectProtocol,
  type CapacityTier,
  type ResolvedWeeklyProtocol,
} from '../weeklyEngine';
import {
  countWeeklyCyclesForOutcome,
  getDailyLog,
  resetWeeklyCapacity,
  upsertDailyLog,
} from '../services/firebase/weeklyCycle.service';
import { getFloorCommitment } from '../services/firebase/userPrivate.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import { loadWeeklyContinuity } from '../screens/weekly/weeklyContinuity';
import { toFailureReason } from '../types/analyticsEvents';
import type { WeeklyCycle } from '../types/models';
import { toIsoDate } from '../utils/weekStart';
import { logger } from '../utils/logger';

export interface TodayCard {
  protocol: ResolvedWeeklyProtocol | null;
  /** Only read, and only shown, when capacityCurrent is 'slammed'. */
  floorCommitment: string | null;
  /** True once today's log records the action as done. */
  completed: boolean;
  loading: boolean;
  /** The load failed. Home renders nothing rather than a wrong action. */
  failed: boolean;
  /** Write today's completion. Optimistic, reverts on failure. */
  markDone: () => void;
  /** True while the completion write is in flight. */
  saving: boolean;
  /** The completion write failed; the card shows it and stays tappable. */
  saveFailed: boolean;
  /**
   * Unbroken weeks (spec 1). null when the read failed, which is NOT the same
   * as 0: zero is a claim about the user, an unreadable history is not. The
   * render silences both, and has to be able to tell them apart anyway.
   */
  continuity: number | null;
  /** Move to an adjacent capacity tier (spec 7). One tap, no confirmation. */
  changeTier: (from: CapacityTier, to: CapacityTier) => Promise<void>;
  /** True between the re-set tap and the reload. Guards a double write. */
  resetting: boolean;
  /** The re-set failed. The week on screen is untouched and still valid. */
  resetFailed: boolean;
}

const EMPTY: Omit<TodayCard, 'markDone' | 'changeTier'> = {
  protocol: null,
  floorCommitment: null,
  completed: false,
  loading: false,
  failed: false,
  saving: false,
  saveFailed: false,
  continuity: null,
  resetting: false,
  resetFailed: false,
};

export function useTodayCard(
  uid: string | undefined,
  cycle: WeeklyCycle | null,
  /**
   * Re-read the cycle. Home owns it through useWeeklyLanding, so the re-set
   * cannot reload it from in here; see changeTier.
   */
  reload: () => void
): TodayCard {
  const [protocol, setProtocol] = useState<ResolvedWeeklyProtocol | null>(null);
  const [floorCommitment, setFloorCommitment] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [continuity, setContinuity] = useState<number | null>(null);
  // A failed re-set is NOT a failed week: the cycle on screen is still valid,
  // so this is its own inline error rather than `failed`, which blanks the
  // day's action. `resetting` guards the window between the tap and the
  // reload, where a second tap would write a transition from a tier the user
  // is no longer on.
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);

  const activeRef = useRef(true);

  // The cycle id is the dependency, not the cycle object: the object identity
  // changes on every resolve of the landing hook, and depending on it would
  // refetch the protocol on every Home focus. capacityCurrent is included
  // because the in-week re-set changes which protocol is in force.
  const cycleId = cycle?.id;
  const outcome = cycle?.outcome;
  const capacityCurrent = cycle?.capacityCurrent;

  useEffect(() => {
    activeRef.current = true;

    if (!uid || !cycleId || !outcome || !capacityCurrent) {
      setProtocol(null);
      setFloorCommitment(null);
      setCompleted(false);
      setContinuity(null);
      setLoading(false);
      return () => {
        activeRef.current = false;
      };
    }

    setLoading(true);
    setFailed(false);

    // Continuity (spec 1) rides the same effect as everything else, so a
    // re-set reload picks up a close that happened in between. It is committed
    // SEPARATELY rather than folded into the commit below, which is the one
    // deliberate departure from WeeklyTodayScreen.tsx:166-173: there the read
    // gates the whole screen, but on Home the hero and its completion CTA
    // already render as soon as their own reads land, and making the primary
    // action wait on a count below the fold would be a regression to Home
    // rather than a port onto it.
    //
    // Not pre-cleared, so a reload leaves the previous count on screen until
    // the new one lands instead of blinking through nothing.
    loadWeeklyContinuity(uid)
      .then((run) => {
        if (activeRef.current) setContinuity(run);
      })
      .catch((error) => {
        // Best effort, and it cannot take Home down with it. null rather than
        // 0: showing a zero here would state something about the user that was
        // never read.
        logger.error('[useTodayCard] continuity read failed:', error);
        if (activeRef.current) setContinuity(null);
      });

    (async () => {
      try {
        const weekNumber = await countWeeklyCyclesForOutcome(uid, outcome);
        const resolved = applyQuickWin(
          selectProtocol(outcome, capacityCurrent),
          weekNumber
        );

        // Read the floor only when it will be shown.
        const floor =
          capacityCurrent === 'slammed' ? await getFloorCommitment(uid) : null;

        // Today's completion, by date. Absent is the normal state each morning.
        const log = await getDailyLog(uid, toIsoDate(new Date()));

        if (!activeRef.current) return;
        setProtocol(resolved);
        setFloorCommitment(floor);
        setCompleted(log?.protocolCompleted === true);
        setLoading(false);
      } catch (error) {
        logger.error('[useTodayCard] load failed:', error);
        if (!activeRef.current) return;
        setProtocol(null);
        setFailed(true);
        setLoading(false);
      }
    })();

    return () => {
      activeRef.current = false;
    };
  }, [uid, cycleId, outcome, capacityCurrent]);

  /**
   * Mark today done. One direction only: there is no un-complete.
   *
   * Completion is binary and forward-only by spec (S9.2 permits done or not
   * yet, never a grade), and a day the user actually did is not something the
   * app should offer to retract. The date key means a second tap on the same
   * day is a harmless idempotent re-write rather than a duplicate.
   *
   * Optimistic: the check lands immediately and reverts only if the write
   * fails, because the user did the thing and the UI should not make them wait
   * on a round trip to see it acknowledged.
   */
  const markDone = useCallback(() => {
    if (!uid || completed || saving) return;

    setSaving(true);
    setSaveFailed(false);
    setCompleted(true);

    (async () => {
      try {
        await upsertDailyLog(uid, toIsoDate(new Date()), {
          protocolCompleted: true,
          // The day's action is the protocol itself, not a catalog practice
          // run, so nothing goes here. Practices logged from the player are a
          // separate write.
          practiceIds: [],
        });
        if (!activeRef.current) return;
        setSaving(false);
      } catch (error) {
        logger.error('[useTodayCard] completion write failed:', error);
        if (!activeRef.current) return;
        // Revert: a check that survives a failed write tells the user the day
        // is recorded when it is not, and they would find it unchecked tomorrow.
        setCompleted(false);
        setSaveFailed(true);
        setSaving(false);
      }
    })();
  }, [uid, completed, saving]);

  /**
   * Move to an adjacent capacity tier (spec 7). One tap, no confirmation.
   *
   * `from` is the tier currently on screen, passed through so the failure event
   * records the transition the user actually saw and tapped rather than
   * whatever a re-read might return.
   *
   * ON SUCCESS THIS RELOADS RATHER THAN PATCHING STATE, and it delegates that
   * reload upwards because Home's cycle belongs to useWeeklyLanding. The reload
   * is load-bearing twice over: the protocol re-derives from the stored
   * capacityCurrent, and the conditional floor read above re-runs, so the floor
   * card appears on the way into slammed and goes away on the way out. A local
   * patch would skip that fetch and leave the card wrong.
   *
   * On failure nothing moves. The batch is atomic, so a rejection means neither
   * write landed and the displayed tier is still the true one.
   */
  const changeTier = useCallback(
    async (from: CapacityTier, to: CapacityTier) => {
      if (!uid || !cycle || resetting) return;
      setResetting(true);
      setResetFailed(false);
      try {
        await resetWeeklyCapacity(uid, cycle.id, from, to);

        // NO SUCCESS EVENT HERE, and that is deliberate. The batch above
        // already writes a downshiftEvents row carrying this same from/to
        // pair, in the same atomic commit as the tier change. A second copy in
        // analyticsEvents would not be atomic with the write it describes, and
        // two logs of one fact can disagree. Read the event log for re-set
        // frequency; it is the source of truth.
        reload();
      } catch (error) {
        logger.error('[useTodayCard] capacity re-set failed:', error);

        // The FAILURE is worth an event precisely because nothing else records
        // it. The batch is atomic, so a rejection means no downshiftEvents row
        // was written either, and logger.error is __DEV__-gated — on device
        // this currently vanishes.
        //
        // toFailureReason, never error.code or error.message: a raw code is an
        // open string, and short ones clear the writer's length backstop and
        // land in the log verbatim.
        try {
          logEvent(uid, 'reset_failed', {
            fromCapacity: from,
            toCapacity: to,
            reason: toFailureReason(error),
          });
        } catch {
          // Never the user's problem.
        }

        setResetFailed(true);
      } finally {
        setResetting(false);
      }
    },
    [uid, cycle, resetting, reload]
  );

  if (!cycle) return { ...EMPTY, markDone, changeTier };

  return {
    protocol,
    floorCommitment,
    completed,
    loading,
    failed,
    markDone,
    saving,
    saveFailed,
    continuity,
    changeTier,
    resetting,
    resetFailed,
  };
}
