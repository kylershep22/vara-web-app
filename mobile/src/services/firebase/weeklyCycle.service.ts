/**
 * weeklyCycles / downshiftEvents — the WEEKLY-loop persistence layer.
 *
 * dailyLogs LEFT THIS FILE in journey slice 0 and now lives in
 * dailyLog.service.ts. The daily capacity loop survives the weekly loop's
 * retirement, so the two no longer share a module; do not add a dailyLogs
 * helper back here.
 *
 * Stores what the pure src/protocolEngine module computes (Reconciled Product Spec
 * S6-S8). Two owner-scoped behavioral collections, each gated by the rules on
 * the userId FIELD rather than the document ID, which is what makes the
 * `where userId ==` queries below legal for the caller's own rows and illegal
 * for anyone else's.
 *
 * MEMBER-PRIVACY PRECONDITION (S17.1): these are the rows a coach or employer
 * rollup will aggregate over via Cloud Function, and it must NEVER read them
 * individually. Org membership grants zero read here. Do not add a helper that
 * reads another user's rows; the rules would refuse it anyway.
 *
 * `writeBatch` LEFT THIS FILE with the last batched write (journey slice 3b).
 * Rollover uses a transaction rather than a batch, because it has to READ the
 * target document before deciding to write it; a batch cannot read.
 *
 * APPEND-ONLY: downshiftEvents exposes only create + read. The owner rule is
 * uniform across both collections (update/delete are allowed to the owner),
 * but an event log that can be rewritten is not an event log. The absence of an
 * update or delete helper here is the deliberate boundary; keep it.
 *
 * downshiftEvents IS NOW ORPHANED. It recorded the in-week capacity re-set,
 * which is retired (roadmap 3b-i): capacity is a daily read on the dailyLogs row
 * and there is no weekly tier left to move. The collection, its model and its
 * helpers stay because the rows already written are a true record of re-sets
 * that really happened; nothing writes there any more. See the retirement note
 * further down before adding a new writer.
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
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import { isWithinWeek, planWeek, resolveWeekEnd } from '../../utils/weekStart';
import type { DownshiftEvent, WeeklyCycle } from '../../types/models';
// Type-only import from the engine barrel: erased at compile time, so this does
// NOT wire the weekly engine into the running app.
import type { CapacityTier, OutcomeKey } from '../../protocolEngine';

const WEEKLY_CYCLES = 'weeklyCycles';
const DOWNSHIFT_EVENTS = 'downshiftEvents';

/**
 * What a rolled-over cycle carries when there is no previous one to carry
 * forward. Matches resolveJourney's own fallbacks so the two cannot disagree
 * about a user with no history.
 */
const DEFAULT_ROLLOVER_OUTCOME: OutcomeKey = 'focus';
const DEFAULT_ROLLOVER_CAPACITY: CapacityTier = 'normal';

/** What ensureCurrentWeeklyCycle needs. `latest` is null for a first cycle. */
export interface EnsureWeeklyCycleInput {
  /** Today, injected. Never read from the clock in here. */
  todayIso: string;
  /** userPrivate.weekStartDay; null or undefined until the picker writes one. */
  weekStartDay: number | null | undefined;
  /** The user's most recent cycle, or null when they have none. */
  latest: WeeklyCycle | null;
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
}

/**
 * The writable surface of a weekly cycle: everything except identity and
 * creation time. `capacityInitial` stays writable on purpose — it is set once at
 * the open, but nothing here needs to forbid a correction before the close.
 */
export type WeeklyCyclePatch = Partial<
  Omit<WeeklyCycle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

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
 * Open a week.
 *
 * THE WRITE-SET IS THE LIVE-READER SET, and that is the whole rule (roadmap
 * §3.4, sequencing corrected in this slice). `capacityCurrent` and `protocolId`
 * used to be written here and are not any more: nothing reads either one.
 * `capacityCurrent` mirrored `capacityInitial` for the in-week re-set, which
 * retired when capacity became a daily answer, and `protocolId` was the weekly
 * protocol pin, which the phase model serves instead.
 *
 * `outcome`, `capacityInitial` and `weekStart` ARE still written even though
 * §3.4 lists the first two as stop-writing, because both are still read on live
 * paths (resolveJourney's capacity seed and migration destination). Retiring
 * them is sequenced behind removing those reads, in a later slice. Stopping the
 * writes first would not fail, it would silently pin every capacity seed to
 * 'normal', which is the worst kind of correct-looking bug.
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * The document ID a rolled-over cycle is written under.
 *
 * DETERMINISTIC, AND THAT IS THE IDEMPOTENCY. See ensureCurrentWeeklyCycle.
 * Mirrors the shape dailyLogs already uses for the same reason (one row per
 * user per period, named by the period). Cycles written before rollover existed
 * carry Firestore auto-IDs and are found by the `weekStart` field like every
 * other read here, so the two shapes coexist with nothing to migrate.
 */
export function weeklyCycleDocId(userId: string, weekStart: string): string {
  return `${userId}_${weekStart}`;
}

/**
 * Make sure the user has a live week, creating the next one if they do not.
 *
 * THIS REPLACES THE WEEKLY OPEN. The open was a wizard that asked for an
 * outcome and a capacity and then wrote a cycle; under the journey model the
 * phase supplies the destination and capacity is a daily answer, so there is
 * nothing left to ask. What is left is bookkeeping, and bookkeeping does not
 * deserve a screen. A week that ends now rolls into the next one, and the
 * weekly reset check-in stays the ritual.
 *
 * IDEMPOTENT UNDER DOUBLE-TRIGGER, BY CONSTRUCTION RATHER THAN BY LUCK. Two
 * things can notice expiry at once (a foreground and a navigation both
 * re-running the landing effect), and a read-then-create would let both read
 * "no cycle" and both create one. Two defences, and only the second is load
 * bearing:
 *
 *   1. The document ID is derived from the week it covers, so a duplicate is
 *      not a second document, it is the same document.
 *   2. The write runs in a TRANSACTION that reads that ID and creates only on
 *      absence. Concurrent transactions on one document serialize, so the
 *      loser sees the winner's document and writes nothing. This is also what
 *      makes it safe across an app relaunch, where an in-memory guard would
 *      have been forgotten.
 *
 * Never overwrites. A cycle that already exists is returned untouched, which
 * matters because it may already carry close fields, and a blind set would
 * silently un-close a closed week.
 *
 * CARRIES THE PREVIOUS WEEK FORWARD. `outcome` and `capacityInitial` come from
 * the expiring cycle, so rollover continues what the user chose rather than
 * asking again or guessing. With no prior cycle at all the defaults are the
 * same ones resolveJourney falls back to, so a user with no history lands
 * exactly where the resolver would have put them anyway.
 */
export async function ensureCurrentWeeklyCycle(
  userId: string,
  input: EnsureWeeklyCycleInput
): Promise<WeeklyCycle> {
  const { todayIso, weekStartDay, latest } = input;

  // Already live: nothing to do. The caller has usually established this
  // already, but this makes the function safe to call unconditionally.
  if (latest && isWithinWeek(resolveWeekEnd(latest.weekStart, latest.weekEnd), todayIso)) {
    return latest;
  }

  const plan = planWeek({
    todayIso,
    weekStartDay,
    priorWeekEnd: latest ? resolveWeekEnd(latest.weekStart, latest.weekEnd) : null,
  });

  const id = weeklyCycleDocId(userId, plan.weekStart);
  const ref = doc(requireDb(), WEEKLY_CYCLES, id);

  const created = {
    userId,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    outcome: latest?.outcome ?? DEFAULT_ROLLOVER_OUTCOME,
    capacityInitial: latest?.capacityInitial ?? DEFAULT_ROLLOVER_CAPACITY,
  };

  await runTransaction(requireDb(), async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return;
    tx.set(ref, {
      ...created,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  // Read back rather than returning the local object, so a caller that lost the
  // race gets the winner's document instead of one that was never written.
  const settled = await getDoc(ref);
  return { ...(settled.data() as Omit<WeeklyCycle, 'id'>), id: settled.id };
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
  /** Skippable (S8.3). Omitted from the write when blank rather than stored as ''. */
  closeNote?: string;
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
    // Skipped means absent, not empty. An '' would read back as "they answered
    // and said nothing", which is a different fact from "they skipped it".
    ...(note ? { closeNote: note } : {}),
    floorMet: input.floorMet,
    closeCompletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
// RETIRED: the in-week capacity re-set (S7).
//
// `resetWeeklyCapacity` lived here and was the one operation spanning two
// collections: it batched a downshiftEvents row with a `capacityCurrent` update
// so the two could never disagree. Both halves are moot now. Capacity is
// answered per day on the dailyLogs row (roadmap 3b-i), so there is no weekly
// tier left to move and no transition to log.
//
// The `downshiftEvents` collection, its model and its create/read helpers are
// deliberately LEFT IN PLACE. They are orphaned, not broken: the rows already
// written are a true record of re-sets that really happened, and deleting the
// read path would strand them. Nothing writes there any more.
// ---------------------------------------------------------------------------

/**
 * Cycles whose week ended on or after fromIso, oldest first.
 *
 * Feeds deriveAdjustDue, which reads the two most recent weekly phase reads
 * (journey slice 1).
 *
 * FILTERS ON userId ONLY AND NARROWS IN MEMORY, DELIBERATELY. Two reasons, and
 * both matter:
 *
 *   1. NO COMPOSITE INDEX. `where userId ==` plus a range or an orderBy on
 *      another field needs one, firestore.indexes.json still has no
 *      weeklyCycles entry at all, and getRecentWeeklyCycles above is already
 *      stranded on exactly that. Adding a second stranded query would be a bug
 *      waiting for its first caller.
 *   2. A RANGE FILTER ON weekEnd WOULD SILENTLY DROP ROWS. `weekEnd` is
 *      optional and absent on every cycle written before it existed, and
 *      Firestore excludes documents missing the field from a range filter
 *      entirely. Those rows are the OLDEST ones, which is precisely where a
 *      "since" query looks. In memory they are kept and resolveWeekEnd's
 *      fallback applies.
 *
 * A user accumulates about 52 of these a year, so reading them all is cheap
 * and stays cheap. Revisit only if that stops being true.
 */
export async function getWeeklyCyclesSince(
  userId: string,
  fromIso: string
): Promise<WeeklyCycle[]> {
  const snap = await getDocs(
    query(collection(requireDb(), WEEKLY_CYCLES), where('userId', '==', userId))
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<WeeklyCycle, 'id'>), id: d.id }))
    .filter((cycle) => resolveWeekEnd(cycle.weekStart, cycle.weekEnd) >= fromIso)
    .sort((a, b) =>
      resolveWeekEnd(a.weekStart, a.weekEnd).localeCompare(
        resolveWeekEnd(b.weekStart, b.weekEnd)
      )
    );
}
