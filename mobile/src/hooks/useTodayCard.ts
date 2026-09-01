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
import { AppState } from 'react-native';

import {
  applyQuickWin,
  selectProtocol,
  DEFAULT_TIME_CLASS,
  type CapacityTier,
  type ResolvedProtocolVariant,
  type TimeClass,
} from '../protocolEngine';
import { countWeeklyCyclesForOutcome } from '../services/firebase/weeklyCycle.service';
import {
  getDailyLog,
  hasPickedToday,
  upsertDailyLog,
} from '../services/firebase/dailyLog.service';
import { getFloorCommitment } from '../services/firebase/userPrivate.service';
import { loadWeeklyContinuity } from '../screens/weekly/weeklyContinuity';
import type { WeeklyCycle } from '../types/models';
import { legacyOutcomeFor, type PhaseContext } from '../journey/resolveJourney';
import { addDaysIso, toIsoDate } from '../utils/weekStart';
import { logger } from '../utils/logger';

export interface TodayCard {
  protocol: ResolvedProtocolVariant | null;
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

  /**
   * Has the user answered today's picker? Read through `hasPickedToday`, which
   * is the ONE definition; nothing here re-derives it.
   *
   * The pre-pick hero is gated on this, so it decides whether Home shows the
   * day's action or the prompt that opens the sheet.
   */
  picked: boolean;
  /** What the sheet opens with. Yesterday's answers, else the week's seed. */
  prefillCapacity: CapacityTier;
  prefillTime: TimeClass;
  /** Write today's answer. The ONLY thing in this flow that writes. */
  confirmPick: (capacity: CapacityTier, time: TimeClass) => Promise<void>;
  /** The confirm write is in flight. */
  pickSaving: boolean;
  /** The confirm write failed; the day is still unpicked. */
  pickFailed: boolean;
}

const EMPTY: Omit<TodayCard, 'markDone' | 'confirmPick'> = {
  protocol: null,
  floorCommitment: null,
  completed: false,
  loading: false,
  failed: false,
  saving: false,
  saveFailed: false,
  continuity: null,
  picked: false,
  prefillCapacity: 'normal',
  prefillTime: DEFAULT_TIME_CLASS,
  pickSaving: false,
  pickFailed: false,
};

/**
 * The reload callback the retired in-week re-set used to delegate upwards is
 * GONE, not defaulted: the only caller that needed it was `changeTier`, and a
 * parameter nothing reads is a hook that looks like it can refresh itself when
 * it cannot. Home still owns the cycle through useWeeklyLanding.
 */
/**
 * What the day is sourced from.
 *
 * DISCRIMINATED ON `kind`, not on which fields happen to be present. The two
 * carry overlapping information and a structural check between them would be
 * one added field away from silently picking the wrong branch.
 */
export type TodaySource =
  | { kind: 'cycle'; cycle: WeeklyCycle }
  | { kind: 'phase'; phase: PhaseContext };

/** The weekly-cycle source, or null when there is no week. */
export function cycleSource(cycle: WeeklyCycle | null): TodaySource | null {
  return cycle ? { kind: 'cycle', cycle } : null;
}

/** The journey source, or null when there is no phase. */
export function phaseSource(phase: PhaseContext | null): TodaySource | null {
  return phase ? { kind: 'phase', phase } : null;
}

export function useTodayCard(
  uid: string | undefined,
  source: TodaySource | null
): TodayCard {
  const [protocol, setProtocol] = useState<ResolvedProtocolVariant | null>(null);
  const [floorCommitment, setFloorCommitment] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [continuity, setContinuity] = useState<number | null>(null);
  const [picked, setPicked] = useState(false);
  const [prefillCapacity, setPrefillCapacity] = useState<CapacityTier>('normal');
  const [prefillTime, setPrefillTime] = useState<TimeClass>(DEFAULT_TIME_CLASS);
  const [pickSaving, setPickSaving] = useState(false);
  const [pickFailed, setPickFailed] = useState(false);
  // Bumped by a successful confirm to re-run the load below. The protocol and
  // the conditional floor read both derive from the stored capacity, so a local
  // patch would leave one of them wrong; re-reading is what keeps them together.
  const [reloadToken, setReloadToken] = useState(0);

  const activeRef = useRef(true);

  /**
   * TODAY, AS STATE, so the day can roll over under a running app.
   *
   * This used to be `toIsoDate(new Date())` read inside the effect below, whose
   * dependencies contain nothing date-derived. An app left open past midnight
   * therefore kept reading yesterday's row: a day completed on Monday still
   * reported done on Tuesday, and under the daily picker the morning prompt
   * would never return. Making the date a dependency is the fix; the two
   * effects under it are what keep the dependency current.
   */
  const [todayIso, setTodayIso] = useState(() => toIsoDate(new Date()));

  // Re-sync, and re-render, only when the calendar date has ACTUALLY moved. The
  // functional updater returning `prev` unchanged is what makes this safe to
  // call on every render: React bails out of an identical state, so there is no
  // loop and no refetch on an ordinary re-render.
  const syncToday = useCallback(() => {
    setTodayIso((prev) => {
      const current = toIsoDate(new Date());
      return prev === current ? prev : current;
    });
  }, []);

  // TWO TRIGGERS, AND NEITHER COVERS THE OTHER.
  //
  // The listener is the real overnight path: the app is backgrounded on Monday
  // night and foregrounded on Tuesday with no navigation and no re-render in
  // between, so nothing else would notice. AppState is already the house
  // mechanism for this (AuthContext, NotificationContext, useTimer).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncToday();
    });
    return () => subscription.remove();
  }, [syncToday]);

  // The render sync catches the other path: Home refocusing. The landing hook's
  // refresh re-renders with a fresh cycle object whose primitives are identical,
  // so the load effect would not re-arm on its own. Deliberately has no
  // dependency array; the equality guard above is what makes that cheap.
  useEffect(syncToday);

  // The cycle id is the dependency, not the cycle object: the object identity
  // changes on every resolve of the landing hook, and depending on it would
  // refetch the protocol on every Home focus. `capacityInitial` is included
  // because it is the seed the day falls back to; `capacityCurrent` is NOT,
  // because nothing reads it any more.
  //
  // BOTH SOURCES REDUCE TO THE SAME THREE PRIMITIVES plus a reload key, and
  // every line downstream reads only those. That is the whole shape of this
  // slice: the branch is four lines wide and nothing below it knows which side
  // it came from.
  //
  // `sourceKey` replaces `cycle.id` as the identity dependency. The journey has
  // no natural key that changes when the state changes - its document ID is the
  // uid and is constant across a phase advance - so the journey side keys on
  // `revisionToken` (updatedAt millis) instead. Prefixed so the two key spaces
  // cannot collide.
  const sourceKey =
    source === null
      ? undefined
      : source.kind === 'cycle'
        ? `cycle:${source.cycle.id}`
        : `phase:${source.phase.revisionToken}:${source.phase.phaseKey}`;

  // TEMPORARY SHIM - REMOVED IN SLICE 3. The journey speaks DestinationKey and
  // both selectProtocol and countWeeklyCyclesForOutcome are keyed on
  // OutcomeKey, so the phase side maps through legacyOutcomeFor to reach them.
  // Slice 3 rekeys the matrix on DestinationKey and this branch collapses to
  // `source.phase.destination`.
  const outcome =
    source === null
      ? undefined
      : source.kind === 'cycle'
        ? source.cycle.outcome
        : legacyOutcomeFor(source.phase.destination);

  // TEMPORARY SHIM - REMOVED IN SLICE 3. The phase's own seed is itself read
  // off the latest cycle's capacityInitial by the resolver, so both sides are
  // sourced from the same place today; slice 4 re-homes it onto the journey.
  const capacitySeed =
    source === null
      ? undefined
      : source.kind === 'cycle'
        ? source.cycle.capacityInitial
        : source.phase.capacitySeed;
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
  //
  // THE JOURNEY SIDE HAS NO CLOSE, so it contributes `false` rather than
  // borrowing the cycle's. A journey user's week-number count refreshes on
  // `revisionToken` instead, which moves whenever the phase does. This is the
  // one of the four reads with no journey equivalent, and inventing one would
  // have meant reaching back into a cycle the day no longer depends on.
  const isClosed =
    source !== null && source.kind === 'cycle' && !!source.cycle.closeCompletedAt;

  useEffect(() => {
    activeRef.current = true;

    if (!uid || !sourceKey || !outcome || !capacitySeed) {
      setProtocol(null);
      setFloorCommitment(null);
      setCompleted(false);
      setContinuity(null);
      setPicked(false);
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
        const log = await getDailyLog(uid, todayIso);

        // Absent means NOT PICKED, so the day falls back to the week's forecast.
        // Nothing is written back: an inferred tier is not an answer.
        const todaysCapacity = log?.dailyCapacity ?? capacitySeed;
        const todaysTime = log?.dailyTimeBudget ?? DEFAULT_TIME_CLASS;
        const answered = hasPickedToday(log);

        // THE PICKED TIME IS PASSED HONESTLY, and it currently changes nothing.
        // Every matrix cell holds one variant until the off-diagonal content is
        // authored, so selectProtocol resolves to the same protocol whatever
        // class it is handed and the result is capacity-driven. It is passed
        // rather than withheld so that the day the content lands, this line
        // already does the right thing.
        const resolved = applyQuickWin(
          selectProtocol(outcome, todaysCapacity, todaysTime),
          weekNumber
        );

        // Yesterday's answers, for the sheet to open with. Read ONLY when the
        // day is unpicked, matching the conditional floor read below: a picked
        // day has no sheet to fill. This is a read and stays a read; writing a
        // pre-fill would set the time field and mark the day answered before
        // the user answered it.
        const prior = answered
          ? null
          : await getDailyLog(uid, addDaysIso(todayIso, -1));

        // Read the floor only when it will be shown, and off the DAY's tier.
        const floor =
          todaysCapacity === 'slammed' ? await getFloorCommitment(uid) : null;

        if (!activeRef.current) return;
        setProtocol(resolved);
        setFloorCommitment(floor);
        setCompleted(log?.protocolCompleted === true);
        setPicked(answered);
        setPrefillCapacity(prior?.dailyCapacity ?? capacitySeed);
        setPrefillTime(prior?.dailyTimeBudget ?? DEFAULT_TIME_CLASS);
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
  }, [uid, sourceKey, outcome, capacitySeed, isClosed, todayIso, reloadToken]);

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
        await upsertDailyLog(uid, todayIso, {
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
  }, [uid, todayIso, completed, saving]);

  /**
   * Write today's answer. THE ONLY WRITE IN THE PICKER FLOW.
   *
   * Opening the sheet, seeing the pre-fill and tapping between options all stay
   * local to the sheet; nothing reaches Firestore until this runs. That is what
   * keeps `hasPickedToday` honest, since it keys on the time field and would
   * otherwise report a day as answered because it was merely looked at.
   *
   * Writes the two inputs and nothing else. `protocolCompleted` is deliberately
   * absent rather than false: completion is a separate answer on the same row,
   * and sending false here would un-complete a finished day.
   *
   * Reloads rather than patching state, for the reason the retired re-set did:
   * the protocol re-derives from the stored capacity and the conditional floor
   * read re-runs, so a local patch would leave the floor card wrong.
   */
  const confirmPick = useCallback(
    async (nextCapacity: CapacityTier, nextTime: TimeClass) => {
      if (!uid || pickSaving) return;
      setPickSaving(true);
      setPickFailed(false);
      try {
        await upsertDailyLog(uid, todayIso, {
          dailyCapacity: nextCapacity,
          dailyTimeBudget: nextTime,
        });
        if (!activeRef.current) return;
        setReloadToken((n) => n + 1);
      } catch (error) {
        logger.error('[useTodayCard] daily pick write failed:', error);
        if (!activeRef.current) return;
        // The day stays unpicked and the prompt stays on screen, which is the
        // truthful state: nothing was recorded.
        setPickFailed(true);
      } finally {
        if (activeRef.current) setPickSaving(false);
      }
    },
    [uid, todayIso, pickSaving]
  );

  if (!source) return { ...EMPTY, markDone, confirmPick };

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
    picked,
    prefillCapacity,
    prefillTime,
    confirmPick,
    pickSaving,
    pickFailed,
  };
}
