/**
 * useActiveFocusSession (Four-Pillar IA Phase B-3c.2).
 *
 * Owns the persisted active-session record across a focus block's lifecycle so
 * the focusSessions completion row can be finalized from persisted data on ANY
 * app return — whether the app was merely backgrounded (live timer reconciles)
 * or killed (no live timer survives):
 *
 *   - When a focus block enters the running state, mint a stable focusSessions
 *     id (once per block) and persist an active record carrying the endsAt
 *     timestamp. Resuming re-saves the same id with the new endsAt.
 *   - Pausing drops the persisted record (a paused-then-killed block must not be
 *     finalized) while keeping the id so resume re-persists the same block.
 *   - On mount the hook sweeps for a persisted record whose endsAt already
 *     passed — a block that elapsed while backgrounded or killed — and writes
 *     its completion row (Option A: an elapsed block counts as complete).
 *   - finalizeCompletedBlock() writes the row for the just-completed block from
 *     the live timer (warm path / foreground reconcile) under the same stable
 *     id; getLastFocusSessionId() exposes it so the inline reflection can bind.
 *
 * Breaks are NOT persisted (focus blocks only). All writes are idempotent via
 * the stable id (setDoc merge), so the warm, reconcile, and startup paths can
 * never produce a duplicate row.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { TimerState } from './useTimer';
import {
  clearActiveFocusSession,
  finalizeFocusSession,
  getActiveFocusSession,
  isFocusSessionElapsed,
  mintFocusSessionId,
  saveActiveFocusSession,
  type ActiveFocusSession,
  type FocusSessionType,
} from '../services/firebase/focusSession.service';
import { logger } from '../utils/logger';

interface UseActiveFocusSessionParams {
  userId: string | null;
  timerState: TimerState;
  endsAt: number | null;
  durationMinutes: number;
  taskLabel: string | null;
}

interface UseActiveFocusSessionReturn {
  /**
   * Write the completion row for the just-completed block (call from the
   * timer's onSessionComplete). Returns the stable focusSessions id written, or
   * null when there is no user.
   */
  finalizeCompletedBlock: () => Promise<string | null>;
  /** Drop the active block + record (call from reset / done-for-now). */
  clearActiveBlock: () => void;
  /** Most recently finalized focusSessions id, for inline-reflection binding. */
  getLastFocusSessionId: () => string | null;
}

function focusType(durationMinutes: number): FocusSessionType {
  return durationMinutes === 90 ? 'ultradian' : 'pomodoro';
}

export function useActiveFocusSession({
  userId,
  timerState,
  endsAt,
  durationMinutes,
  taskLabel,
}: UseActiveFocusSessionParams): UseActiveFocusSessionReturn {
  // The current block's stable id (minted at start) and wall-clock start.
  const activeIdRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef<number>(0);
  // Most recently finalized id, for the inline reflection write.
  const lastIdRef = useRef<string | null>(null);

  // Latest values so finalizeCompletedBlock (a stable callback) is never stale.
  const userIdRef = useRef(userId);
  const durationRef = useRef(durationMinutes);
  const taskRef = useRef(taskLabel);
  useEffect(() => {
    userIdRef.current = userId;
    durationRef.current = durationMinutes;
    taskRef.current = taskLabel;
  });

  // Persist while a focus block runs; drop the record while paused.
  useEffect(() => {
    if (timerState === 'running') {
      if (!userId) return;
      if (!activeIdRef.current) {
        activeIdRef.current = mintFocusSessionId();
        activeStartedAtRef.current = Date.now();
      }
      if (endsAt != null) {
        const record: ActiveFocusSession = {
          focusSessionId: activeIdRef.current,
          userId,
          durationMinutes,
          type: focusType(durationMinutes),
          taskLabel,
          startedAt: activeStartedAtRef.current,
          endsAt,
        };
        saveActiveFocusSession(record).catch((error) =>
          logger.warn('[useActiveFocusSession] persist failed', error)
        );
      }
    } else if (timerState === 'paused') {
      // Kill-while-paused must not finalize: drop the record, keep the id so
      // resume re-persists the same block.
      clearActiveFocusSession().catch(() => {});
    }
  }, [timerState, endsAt, userId, durationMinutes, taskLabel]);

  // App-return sweep: a persisted record whose endsAt already passed is a block
  // that elapsed while backgrounded or killed → write its completion row.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const rec = await getActiveFocusSession();
      if (!active || !rec || rec.userId !== userId) return;
      // Killed mid-block (endsAt still in the future) → leave the record to be
      // superseded by the next start; do not fabricate a completion.
      if (!isFocusSessionElapsed(rec, Date.now())) return;
      try {
        await finalizeFocusSession({
          focusSessionId: rec.focusSessionId,
          userId: rec.userId,
          durationMinutes: rec.durationMinutes,
          type: rec.type,
          taskLabel: rec.taskLabel,
        });
        lastIdRef.current = rec.focusSessionId;
      } catch (error) {
        logger.error('[useActiveFocusSession] finalize-on-return failed', error);
      }
      // Only clear if no new block has started since (avoids nuking a record a
      // fresh start just wrote).
      if (activeIdRef.current === null) {
        await clearActiveFocusSession();
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const finalizeCompletedBlock = useCallback(async (): Promise<string | null> => {
    const uid = userIdRef.current;
    if (!uid) {
      activeIdRef.current = null;
      await clearActiveFocusSession();
      return null;
    }
    // The block always had a running-persist that minted the id; fall back to a
    // fresh id only defensively so a completed block always writes a row.
    const id = activeIdRef.current ?? mintFocusSessionId();
    try {
      await finalizeFocusSession({
        focusSessionId: id,
        userId: uid,
        durationMinutes: durationRef.current,
        type: focusType(durationRef.current),
        taskLabel: taskRef.current,
      });
      lastIdRef.current = id;
    } catch (error) {
      logger.error('[useActiveFocusSession] finalize failed', error);
    }
    activeIdRef.current = null;
    await clearActiveFocusSession();
    return id;
  }, []);

  const clearActiveBlock = useCallback(() => {
    activeIdRef.current = null;
    clearActiveFocusSession().catch(() => {});
  }, []);

  const getLastFocusSessionId = useCallback(() => lastIdRef.current, []);

  return { finalizeCompletedBlock, clearActiveBlock, getLastFocusSessionId };
}

export default useActiveFocusSession;
