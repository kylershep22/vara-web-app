/**
 * Pending notification intent: sending, settling and replay (NPM-2, Kyle's
 * Decisions 1, 2 and 12). The durable store is notificationIntentStore.
 *
 * submitNotificationIntent OWNS THE ORDER of a new change, and nothing else may
 * send these Firestore writes:
 *   1. the caller's screen has already changed (the caller's concern);
 *   2. the entry gets a new seq and is written to disk, in order;
 *   3. until that write succeeds the intent is NOT accepted: it is laid over no
 *      reconcile, replayed by nothing, sent nowhere and applied nowhere;
 *   4. if the write fails, nothing else happens and the caller is told
 *      ('persist-failed'). There is no retry store and no memory-only substitute;
 *   5. once it succeeds, the Firestore write is sent and, for General and the
 *      daily time, applyDailyRhythmChoice is queued with the effective values
 *      the caller supplied;
 *   6. and 7. on acknowledgement or confirmed rejection, the entry is cleared if
 *      its seq is still the latest, and the caller is told.
 *
 * The record is on disk BEFORE the apply enters the reconcile queue, so the
 * apply's own wait behind a reconcile in flight (up to 10 seconds offline)
 * never widens the loss window.
 */
import { updateNotificationPreferences } from './firebase/notificationPreferences.service';
import { applyDailyRhythmChoice, reconcileDailyRhythm } from './notificationScheduler.service';
import {
  IntentControl,
  IntentValues,
  currentGeneration,
  ensureJournalLoaded,
  isNotificationOwner,
  nextSeq,
  persistIntent,
  settleIntent,
} from './notificationIntentStore';
import { logger } from '../utils/logger';
import type { ReminderTime } from '../types';

export {
  clearNotificationIntent,
  ensureJournalLoaded,
  NOTIFICATION_INTENT_KEY,
} from './notificationIntentStore';
export type { IntentControl, IntentValues } from './notificationIntentStore';

// ==========================================
// THE WRITE-BUILDER
// ==========================================

/**
 * The Firestore fields for one control's value, as dotted paths so every other
 * key already in the dailyRhythm and socialConnection maps is kept. A committed
 * time always writes dailyRhythm.enabled: true (Decision 4); nothing here writes
 * it false. updatedAt is stamped by updateNotificationPreferences, as today.
 */
export function buildIntentWrite<K extends IntentControl>(
  control: K,
  value: IntentValues[K]
): Record<string, unknown> {
  switch (control) {
    case 'general':
      return { allNotificationsEnabled: value };
    case 'dailyTime': {
      const t = value as ReminderTime;
      return { 'dailyRhythm.enabled': true, 'dailyRhythm.reminderTime': { hour: t.hour, minute: t.minute } };
    }
    case 'directMessages':
      return { 'socialConnection.directMessages': value };
    case 'connectionRequests':
      return { 'socialConnection.connectionRequests': value };
    default:
      throw new Error(`unknown notification intent control: ${String(control)}`);
  }
}

// ==========================================
// SENDING AND SETTLING
// ==========================================

export type IntentSettlement =
  /** Firestore acknowledged the write. `latest`: it was still this control's newest change. */
  | { outcome: 'acknowledged'; latest: boolean }
  /** Firestore rejected the write (including not-found: the document is missing). */
  | { outcome: 'rejected'; latest: boolean; error: unknown }
  /** The session ended first. Nothing was touched. */
  | { outcome: 'session-ended' };

/** Seqs whose Firestore write is in flight in this launch. */
const inFlight = new Set<number>();

function send<K extends IntentControl>(
  uid: string,
  control: K,
  value: IntentValues[K],
  seq: number,
  gen: number
): Promise<IntentSettlement> {
  // OWNERSHIP (send): nothing is sent for an account that is not the one signed
  // in right now. Covers a new change and a replayed one alike.
  if (gen !== currentGeneration() || !isNotificationOwner(uid)) {
    return Promise.resolve({ outcome: 'session-ended' });
  }
  inFlight.add(seq);
  // updateNotificationPreferences spreads these into updateDoc, which takes
  // dotted paths; its parameter type only describes whole top-level fields.
  const fields = buildIntentWrite(control, value) as Parameters<typeof updateNotificationPreferences>[1];
  return updateNotificationPreferences(uid, fields).then(
    async (): Promise<IntentSettlement> => {
      inFlight.delete(seq);
      // OWNERSHIP (acknowledgement): a late answer for a departed account
      // touches neither the journal nor anything else.
      if (gen !== currentGeneration() || !isNotificationOwner(uid)) return { outcome: 'session-ended' };
      const latest = await settleIntent(uid, control, seq, gen);
      return { outcome: 'acknowledged', latest };
    },
    async (error): Promise<IntentSettlement> => {
      inFlight.delete(seq);
      // OWNERSHIP (rejection): likewise, and so no correction is made for it.
      if (gen !== currentGeneration() || !isNotificationOwner(uid)) return { outcome: 'session-ended' };
      const latest = await settleIntent(uid, control, seq, gen);
      return { outcome: 'rejected', latest, error };
    }
  );
}

export type SubmitResult =
  | { status: 'persist-failed' }
  | { status: 'session-ended' }
  | { status: 'sent'; seq: number; settled: Promise<IntentSettlement> };

/**
 * Accept one user change: persist it, then send it, then (General or the daily
 * time) apply it. `effective` is the General and time the caller's screen now
 * shows, required for those two controls. Resolves once the change is on disk
 * and sent, or with why it was not. Never rejects.
 */
export async function submitNotificationIntent<K extends IntentControl>(
  uid: string,
  control: K,
  value: IntentValues[K],
  effective?: { general: boolean; reminderTime: ReminderTime | null }
): Promise<SubmitResult> {
  const gen = currentGeneration();
  const seq = nextSeq();
  let persisted = false;
  try {
    persisted = await persistIntent(uid, control, { value, seq }, gen);
  } catch (error) {
    logger.warn('[notificationIntent] persist threw', error);
  }
  if (!persisted) {
    return gen !== currentGeneration() ? { status: 'session-ended' } : { status: 'persist-failed' };
  }
  // OWNERSHIP (submit): the account may have changed while the disk write ran.
  // Then nothing is sent and nothing is applied for it.
  if (!isNotificationOwner(uid)) return { status: 'session-ended' };

  const settled = send(uid, control, value, seq, gen);
  if ((control === 'general' || control === 'dailyTime') && effective) {
    void applyDailyRhythmChoice(uid, effective);
  }
  return { status: 'sent', seq, settled };
}

// ==========================================
// REPLAY
// ==========================================

const replayed = new Set<string>();

/**
 * Re-send this user's persisted pending changes, once per user per launch. Runs
 * in NotificationContext's sign-in job BEFORE the reconcile. It waits only for
 * the local disk read, never for the network: the writes are sent and left to
 * settle.
 *
 * An acknowledged replay clears its entry. A rejected one (not-found included)
 * clears its entry, shows nothing (Decision 5), and corrects the schedule with
 * one reconcile, which reads fresh and lays any remaining entries over the
 * result (Decision 4). Entries already in flight in this launch are skipped.
 * Never rejects.
 */
export async function replayNotificationIntent(uid: string): Promise<void> {
  if (replayed.has(uid)) return;
  replayed.add(uid);
  const gen = currentGeneration();
  try {
    const entries = await ensureJournalLoaded(uid);
    if (gen !== currentGeneration()) return;
    for (const control of Object.keys(entries) as IntentControl[]) {
      const entry = entries[control];
      if (!entry || inFlight.has(entry.seq)) continue;
      void send(uid, control, entry.value, entry.seq, gen).then((s) => {
        // OWNERSHIP (correcting reconcile): only for the account still signed
        // in, and the reconcile itself re-checks before each change it makes.
        if (s.outcome === 'rejected' && isNotificationOwner(uid)) {
          logger.warn('[notificationIntent] replayed change rejected; schedule corrected', s.error);
          void reconcileDailyRhythm(uid);
        }
      });
    }
  } catch (error) {
    logger.warn('[notificationIntent] replay failed', error);
  }
}

/** Test-only: forget which users were replayed and what is in flight, as a fresh launch would. */
export function _resetNotificationIntentJournalForTests(): void {
  replayed.clear();
  inFlight.clear();
}
