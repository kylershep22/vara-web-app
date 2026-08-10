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
 * APPEND-ONLY: downshiftEvents exposes only create + read (and the batched
 * create inside resetWeeklyCapacity). The owner rule is uniform across all three
 * collections (update/delete are allowed to the owner), but an event log that
 * can be rewritten is not an event log, and S7 needs the re-set frequency to be
 * trustworthy. The absence of an update or delete helper here is the deliberate
 * boundary; keep it.
 *
 * NOTHING READS THE EVENT LOG IN THE APP YET. getDownshiftEventsForCycle exists
 * and is tested, but re-set frequency is an analytics question (P0 #7) with its
 * own slice. capacityCurrent on the cycle is what the UI renders; the log is
 * written for later.
 *
 * NOT HERE: energyRating (belongs to the derived-energy-window feature, S11).
 * Do not invent it ahead of its slice. floorMet IS here now, written by
 * closeWeeklyCycle and by nothing else: open item #10 resolved as Option A,
 * self-reported at the close rather than derived from daily completion.
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
  writeBatch,
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

/**
 * The fields a caller supplies when opening a week.
 *
 * `weekStart` and `weekEnd` travel together and are both REQUIRED, because they
 * are one decision: a week is a span, and the caller that knows where it starts
 * is the only one that knows whether it is a full seven days or a partial stub.
 * Both come from `planWeek`, which is the single place that decision is made.
 * Accepting a start without an end would put the length back in this module's
 * hands, which is exactly the fixed-seven assumption this slice removed.
 */
export interface CreateWeeklyCycleInput {
  weekStart: string;
  /** Inclusive last day. */
  weekEnd: string;
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
    // Stored, never re-derived. A later change to the user's chosen start day
    // must not be able to move the end of a week already in progress.
    weekEnd: input.weekEnd,
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

/**
 * What the user answers at the weekly close (S8).
 *
 * `closeCompletedAt` is deliberately NOT here: the service stamps it, exactly
 * as it stamps updatedAt. A caller cannot supply a server timestamp through a
 * field typed `Timestamp` without a cast, and a cast on a completion time is
 * how a client clock ends up deciding when a week closed.
 */
export interface CloseWeeklyCycleInput {
  /** 1-5, one tap each. Weekly, never daily (S8.2). */
  ratingFocus: number;
  ratingRecovery: number;
  ratingEnergy: number;
  /** Skippable (S8.3). Omitted from the write when blank rather than stored as ''. */
  closeNote?: string;
  /** The stable option ID of the one adjustment chosen (S8.4), never its label. */
  adjustmentSelected: string;
  /** Self-reported: did they hold their floor this week? (open item #10, Option A). */
  floorMet: boolean;
}

/**
 * Complete a week (S8). The ONLY writer of floorMet, and the first and only
 * writer of the close fields.
 *
 * ONE updateDoc ON ONE DOCUMENT. Everything the close captures lives on the
 * cycle, so there is nothing to batch and nothing to fan out: the write either
 * lands whole or not at all, and a failed close leaves the week exactly as it
 * was. Do not add a second collection here without revisiting that.
 *
 * Fields are listed one by one rather than spread from `input`. That is not
 * ceremony: it is what guarantees a caller cannot smuggle `capacityCurrent`,
 * `capacityInitial`, `outcome` or `protocolId` into the close. The close records
 * how the week went; it never re-writes what the week WAS. `capacityInitial`
 * especially is the weekly forecast, and the gap between it and where the user
 * landed is the S7 instrumentation.
 *
 * `userId` is not a parameter. Ownership is enforced by the deployed rule on
 * weeklyCycles, which reads the stored userId of the document being updated;
 * passing one here would be decoration that the client could get wrong.
 *
 * NOTE ON floorMet AND CONTINUITY: this boolean is the whole of what continuity
 * consumes. No tier is written alongside it and none may be added, or the
 * invariant that continuity is measured against the floor and never against
 * capacity stops holding at the storage layer.
 */
export async function closeWeeklyCycle(
  cycleId: string,
  input: CloseWeeklyCycleInput
): Promise<void> {
  const note = input.closeNote?.trim();

  await updateDoc(doc(requireDb(), WEEKLY_CYCLES, cycleId), {
    ratingFocus: input.ratingFocus,
    ratingRecovery: input.ratingRecovery,
    ratingEnergy: input.ratingEnergy,
    // Skipped means absent, not empty. An '' would read back as "they answered
    // and said nothing", which is a different fact from "they skipped it".
    ...(note ? { closeNote: note } : {}),
    adjustmentSelected: input.adjustmentSelected,
    floorMet: input.floorMet,
    closeCompletedAt: serverTimestamp(),
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

// ---------------------------------------------------------------------------
// The in-week re-set (S7) — the one operation that spans two collections
// ---------------------------------------------------------------------------

/**
 * Move a live cycle to a different capacity tier, in either direction.
 *
 * ATOMIC BY REQUIREMENT (S7), not as a nicety. The event log and
 * `capacityCurrent` answer two different questions: the field is authoritative
 * for "what tier am I on now", the log is the append-only trail of how the week
 * actually went. A partial write makes them disagree permanently, and there is
 * no reconciliation pass that would ever notice. Either both land or neither
 * does.
 *
 * DELIBERATELY NOT COMPOSED from createDownshiftEvent + updateWeeklyCycle. Those
 * two are correct and tested, but each owns its own terminal write (addDoc /
 * updateDoc) and neither can be staged onto a caller's batch. Calling them in
 * sequence is exactly the non-atomic version this function exists to replace, so
 * the writes are restated here against one batch rather than the primitives
 * being reshaped around a batch parameter. They stay as they are.
 *
 * WRITES capacityCurrent ONLY. `capacityInitial` is the weekly forecast and is
 * never touched: the gap between forecast and where the user actually landed is
 * the instrumentation S7 is built to produce, and overwriting the forecast
 * destroys it. WeeklyCyclePatch permits writing that field, so this function's
 * shape is what enforces the invariant. Do not route this through
 * updateWeeklyCycle to "reuse" it; a patch object is exactly how the forecast
 * would get clobbered later.
 *
 * NOTHING HERE TOUCHES CONTINUITY. Continuity is measured against the floor
 * commitment and never against a capacity tier (see computeContinuity), which is
 * what makes an upshift safe: a user cannot raise their capacity and thereby
 * break a streak they were keeping. No tier field feeds that calculation, and
 * none may be added.
 *
 * `fromCapacity` is supplied by the caller rather than re-read here. The caller
 * is rendering the tier it read, and passing what it displayed keeps the event
 * honest about the transition the user actually saw and tapped.
 */
export async function resetWeeklyCapacity(
  userId: string,
  cycleId: string,
  fromCapacity: CapacityTier,
  toCapacity: CapacityTier
): Promise<void> {
  const database = requireDb();
  const batch = writeBatch(database);

  // Minted rather than addDoc'd: a batch needs the ref up front, and addDoc
  // would be a second, unbatched write.
  const eventRef = doc(collection(database, DOWNSHIFT_EVENTS));
  batch.set(eventRef, {
    userId,
    weeklyCycleId: cycleId,
    fromCapacity,
    toCapacity,
    timestamp: serverTimestamp(),
  });

  batch.update(doc(database, WEEKLY_CYCLES, cycleId), {
    capacityCurrent: toCapacity,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
