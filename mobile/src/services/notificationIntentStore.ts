/**
 * Pending notification intent: the durable half (NPM-2, Kyle's Decision 2 on
 * Addendum 1 and Decision 1 on Addendum 2).
 *
 * Firestore stays canonical. This holds ONLY notification preference changes
 * that Firestore has not acknowledged yet, so an accepted change survives the
 * app being killed before it syncs. One AsyncStorage key holds at most one
 * user's record:
 *
 *   { v: 1, uid, entries: { general?, dailyTime?, directMessages?, connectionRequests? } }
 *
 * Each entry is { value, seq }. There is one entry per control, so a newer change
 * replaces the older one, and an acknowledgement or a failure clears an entry
 * only while its seq is still the latest for that control. No device timestamp
 * is stored: nothing would read it (Decision 3: this device's pending change
 * wins until it resolves, with no timestamp comparison).
 *
 * THE IN-MEMORY COPY HOLDS ONLY WHAT IS ON DISK. An entry joins it after its
 * disk write succeeds, never before, so nothing can lay over a reconcile or be
 * replayed until it would also survive a restart (Decision 12).
 *
 * Kept free of any scheduler import: the reconcile reads the overlay from here,
 * and notificationIntentJournal (which sends writes and calls the scheduler)
 * builds on this module. One module for both would be an import cycle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { isValidReminderTime } from '../utils/reminderTime';
import { logger } from '../utils/logger';
import type { ReminderTime } from '../types';

export const NOTIFICATION_INTENT_KEY = '@vara/notificationIntentPending';

export type IntentControl = 'general' | 'dailyTime' | 'directMessages' | 'connectionRequests';

export interface IntentValues {
  general: boolean;
  dailyTime: ReminderTime;
  directMessages: boolean;
  connectionRequests: boolean;
}

export type IntentEntry<K extends IntentControl = IntentControl> = { value: IntentValues[K]; seq: number };
export type IntentEntries = { [K in IntentControl]?: IntentEntry<K> };

interface StoredRecord {
  v: 1;
  uid: string;
  entries: IntentEntries;
}

const CONTROLS: IntentControl[] = ['general', 'dailyTime', 'directMessages', 'connectionRequests'];

// ==========================================
// MODULE STATE
// ==========================================

/** Bumped by every clear. Work started under an older generation is inert. */
let generation = 0;
/** The persisted entries of ONE user, as last read from or written to disk. */
let mirror: { uid: string; entries: IntentEntries } | null = null;
let loading: { uid: string; promise: Promise<IntentEntries> } | null = null;
/** Disk writes run one at a time, in order, so persisted states land in order. */
let diskChain: Promise<unknown> = Promise.resolve();
let seqCounter = Date.now();

export function currentGeneration(): number {
  return generation;
}

export function nextSeq(): number {
  seqCounter += 1;
  return seqCounter;
}

function sessionUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/**
 * Whether `uid` is the authenticated owner RIGHT NOW. Fails closed: with no
 * signed-in user nobody is the owner (Kyle's ruling 4 on Build A). Every piece
 * of queued or asynchronous notification work asks this at the moment it would
 * mutate notification state or the journal, so work started for one account
 * does nothing once another (or nobody) is current.
 */
export function isNotificationOwner(uid: string): boolean {
  const current = sessionUid();
  return current !== null && current === uid;
}

/** The signed-in user right now, or null. */
export function notificationSessionUid(): string | null {
  return sessionUid();
}

// ==========================================
// VALIDATION
// ==========================================

function validEntry(control: IntentControl, raw: unknown): raw is IntentEntry {
  if (!raw || typeof raw !== 'object') return false;
  const { value, seq } = raw as { value?: unknown; seq?: unknown };
  if (typeof seq !== 'number' || !Number.isFinite(seq)) return false;
  return control === 'dailyTime' ? isValidReminderTime(value) : typeof value === 'boolean';
}

/** The whole record, or null if any part of it is malformed. Never a partial record. */
function parseRecord(raw: string | null): StoredRecord | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { v, uid, entries } = data as { v?: unknown; uid?: unknown; entries?: unknown };
  if (v !== 1 || typeof uid !== 'string' || !uid || !entries || typeof entries !== 'object') return null;
  const out: IntentEntries = {};
  for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
    if (!CONTROLS.includes(key as IntentControl)) return null;
    if (!validEntry(key as IntentControl, value)) return null;
    const { value: v2, seq } = value as IntentEntry;
    (out as Record<string, IntentEntry>)[key] = { value: v2, seq };
  }
  return { v: 1, uid, entries: out };
}

// ==========================================
// LOAD
// ==========================================

/**
 * This user's persisted pending entries, read from disk once per user per
 * launch and kept in memory after that. A record that belongs to anyone else is
 * never returned; when `uid` is the signed-in user, such a record is deleted. A
 * malformed record is discarded whole. Never rejects.
 */
export function ensureJournalLoaded(uid: string): Promise<IntentEntries> {
  if (mirror?.uid === uid) return Promise.resolve(mirror.entries);
  if (loading?.uid === uid) return loading.promise;

  const gen = generation;
  const promise = (async (): Promise<IntentEntries> => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(NOTIFICATION_INTENT_KEY);
    } catch (error) {
      logger.warn('[notificationIntent] pending intent unreadable, treated as none', error);
    }
    const record = parseRecord(raw);
    const mine = record && record.uid === uid ? record.entries : {};
    // Someone else's record, or a malformed one: never applied, and removed
    // when the reader is the signed-in user, so it cannot linger.
    if (raw && (!record || record.uid !== uid) && sessionUid() === uid) {
      await runOnDisk(async () => {
        const again = parseRecord(await AsyncStorage.getItem(NOTIFICATION_INTENT_KEY));
        if (!again || again.uid !== uid) await AsyncStorage.removeItem(NOTIFICATION_INTENT_KEY);
      });
    }
    if (gen === generation) {
      mirror = { uid, entries: { ...mine } };
      if (loading?.uid === uid) loading = null;
      return mirror.entries;
    }
    return {};
  })();
  loading = { uid, promise };
  return promise;
}

/** The persisted entries currently in memory for `uid`, without reading disk. */
export function persistedEntries(uid: string): IntentEntries {
  return mirror?.uid === uid ? { ...mirror.entries } : {};
}

// ==========================================
// DISK
// ==========================================

function runOnDisk<T>(step: () => Promise<T>): Promise<T> {
  const run = diskChain.then(step, step);
  diskChain = run.catch(() => undefined);
  return run;
}

async function writeRecord(uid: string, entries: IntentEntries): Promise<void> {
  if (Object.keys(entries).length === 0) {
    await AsyncStorage.removeItem(NOTIFICATION_INTENT_KEY);
  } else {
    const record: StoredRecord = { v: 1, uid, entries };
    await AsyncStorage.setItem(NOTIFICATION_INTENT_KEY, JSON.stringify(record));
  }
}

/**
 * Persist one new entry. The record written is built INSIDE the disk chain from
 * what is already persisted, so back-to-back changes to different controls all
 * land. Resolves true once the entry is on disk and in memory; false if the disk
 * write failed (the entry then exists nowhere) or the session was cleared first.
 */
export async function persistIntent<K extends IntentControl>(
  uid: string,
  control: K,
  entry: IntentEntry<K>,
  gen: number
): Promise<boolean> {
  await ensureJournalLoaded(uid);
  return runOnDisk(async () => {
    if (gen !== generation) return false;
    const base = mirror?.uid === uid ? mirror.entries : {};
    const next: IntentEntries = { ...base, [control]: entry };
    try {
      await writeRecord(uid, next);
    } catch (error) {
      logger.warn('[notificationIntent] pending intent could not be saved', error);
      return false;
    }
    if (gen !== generation) return false;
    mirror = { uid, entries: next };
    return true;
  });
}

/**
 * Clear `control`'s entry if `seq` is still the latest for it: the write it
 * stands for was acknowledged or rejected. Returns whether it was the latest.
 * Inert after a clear.
 */
export function settleIntent(uid: string, control: IntentControl, seq: number, gen: number): Promise<boolean> {
  return runOnDisk(async () => {
    if (gen !== generation || mirror?.uid !== uid) return false;
    if (mirror.entries[control]?.seq !== seq) return false;
    const next: IntentEntries = { ...mirror.entries };
    delete next[control];
    mirror = { uid, entries: next };
    try {
      await writeRecord(uid, next);
    } catch (error) {
      // Memory is already correct for this launch. The stale entry on disk is
      // replayed at the next launch, where re-sending an acknowledged value is
      // harmless and a rejected one is cleared again.
      logger.warn('[notificationIntent] settled intent could not be cleared on disk', error);
    }
    return true;
  });
}

// ==========================================
// CLEAR (session loss)
// ==========================================

/**
 * End the pending intent of a session. SYNCHRONOUSLY: the in-memory copy goes
 * and the generation is bumped, so any acknowledgement, failure, persist or
 * replay still in flight for the departing user does nothing from here on. The
 * disk removal follows on the disk chain; the returned promise settles when it
 * has, and never rejects.
 *
 * With a uid, the stored record is removed only if it is that user's (or is
 * malformed). Without one (account deletion) it is removed whoever it belongs to.
 *
 * Called ONLY on an authoritative session transition (Kyle's ruling 1 on Build
 * A): explicit sign-out, account deletion, or a different uid becoming current.
 * A transient no-user state at startup is not one, so a signed-out cold start
 * does not clear; a record left by another account is discarded on read
 * instead, before it can be replayed or laid over anything.
 */
export function clearNotificationIntent(uid?: string): Promise<void> {
  generation += 1;
  mirror = null;
  loading = null;
  return runOnDisk(async () => {
    try {
      if (uid) {
        const record = parseRecord(await AsyncStorage.getItem(NOTIFICATION_INTENT_KEY));
        if (record && record.uid !== uid) return;
      }
      await AsyncStorage.removeItem(NOTIFICATION_INTENT_KEY);
    } catch (error) {
      logger.warn('[notificationIntent] pending intent could not be removed', error);
    }
  }).then(() => undefined);
}

// ==========================================
// OVERLAY (read by the reconcile)
// ==========================================

/**
 * This user's pending General and daily-time choices, to lay over a successful
 * preferences read (Kyle's semantic: a pending change takes precedence over an
 * older remote value on this device until it resolves). Only persisted entries
 * count. Never rejects.
 */
export async function pendingDailyRhythmOverlay(
  uid: string
): Promise<{ general?: boolean; reminderTime?: ReminderTime }> {
  const entries = await ensureJournalLoaded(uid);
  const out: { general?: boolean; reminderTime?: ReminderTime } = {};
  // Ownership, checked when the overlay is used: a reconcile running for an
  // account that is no longer signed in never gets that account's pending
  // changes laid over it.
  if (!isNotificationOwner(uid)) return out;
  if (entries.general) out.general = entries.general.value as boolean;
  if (entries.dailyTime) out.reminderTime = entries.dailyTime.value as ReminderTime;
  return out;
}

/** Test-only: forget all module state, as a fresh launch would. Disk is untouched. */
export function _resetNotificationIntentStoreForTests(): void {
  generation += 1;
  mirror = null;
  loading = null;
  diskChain = Promise.resolve();
}
