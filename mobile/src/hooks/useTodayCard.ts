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
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  applyQuickWin,
  selectProtocol,
  type ResolvedWeeklyProtocol,
} from '../weeklyEngine';
import {
  countWeeklyCyclesForOutcome,
  getDailyLog,
  upsertDailyLog,
} from '../services/firebase/weeklyCycle.service';
import { getFloorCommitment } from '../services/firebase/userPrivate.service';
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
}

const EMPTY: Omit<TodayCard, 'markDone'> = {
  protocol: null,
  floorCommitment: null,
  completed: false,
  loading: false,
  failed: false,
  saving: false,
  saveFailed: false,
};

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
      setLoading(false);
      return () => {
        activeRef.current = false;
      };
    }

    setLoading(true);
    setFailed(false);

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
  };
}
