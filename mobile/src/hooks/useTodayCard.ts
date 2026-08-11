/**
 * The day's action for Home, sourced from the user's current weekly cycle.
 *
 * THIS IS THE ONLY TODAY SURFACE. It began as a mirror of the standalone
 * WeeklyTodayScreen's read path; that screen was deleted once Home took the
 * surface over, and this is now the sole place the day's protocol is resolved:
 *
 *   week number  <- countWeeklyCyclesForOutcome (the single source; do not add
 *                   a second derivation, it would run against a different
 *                   database state and could disagree about the quick win)
 *   capacity     <- today's dailyLog, falling back to the cycle's capacityInitial
 *   protocol     <- applyQuickWin(selectProtocol(outcome, capacity, time), weekNo)
 *   floor        <- read ONLY when THAT capacity is 'slammed' (spec 9, 10.1)
 *
 * CAPACITY IS A DAILY READ (roadmap 3b-i). It used to be locked for the week on
 * the cycle, adjustable only through an in-week re-set control; that control is
 * retired and `capacityCurrent` is frozen. The day's own answer is the tier now,
 * and `capacityInitial` is the DAY-1 SEED it falls back to before anything has
 * been picked. Because `createWeeklyCycle` writes the two fields equal, that
 * fallback reproduces the previous weekly behavior exactly.
 *
 * The seed is READ-ONLY here: this hook never writes a capacity it merely
 * inferred. Only an answer the user actually gave is persisted, which is what
 * keeps "absent" meaning "not picked" rather than "picked the forecast". The
 * picker that writes it arrives in 3b-ii.
 *
 * COMPLETION IS KEYED TO THE DATE AND NOTHING ELSE. dailyLogs documents are
 * `${userId}_${date}`, and `protocolCompleted` is a plain boolean on that row
 * with no protocolId beside it. So changing capacity cannot clear a completed
 * day: completion does not record WHICH protocol was done, so there is nothing
 * for a different tier to invalidate. (`dailyCapacity` now sits on the same row,
 * but it is an input the day was run at, not a key completion is qualified by.)
 * That is a property of the schema, not behavior implemented here, and it is
 * why this hook re-reads the log by date rather than by cycle.
 *
 * ALSO HERE, ported from WeeklyTodayScreen so Home can serve the whole Today
 * surface: the continuity count (spec 1). It is SECONDARY to the day's action
 * and may never block it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  applyQuickWin,
  selectProtocol,
  DEFAULT_TIME_CLASS,
  type CapacityTier,
  type ResolvedWeeklyProtocol,
} from '../weeklyEngine';
import {
  countWeeklyCyclesForOutcome,
  getDailyLog,
  upsertDailyLog,
} from '../services/firebase/weeklyCycle.service';
import { getFloorCommitment } from '../services/firebase/userPrivate.service';
import { loadWeeklyContinuity } from '../screens/weekly/weeklyContinuity';
import type { WeeklyCycle } from '../types/models';
import { toIsoDate } from '../utils/weekStart';
import { logger } from '../utils/logger';

export interface TodayCard {
  protocol: ResolvedWeeklyProtocol | null;
  /** Only read, and only shown, when the DAY's capacity is 'slammed'. */
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
}

const EMPTY: Omit<TodayCard, 'markDone'> = {
  protocol: null,
  floorCommitment: null,
  completed: false,
  loading: false,
  failed: false,
  saving: false,
  saveFailed: false,
  continuity: null,
};

/**
 * The reload callback the retired in-week re-set used to delegate upwards is
 * GONE, not defaulted: the only caller that needed it was `changeTier`, and a
 * parameter nothing reads is a hook that looks like it can refresh itself when
 * it cannot. Home still owns the cycle through useWeeklyLanding.
 */
export function useTodayCard(
  uid: string | undefined,
  cycle: WeeklyCycle | null
): TodayCard {
  const [protocol, setProtocol] = useState<ResolvedWeeklyProtocol | null>(null);
  const [floorCommitment, setFloorCommitment] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [continuity, setContinuity] = useState<number | null>(null);
  // The tier today resolved to, seeded or picked. Held so the completion write
  // can record what the day was actually run at without re-deriving it.
  const [capacity, setCapacity] = useState<CapacityTier | null>(null);

  const activeRef = useRef(true);

  // The cycle id is the dependency, not the cycle object: the object identity
  // changes on every resolve of the landing hook, and depending on it would
  // refetch the protocol on every Home focus. `capacityInitial` is included
  // because it is the seed the day falls back to; `capacityCurrent` is NOT,
  // because nothing reads it any more.
  const cycleId = cycle?.id;
  const outcome = cycle?.outcome;
  const capacitySeed = cycle?.capacityInitial;
  // A BOOLEAN, never `closeCompletedAt` itself. The close writes floorMet,
  // which is the only input to continuity, and it changes none of the three
  // fields above — so without this the count below would never refresh after a
  // close now that Home, rather than a freshly mounted Today screen, is where
  // the close returns to.
  //
  // The Timestamp cannot be the dependency: Firestore rebuilds it as a new
  // object on every read, so depending on it would refetch on every focus
  // resolve and defeat the memoization the three lines above exist for. This
  // flips false -> true at most once per cycle, which is once per week.
  const isClosed = !!cycle?.closeCompletedAt;

  useEffect(() => {
    activeRef.current = true;

    if (!uid || !cycleId || !outcome || !capacitySeed) {
      setProtocol(null);
      setFloorCommitment(null);
      setCompleted(false);
      setContinuity(null);
      setCapacity(null);
      setLoading(false);
      return () => {
        activeRef.current = false;
      };
    }

    setLoading(true);
    setFailed(false);

    // Continuity (spec 1) rides the same effect as everything else, so any
    // reload picks up a close that happened in between. It is committed
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

        // Today's row, by date. Absent is the normal state each morning, and it
        // carries BOTH the day's completion and the day's capacity — one read
        // for both because they are one document.
        //
        // THIS READ NOW GATES THE DERIVATION, so it moved ahead of the protocol
        // and the floor rather than trailing them as it did when capacity was
        // a weekly fact already in hand.
        const log = await getDailyLog(uid, toIsoDate(new Date()));

        // Absent means NOT PICKED, so the day falls back to the week's forecast.
        // Nothing is written back: an inferred tier is not an answer.
        const todaysCapacity = log?.dailyCapacity ?? capacitySeed;

        // DEFAULT_TIME_CLASS until the picker stores a real answer (3b-ii-b).
        // Every cell currently holds exactly one variant, so the fallback in
        // selectProtocol resolves to it whatever class is asked: this renders
        // precisely what the pre-reshape lookup did.
        const resolved = applyQuickWin(
          selectProtocol(outcome, todaysCapacity, DEFAULT_TIME_CLASS),
          weekNumber
        );

        // Read the floor only when it will be shown, and off the DAY's tier.
        const floor =
          todaysCapacity === 'slammed' ? await getFloorCommitment(uid) : null;

        if (!activeRef.current) return;
        setProtocol(resolved);
        setCapacity(todaysCapacity);
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
  }, [uid, cycleId, outcome, capacitySeed, isClosed]);

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
          // The tier the day was actually run at, recorded on the same row as
          // the completion it qualifies. Omitted when the load never resolved
          // one, because `merge: true` treats an absent field as "leave alone"
          // and a guess is worse here than a gap.
          ...(capacity ? { dailyCapacity: capacity } : {}),
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
  }, [uid, completed, saving, capacity]);

  if (!cycle) return { ...EMPTY, markDone };

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
  };
}
