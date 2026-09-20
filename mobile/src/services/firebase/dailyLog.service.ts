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
import type { DailyCompletionSource, DailyLog, RemoveFamily } from '../../types/models';
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
 *
 * THE PROVENANCE KEYS ARE OFFERED, NOT GUARANTEED (slice 9.1a). A caller may
 * supply `completionSource`, `protocolCellId` and `protocolFamily`, and the
 * SERVICE decides whether they land - see `stampProvenance` below. A caller
 * that supplies them on a write which is not establishing the completion has
 * them dropped, silently and on purpose. `completedAt` is not offered at all:
 * it is service-owned, it is in `stripOwnedKeys`, and there is no honest value
 * a caller could compute for it.
 */
export interface DailyLogInput {
  protocolCompleted?: boolean;
  practiceIds?: string[];
  /** The tier in force for this day (roadmap 3b-i). Omit to leave unchanged. */
  dailyCapacity?: CapacityTier;
  /** The window the user said they had (roadmap 3b-ii-b). Omit to leave unchanged. */
  dailyTimeBudget?: TimeClass;
  /** How the completion was established (9.1a). Kept only when provenance is stamped. */
  completionSource?: DailyCompletionSource;
  /** `ProtocolVariant.id` of the variant the caller RENDERED (9.1a). Never re-derived. */
  protocolCellId?: string;
  /** The Remove family of that variant (9.1a). Absent on Recover and Refocus. */
  protocolFamily?: RemoveFamily;
}

/**
 * The provenance keys, in one place, so the strip below and the stamp further
 * down cannot fall out of step with each other.
 *
 * `completedAt` is NOT here: it never reaches this module from a caller, so
 * there is nothing of it to conditionally keep. It is removed unconditionally
 * by `stripOwnedKeys` and written only by the service.
 */
const CALLER_PROVENANCE_KEYS = [
  'completionSource',
  'protocolCellId',
  'protocolFamily',
] as const;

/**
 * Did the user answer the daily picker for this day?
 *
 * THE ONE DEFINITION. Nothing else may re-derive this: the card gate, the
 * picker's own guard and any later reader all come through here, so the rule
 * lives in exactly one place and changes in exactly one place.
 *
 * KEYED ON THE TIME FIELD, and that is not arbitrary. `dailyCapacity` cannot
 * serve, because for a window on 2026-08-11 - between merges `530cfaa` and
 * `6da51cc`, about seven hours - `markDone` stamped a capacity SEEDED from
 * `capacityInitial` rather than one the user answered. A row written in that
 * window carries a tier its owner never chose, and keying on it would report
 * that day as picked and suppress the morning prompt for it forever.
 *
 * WHETHER ANY SUCH ROW EXISTS IS UNKNOWN AND IS NOT INFERRABLE FROM THIS REPO.
 * It depends on whether a build shipped inside that window, which is deploy
 * state and lives on Kyle's checklist. Nobody has checked. This predicate is
 * built to be CORRECT IF THEY EXIST, which is a tolerated assumption and the
 * cheap direction to be wrong in - not evidence that they do. Corrected in
 * slice 9.1a, which found the previous wording asserting their existence as
 * fact.
 *
 * THE SEED-WRITE ITSELF IS GONE, removed in `504282a` when the daily picker
 * made a pick always precede completion. Nothing has written a capacity from
 * `markDone` since; the confirm is the sole writer of the field. Only an
 * explicit confirm writes a time budget.
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
  // `completedAt` joins them in slice 9.1a. It is not on `DailyLogInput`, so a
  // typed caller cannot offer one; this makes that unconditional rather than
  // dependent on nobody casting past the type, which is the same guarantee the
  // four keys above already have.
  delete safe.completedAt;
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
 *
 * THE SAME PRE-READ IS WHAT MAKES THE PROVENANCE RULE BELOW POSSIBLE, at no
 * extra cost: the stored document is already in hand before anything is
 * written.
 */
export async function upsertDailyLog(
  userId: string,
  date: string,
  input: DailyLogInput
): Promise<void> {
  const id = dailyLogDocId(userId, date);
  const ref = doc(requireDb(), DAILY_LOGS, id);
  const existing = await getDoc(ref);
  const prior = existing.exists() ? existing.data() : undefined;

  // PROVENANCE IS WRITTEN ONLY BY THE WRITE THAT ESTABLISHES THE COMPLETION,
  // and all four fields are governed together: `completedAt`,
  // `completionSource`, `protocolCellId` and `protocolFamily`. Either this
  // write is the one that made the day complete and it may say when, how and
  // against which slot - or it is not, and it may say none of those things.
  //
  // A RULE OVER OBSERVABLE STATE, NOT OVER AN EVENT, because this function has
  // no concept of "a completion happened". It sees a patch and a stored
  // document, and that is all it can reason from.
  //
  // (c) IS THE ONE THAT PROTECTS HISTORICAL ROWS AND IT IS NOT OPTIONAL. A row
  // completed before slice 9.1a carries `protocolCompleted: true` and no
  // provenance at all. Without (c), any later write of `protocolCompleted:
  // true` to that row would stamp TODAY's timestamp, source and protocol onto
  // a completion that happened weeks ago, under a phase, capacity and family
  // the user may since have changed. The fabrication would be indistinguishable
  // from a real record, and the row cannot be repaired once it is wrong.
  //
  // DO NOT DELETE ANY CLAUSE ON THE GROUNDS THAT markDone ALREADY GUARDS IT.
  // `useTodayCard.markDone` returns early on `completed`, so today nothing
  // reaches here twice and (c) never fires in production. That is a property
  // of ONE CALLER AT ONE MOMENT, not a structural guarantee, and 9.1b adds a
  // second surface that can sit open across a change.
  //
  // WHICH CLAUSE DOES THE WORK, STATED SO THE OTHER IS NOT TIDIED AWAY:
  // (c) is load-bearing today. (b) is unreachable through the app - the key is
  // off `DailyLogInput` and `stripOwnedKeys` removes it - and covers a console
  // or Admin SDK write, and any future second writer. A later reader who
  // observes that (b) alone passes must not conclude (c) is redundant; they
  // catch different writes.
  const stampProvenance =
    // (a) this patch is asserting completion
    input.protocolCompleted === true &&
    // (b) nothing has stamped provenance before
    prior?.completedAt === undefined &&
    // (c) the day was not ALREADY complete before this write
    prior?.protocolCompleted !== true;

  const patch = stripOwnedKeys(input);
  if (!stampProvenance) {
    // The caller's provenance keys are DROPPED HERE rather than omitted at the
    // call site, deliberately: the invariant is the service's to hold, and a
    // caller that has to know whether its own write is the establishing one
    // would be re-deriving this rule badly. `completedAt` needs no line - it
    // never arrives, and `stripOwnedKeys` has already removed it.
    for (const key of CALLER_PROVENANCE_KEYS) delete patch[key];
  }

  await setDoc(
    ref,
    {
      ...patch,
      userId,
      date,
      ...(stampProvenance ? { completedAt: serverTimestamp() } : {}),
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
