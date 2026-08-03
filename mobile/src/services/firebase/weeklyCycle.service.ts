/**
 * weeklyCycles / dailyLogs / downshiftEvents — the weekly-loop persistence layer.
 *
 * Stores what the pure src/weeklyEngine module computes (Reconciled Product Spec
 * S6-S8). Three owner-scoped behavioral collections, each gated by the rules on
 * the userId FIELD rather than the document ID, which is what makes the
 * `where userId ==` queries below legal for the caller's own rows and illegal
 * for anyone else's.
 *
 * MEMBER-PRIVACY PRECONDITION (S17.1): these are the rows a coach or employer
 * rollup will aggregate over via Cloud Function, and it must NEVER read them
 * individually. Org membership grants zero read here. Do not add a helper that
 * reads another user's rows; the rules would refuse it anyway.
 *
 * APPEND-ONLY: downshiftEvents deliberately exposes only create + read. The
 * owner rule is uniform across all three collections (update/delete are allowed
 * to the owner), but an event log that can be rewritten is not an event log, and
 * S7 needs the re-set frequency to be trustworthy. The absence of an update or
 * delete helper here is the deliberate boundary; keep it.
 *
 * NOT HERE: floorMet (open item #10 — the weekly-close slice decides how a
 * week's floor outcome is recorded) and energyRating (belongs to the
 * derived-energy-window feature, S11). Do not invent either ahead of its slice.
 *
 * Nothing in the running app calls this yet. No screen imports it this slice.
 *
 * Uses requireDb() so the Firestore handle is narrowed to non-null, keeping this
 * module clear of the "Firestore | null is not assignable" errors the raw `db`
 * import produces elsewhere in this directory.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import type { DailyLog, DownshiftEvent, WeeklyCycle } from '../../types/models';
// Type-only import from the engine barrel: erased at compile time, so this does
// NOT wire the weekly engine into the running app.
import type { CapacityTier, OutcomeKey } from '../../weeklyEngine';

const WEEKLY_CYCLES = 'weeklyCycles';
const DAILY_LOGS = 'dailyLogs';
const DOWNSHIFT_EVENTS = 'downshiftEvents';

/**
 * The deterministic dailyLogs document ID, built in exactly one place.
 *
 * Matches the existing brainStateCheckIns / dailyReflections / fourThreeTwoOne
 * convention. `date` is ISO YYYY-MM-DD and contains no underscore, so unlike a
 * slug-bearing org ID this composite key cannot be parsed ambiguously.
 */
export function dailyLogDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

/** The fields a caller supplies when opening a week. */
export interface CreateWeeklyCycleInput {
  weekStart: string;
  outcome: OutcomeKey;
  capacityInitial: CapacityTier;
  protocolId: string;
}

/**
 * The writable surface of a weekly cycle: everything except identity and
 * creation time. `capacityInitial` stays writable on purpose — it is set once at
 * the open, but nothing here needs to forbid a correction before the close.
 */
export type WeeklyCyclePatch = Partial<
  Omit<WeeklyCycle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

/** The per-day state a caller supplies. */
export interface DailyLogInput {
  protocolCompleted: boolean;
  practiceIds: string[];
}

/** The capacity change a caller records. Direction is carried by from/to. */
export interface CreateDownshiftEventInput {
  weeklyCycleId: string;
  fromCapacity: CapacityTier;
  toCapacity: CapacityTier;
}

/**
 * Strip the fields this module owns from a caller-supplied patch.
 *
 * The Patch types already omit them, so this only bites when a caller casts past
 * the type — but relying on spread order alone leaves a real hole on the UPDATE
 * path: an existing document gets no createdAt from the service, so there is
 * nothing to win the collision and a supplied one would be written. Removing the
 * keys makes the guarantee unconditional rather than accidental.
 */
function stripOwnedKeys(patch: object): Record<string, unknown> {
  const safe: Record<string, unknown> = { ...patch };
  delete safe.id;
  delete safe.userId;
  delete safe.createdAt;
  delete safe.updatedAt;
  return safe;
}

// ---------------------------------------------------------------------------
// weeklyCycles
// ---------------------------------------------------------------------------

/**
 * Open a week. `capacityCurrent` is initialized to `capacityInitial`; the two
 * diverge only when the in-week control fires (S7), and the gap between them is
 * the signal that tells us whether the weekly forecast is working.
 */
export async function createWeeklyCycle(
  userId: string,
  input: CreateWeeklyCycleInput
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), WEEKLY_CYCLES), {
    userId,
    weekStart: input.weekStart,
    outcome: input.outcome,
    capacityInitial: input.capacityInitial,
    capacityCurrent: input.capacityInitial,
    protocolId: input.protocolId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * The cycle for one specific week, or null when the user has not opened it.
 *
 * Null is the normal state before the weekly open, not an error.
 */
export async function getWeeklyCycleForWeek(
  userId: string,
  weekStart: string
): Promise<WeeklyCycle | null> {
  const q = query(
    collection(requireDb(), WEEKLY_CYCLES),
    where('userId', '==', userId),
    where('weekStart', '==', weekStart)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return { ...(first.data() as Omit<WeeklyCycle, 'id'>), id: first.id };
}

/**
 * How many cycles the user has already run on one outcome.
 *
 * This is what the week-1 quick-win rule (spec 6.3) counts: the week number is
 * PER OUTCOME, so a user switching from Focus to Routines in month three is on
 * week 1 of Routines and gets the quick win again. Time-to-felt-effect is a
 * property of the protocol, not of how long the user has had the app.
 *
 * THIS IS THE SINGLE SOURCE OF THE WEEK NUMBER, and Today is its only caller.
 * The count INCLUDES the current week's cycle, which is always persisted before
 * Today mounts, so a first week on an outcome counts 1. Do not add a second
 * derivation anywhere: a caller counting before its own write would be reading
 * a different database state, and the two would disagree about the same week.
 *
 * Two equality filters, so it is served by the automatic single-field indexes
 * and needs no composite index. Fetch-and-length rather than
 * getCountFromServer, and not merely because nothing imports that helper yet:
 * an aggregation query is served by the SERVER and would miss a cycle written
 * moments earlier that has not round-tripped yet, which is exactly the read
 * this function performs on a fresh open. getDocs answers from the local cache
 * as well, so the just-written cycle counts.
 */
export async function countWeeklyCyclesForOutcome(
  userId: string,
  outcome: OutcomeKey
): Promise<number> {
  const q = query(
    collection(requireDb(), WEEKLY_CYCLES),
    where('userId', '==', userId),
    where('outcome', '==', outcome)
  );
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * The user's most recently started cycle, or null when they have never opened
 * one. Null is the normal state for a new user, not an error.
 *
 * Filters on userId ONLY and sorts in memory, deliberately. The equivalent
 * server-side sort (`where userId ==` + `orderBy weekStart desc`, which is what
 * getRecentWeeklyCycles does) needs a composite index that does not exist in
 * firestore.indexes.json — see that function's warning. One document per week
 * makes the client-side sort cheap enough that adding an index to save it would
 * be premature.
 *
 * Ties on weekStart cannot normally occur (a week is opened once), and if one
 * ever did, either document describes the same week.
 */
export async function getLatestWeeklyCycle(userId: string): Promise<WeeklyCycle | null> {
  const cycles = await getWeeklyCyclesForUser(userId);
  if (cycles.length === 0) return null;
  return cycles.reduce((latest, c) => (c.weekStart > latest.weekStart ? c : latest));
}

/**
 * Every cycle the user has, unordered. Returns [] when they have none.
 *
 * Equality-only, so it is served by the automatic single-field index and needs
 * no entry in firestore.indexes.json. Unbounded by design (about 52 documents a
 * year); if that ever stops being cheap, the fix is a bounded query WITH the
 * composite index, not a silent limit here.
 */
export async function getWeeklyCyclesForUser(userId: string): Promise<WeeklyCycle[]> {
  const q = query(
    collection(requireDb(), WEEKLY_CYCLES),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<WeeklyCycle, 'id'>),
    id: d.id,
  }));
}

/**
 * Most recent cycles first. Returns [] when the user has no history.
 *
 * WARNING — NEEDS AN INDEX THAT DOES NOT EXIST YET. The `where userId ==` plus
 * `orderBy weekStart desc` combination requires a composite index, and
 * firestore.indexes.json currently has no weeklyCycles entry at all, so this
 * call FAILS against production. Whichever slice first needs ordered history
 * (the weekly close / continuity) must add the index before calling it. Nothing
 * calls it today; getLatestWeeklyCycle above is the index-free alternative.
 */
export async function getRecentWeeklyCycles(
  userId: string,
  max: number
): Promise<WeeklyCycle[]> {
  const q = query(
    collection(requireDb(), WEEKLY_CYCLES),
    where('userId', '==', userId),
    orderBy('weekStart', 'desc'),
    limitTo(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<WeeklyCycle, 'id'>),
    id: d.id,
  }));
}

/** Patch a cycle. Identity and creation time are not caller-writable. */
export async function updateWeeklyCycle(
  cycleId: string,
  patch: WeeklyCyclePatch
): Promise<void> {
  await updateDoc(doc(requireDb(), WEEKLY_CYCLES, cycleId), {
    ...stripOwnedKeys(patch),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// dailyLogs
// ---------------------------------------------------------------------------

/**
 * Write today's completion state, creating the row if absent.
 *
 * setDoc(merge) rather than updateDoc because the document may not exist yet;
 * updateDoc would reject the first write of the day. Reads before writing so
 * `createdAt` is stamped exactly once — a blind serverTimestamp() under merge
 * resets the creation time on every subsequent call.
 */
export async function upsertDailyLog(
  userId: string,
  date: string,
  input: DailyLogInput
): Promise<void> {
  const id = dailyLogDocId(userId, date);
  const ref = doc(requireDb(), DAILY_LOGS, id);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      ...stripOwnedKeys(input),
      userId,
      date,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** One day's log, or null when nothing was recorded that day. */
export async function getDailyLog(
  userId: string,
  date: string
): Promise<DailyLog | null> {
  const id = dailyLogDocId(userId, date);
  const snap = await getDoc(doc(requireDb(), DAILY_LOGS, id));
  if (!snap.exists()) return null;
  // `id` comes from the arguments: the document ID is the authority on
  // ownership, so a stored field that ever disagreed still reads back correctly.
  return { ...(snap.data() as Omit<DailyLog, 'id'>), id };
}

// ---------------------------------------------------------------------------
// downshiftEvents (append-only: create + read, by design — see the file header)
// ---------------------------------------------------------------------------

/**
 * Append a capacity-change event. Covers BOTH directions despite the collection
 * name; `fromCapacity`/`toCapacity` carry which way it went.
 *
 * Recording this has no bearing on continuity, which is measured against the
 * floor commitment and never against a capacity tier.
 */
export async function createDownshiftEvent(
  userId: string,
  input: CreateDownshiftEventInput
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), DOWNSHIFT_EVENTS), {
    userId,
    weeklyCycleId: input.weeklyCycleId,
    fromCapacity: input.fromCapacity,
    toCapacity: input.toCapacity,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Every capacity change recorded against one cycle. Returns [] when none.
 *
 * Filtered on userId as well as weeklyCycleId so the query is legal under the
 * owner rule, which evaluates per candidate document on a list.
 */
export async function getDownshiftEventsForCycle(
  userId: string,
  weeklyCycleId: string
): Promise<DownshiftEvent[]> {
  const q = query(
    collection(requireDb(), DOWNSHIFT_EVENTS),
    where('userId', '==', userId),
    where('weeklyCycleId', '==', weeklyCycleId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<DownshiftEvent, 'id'>),
    id: d.id,
  }));
}
