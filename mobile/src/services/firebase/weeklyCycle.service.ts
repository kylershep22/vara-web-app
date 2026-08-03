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

/** Most recent cycles first. Returns [] when the user has no history. */
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
