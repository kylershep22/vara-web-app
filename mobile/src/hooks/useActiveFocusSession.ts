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
import {
  scheduleFocusCompletionNotification,
  cancelScheduledNotification,
} from '../services/notifications.service';
import { logger } from '../utils/logger';

interface UseActiveFocusSessionParams {
  userId: string | null;
  timerState: TimerState;
  endsAt: number | null;
  durationMinutes: number;
  /**
   * Cold-launch deep link: the focusSessions id this surface was opened to
   * reflect on. Seeds the last-finalized id so the inline reflection chip binds
   * to that block's doc (the row was already finalized by the launch handler).
   */
  initialCompletedSessionId?: string | null;
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
  initialCompletedSessionId = null,
}: UseActiveFocusSessionParams): UseActiveFocusSessionReturn {
  // The current block's stable id (minted at start) and wall-clock start.
  const activeIdRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef<number>(0);
  // Most recently finalized id, for the inline reflection write. Seeded from a
  // cold-launch deep link so the reflection binds without a live completion.
  const lastIdRef = useRef<string | null>(initialCompletedSessionId);
  // Scheduled completion-notification id, so it can be cancelled.
  const notifIdRef = useRef<string | null>(null);

  // Cancel the pending completion notification (if any). Called when the block
  // pauses / resets / completes in the FOREGROUND (the foreground handler would
  // otherwise route it to a stray toast) / is abandoned on unmount.
  const cancelNotif = useCallback(() => {
    const nid = notifIdRef.current;
    notifIdRef.current = null;
    if (nid) cancelScheduledNotification(nid).catch(() => {});
  }, []);

  // Latest values so finalizeCompletedBlock (a stable callback) is never stale.
  const userIdRef = useRef(userId);
  const durationRef = useRef(durationMinutes);
  useEffect(() => {
    userIdRef.current = userId;
    durationRef.current = durationMinutes;
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
        const id = activeIdRef.current;
        const record: ActiveFocusSession = {
          focusSessionId: id,
          userId,
          durationMinutes,
          type: focusType(durationMinutes),
          startedAt: activeStartedAtRef.current,
          endsAt,
        };
        saveActiveFocusSession(record).catch((error) =>
          logger.warn('[useActiveFocusSession] persist failed', error)
        );
        // (Re)schedule the OS-owned completion notification for endsAt. Cancel
        // any previous one first so a resume (new endsAt) does not leave a
        // stale notification behind.
        cancelNotif();
        scheduleFocusCompletionNotification(id, endsAt)
          .then((nid) => {
            notifIdRef.current = nid;
          })
          .catch((error) =>
            logger.warn('[useActiveFocusSession] schedule notif failed', error)
          );
      }
    } else if (timerState === 'paused') {
      // Kill-while-paused must not finalize: drop the record, keep the id so
      // resume re-persists the same block. Cancel the pending notification too.
      clearActiveFocusSession().catch(() => {});
      cancelNotif();
    }
  }, [timerState, endsAt, userId, durationMinutes, cancelNotif]);

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

  // Abandon a running block on unmount (navigating away from the timer). Screen
  // sleep / backgrounding do NOT unmount React components, so this fires only on
  // a deliberate departure: cancel the notification and drop the record so it is
  // never finalized later as a fabricated completion.
  useEffect(() => {
    return () => {
      cancelNotif();
      clearActiveFocusSession().catch(() => {});
    };
  }, [cancelNotif]);

  const finalizeCompletedBlock = useCallback(async (): Promise<string | null> => {
    // Foreground completion: cancel the OS notification so it cannot surface as
    // a stray toast right after the in-app completion.
    cancelNotif();
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
      });
      lastIdRef.current = id;
    } catch (error) {
      logger.error('[useActiveFocusSession] finalize failed', error);
    }
    activeIdRef.current = null;
    await clearActiveFocusSession();
    return id;
  }, [cancelNotif]);

  const clearActiveBlock = useCallback(() => {
    activeIdRef.current = null;
    clearActiveFocusSession().catch(() => {});
    cancelNotif();
  }, [cancelNotif]);

  const getLastFocusSessionId = useCallback(() => lastIdRef.current, []);

  return { finalizeCompletedBlock, clearActiveBlock, getLastFocusSessionId };
}

export default useActiveFocusSession;
