/**
 * Focus-session persistence (Four-Pillar IA Phase B-3c.2).
 *
 * A focus block's completion row in `focusSessions` is written only when the
 * block finishes. iOS suspends the JS timer while backgrounded and may kill the
 * app outright, so completion can no longer rely on a live in-memory timer. This
 * module makes a focus block FINALIZABLE FROM PERSISTED DATA on any app return:
 *
 *   - At block START the caller mints a STABLE focusSessions id (without writing)
 *     and persists an active-session record (AsyncStorage) carrying everything
 *     needed to write the completion row later: the id, duration, label, and the
 *     `endsAt` timestamp.
 *   - On completion — warm (live timer), a foreground reconcile, or a cold
 *     launch — the row is written via the SAME stable id with `setDoc(merge)`,
 *     so every path converges on one idempotent doc (no duplicates) and the
 *     active record is cleared.
 *
 * The completion row shape is duration / type / completed / startedAt / endedAt
 * / interrupted (the former free-text taskLabel was removed with the intent
 * field — new writes omit it; existing docs keep their legacy value). No
 * BrainState and no protocolId: a bare focus block is state-less and
 * protocol-less, unchanged.
 *
 * Storage-only for the active record (swallows AsyncStorage errors with a
 * warning — persistence is opportunistic, never fatal to the timer UX).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

const ACTIVE_KEY = '@vara/focusSessionActive';
const COLLECTION = 'focusSessions';

export type FocusSessionType = 'pomodoro' | 'ultradian';

export interface ActiveFocusSession {
  /** Stable focusSessions doc id, minted at start, written at completion. */
  focusSessionId: string;
  userId: string;
  durationMinutes: number;
  type: FocusSessionType;
  /** Epoch ms when the block began. */
  startedAt: number;
  /** Epoch ms the block is scheduled to complete (the timer's endsAt). */
  endsAt: number;
}

/**
 * Mint a focusSessions doc id WITHOUT writing. The id is known at block start
 * (for the active record + completion notification data) and the row is written
 * later under the same id — so the cold-launch deep link can bind the inline
 * reflection to a real, stable focusSessions id.
 */
export function mintFocusSessionId(): string {
  if (!db) throw new Error('Firestore not initialized');
  return doc(collection(db, COLLECTION)).id;
}

export async function saveActiveFocusSession(
  record: ActiveFocusSession
): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(record));
  } catch (error) {
    logger.warn('focusSession: saveActiveFocusSession failed', error);
  }
}

export async function getActiveFocusSession(): Promise<ActiveFocusSession | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(ACTIVE_KEY);
  } catch (error) {
    logger.warn('focusSession: getActiveFocusSession failed', error);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidActive(parsed)) {
      logger.warn('focusSession: malformed active record, ignoring');
      return null;
    }
    return parsed;
  } catch (error) {
    logger.warn('focusSession: getActiveFocusSession parse failed', error);
    return null;
  }
}

export async function clearActiveFocusSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  } catch (error) {
    logger.warn('focusSession: clearActiveFocusSession failed', error);
  }
}

export interface FinalizeFocusSessionInput {
  focusSessionId: string;
  userId: string;
  durationMinutes: number;
  type: FocusSessionType;
}

/**
 * Write the completed focusSessions row under the stable id. Idempotent via
 * `setDoc(merge)`: the warm path, a foreground reconcile, and a cold-launch
 * finalize all converge on the same doc with the same data, so a redundant
 * second write is harmless.
 */
export async function finalizeFocusSession(
  input: FinalizeFocusSessionInput
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, COLLECTION, input.focusSessionId);
  await setDoc(
    ref,
    {
      userId: input.userId,
      duration: input.durationMinutes,
      type: input.type,
      completed: true,
      startedAt: serverTimestamp(),
      endedAt: serverTimestamp(),
      interrupted: false,
    },
    { merge: true }
  );
}

/**
 * Pure: should a persisted record be finalized as complete on app return? True
 * once its scheduled end has passed — Option A: a block whose time elapsed,
 * backgrounded OR killed, counts as complete (the completion notification would
 * have fired at endsAt regardless of whether the app was running).
 */
export function isFocusSessionElapsed(
  record: ActiveFocusSession,
  nowMs: number
): boolean {
  return record.endsAt <= nowMs;
}

export interface FocusCompleteLaunchPlan {
  /** The record to finalize, or null when there is nothing honest to write. */
  finalize: ActiveFocusSession | null;
  /** The focusSessions id to bind the completion surface to, or null. */
  completedSessionId: string | null;
}

/**
 * Pure: decide what a `focus-complete` notification launch should do, given the
 * persisted active record. Only an elapsed record belonging to this user is
 * finalized and bound — a missing record (already finalized on an earlier
 * return), a not-yet-elapsed record (killed mid-block), or another user's record
 * degrades to "open Focus, bind nothing" (no fabricated completion, no crash).
 */
export function planFocusCompleteLaunch(
  record: ActiveFocusSession | null,
  userId: string,
  nowMs: number
): FocusCompleteLaunchPlan {
  if (record && record.userId === userId && isFocusSessionElapsed(record, nowMs)) {
    return { finalize: record, completedSessionId: record.focusSessionId };
  }
  return { finalize: null, completedSessionId: null };
}

// Test-only export.
export const _FOCUS_SESSION_ACTIVE_KEY = ACTIVE_KEY;

function isValidActive(x: unknown): x is ActiveFocusSession {
  if (x === null || typeof x !== 'object') return false;
  const o = x as Partial<ActiveFocusSession>;
  return (
    typeof o.focusSessionId === 'string' &&
    typeof o.userId === 'string' &&
    typeof o.durationMinutes === 'number' &&
    (o.type === 'pomodoro' || o.type === 'ultradian') &&
    typeof o.startedAt === 'number' &&
    typeof o.endsAt === 'number'
  );
}
