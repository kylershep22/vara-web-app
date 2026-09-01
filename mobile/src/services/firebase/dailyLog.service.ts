/**
 * dailyLogs — the DAILY-loop persistence layer.
 *
 * Split out of weeklyCycle.service.ts (journey slice 0). The two loops were
 * entangled in one file: the weekly outcome loop is being retired in later
 * slices while the daily capacity loop survives unchanged, and nothing here
 * may import from the weekly service. That is the whole point of the split.
 * Every symbol below moved verbatim; no behavior changed with the move.
 *
 * One owner-scoped behavioral collection, gated by the rules on the userId
 * FIELD rather than the document ID.
 *
 * MEMBER-PRIVACY PRECONDITION (S17.1): these are rows a coach or employer
 * rollup will aggregate over via Cloud Function, and it must NEVER read them
 * individually. Org membership grants zero read here. Do not add a helper that
 * reads another user's rows; the rules would refuse it anyway.
 *
 * NOT HERE: energyRating (belongs to the derived-energy-window feature, S11).
 * Do not invent it ahead of its slice.
 *
 * Uses requireDb() so the Firestore handle is narrowed to non-null, keeping this
 * module clear of the "Firestore | null is not assignable" errors the raw `db`
 * import produces elsewhere in this directory.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import type { DailyLog } from '../../types/models';
// Type-only import from the engine barrel: erased at compile time, so this does
// NOT wire the weekly engine into the running app.
import type { CapacityTier, TimeClass } from '../../protocolEngine';

const DAILY_LOGS = 'dailyLogs';

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
 * The per-day state a caller supplies.
 *
 * EVERY FIELD IS OPTIONAL, because the writers answer different questions and
 * must not be forced to invent each other's answers. The daily pick writes
 * capacity and time; completion writes the boolean and the practices. `merge:
 * true` means an omitted field leaves whatever is stored alone rather than
 * clearing it, which is what lets the two coexist on one row.
 *
 * `protocolCompleted` in particular MUST stay optional: a pick that had to send
 * `false` would silently un-complete a day the user had already finished, the
 * first time anything re-opened the picker after completion.
 */
export interface DailyLogInput {
  protocolCompleted?: boolean;
  practiceIds?: string[];
  /** The tier in force for this day (roadmap 3b-i). Omit to leave unchanged. */
  dailyCapacity?: CapacityTier;
  /** The window the user said they had (roadmap 3b-ii-b). Omit to leave unchanged. */
  dailyTimeBudget?: TimeClass;
}

/**
 * Did the user answer the daily picker for this day?
 *
 * THE ONE DEFINITION. Nothing else may re-derive this: the card gate, the
 * picker's own guard and any later reader all come through here, so the rule
 * lives in exactly one place and changes in exactly one place.
 *
 * KEYED ON THE TIME FIELD, and that is not arbitrary. `dailyCapacity` cannot
 * serve, because 3b-i's completion write stamps a capacity SEEDED from
 * `capacityInitial` (see useTodayCard.markDone): every day completed since then
 * carries a tier the user never chose, and keying on it would report those days
 * as picked and suppress the morning prompt forever. Only an explicit confirm
 * writes a time budget.
 *
 * THE COUPLING, STATED SO IT CANNOT SURPRISE ANYONE: this is correct only while
 * the time question is MANDATORY in the picker. If a later slice lets the user
 * skip it, or makes the field optional on the write, this predicate silently
 * starts reporting "nobody has ever picked" and the prompt never clears. The
 * fix at that point is an explicit marker (a `pickedAt` timestamp), not a
 * second field checked here.
 */
export function hasPickedToday(log: DailyLog | null | undefined): boolean {
  return !!log?.dailyTimeBudget;
}

/**
 * Strip the fields this module owns from a caller-supplied patch.
 *
 * The Patch types already omit them, so this only bites when a caller casts past
 * the type — but relying on spread order alone leaves a real hole on the UPDATE
 * path: an existing document gets no createdAt from the service, so there is
 * nothing to win the collision and a supplied one would be written. Removing the
 * keys makes the guarantee unconditional rather than accidental.
 *
 * DELIBERATELY DUPLICATED from weeklyCycle.service.ts by journey slice 0, not
 * shared. It was module-private on both sides of the split, and a shared helper
 * would reintroduce the daily-to-weekly edge this slice exists to remove. The
 * two copies are free to diverge as the weekly loop is retired.
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

/**
 * Every day's log from fromDateIso onward, oldest first.
 *
 * Feeds deriveConsistentDays, which counts the completed days in a journey
 * phase (journey slice 1). The range is INCLUSIVE of fromDateIso: a day
 * completed on the day a phase was entered belongs to that phase.
 *
 * NEEDS A COMPOSITE INDEX on (userId ASC, date ASC), added to
 * firestore.indexes.json by the same slice. An equality filter plus a range on
 * a different field is exactly the shape Firestore refuses to serve from the
 * single-field indexes, and the failure is a thrown query at runtime rather
 * than anything a type or a test would catch.
 *
 * The ownership filter is what makes this rule-legal; the range predicate on
 * date is irrelevant to authorization.
 */
export async function getDailyLogsSince(
  userId: string,
  fromDateIso: string
): Promise<DailyLog[]> {
  const snap = await getDocs(
    query(
      collection(requireDb(), DAILY_LOGS),
      where('userId', '==', userId),
      where('date', '>=', fromDateIso),
      orderBy('date', 'asc')
    )
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<DailyLog, 'id'>), id: d.id }));
}
