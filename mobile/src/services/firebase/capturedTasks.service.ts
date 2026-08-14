/**
 * capturedTasks — persistence for Task-Batching (TB-2a, the spine slice).
 *
 * Plain owner-scoped collection, the same shape as dayBlocks: ownership lives
 * in the `userId` FIELD, never in the document ID, because a list query
 * evaluates the rule per candidate document and checking the field is what
 * makes `where userId == uid` legal for the caller's own rows and illegal for
 * everyone else's.
 *
 * NOT THE LEGACY `tasks` COLLECTION. That one belongs to the web app, carries
 * `priority` (importance) rather than `demand` (cognitive load), and is frozen.
 * Nothing here reads, writes, or migrates it. See the CapturedTask note in
 * types/models.ts for why the two must never be unified.
 *
 * THE UPDATE PATH LANDED IN TB-2c, closing the gap this header logged in TB-2a.
 * It is built exactly as that note required: CONSTRUCTED FROM AN ALLOWLIST,
 * never spread from the caller's input, so `userId`, `id` and `createdAt` are
 * unreachable from any patch. Writing the requirement down before the function
 * existed is what made both this and the dayBlocks update path safe on arrival.
 *
 * Uses requireDb() throughout, not the raw `if (!db)` guards of the older
 * tasks.service.ts: a write that silently no-ops because Firebase failed to
 * initialize is worse than one that surfaces.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { requireDb } from './ensureDb';
import type { CapturedTask, Demand } from '../../types/models';

const CAPTURED_TASKS = 'capturedTasks';

/**
 * What a caller supplies to capture a task. Identity, ownership and timestamps
 * are the service's to set, so they are absent here by construction.
 *
 * These two fields are the entire entity. If a third ever appears in this
 * interface, check it against the "deliberately absent" list on CapturedTask
 * first — that list is the product fence, not an oversight.
 */
export interface CreateCapturedTaskInput {
  title: string;
  demand: Demand;
}

/** Capture a task. Returns the new document id. */
export async function createCapturedTask(
  userId: string,
  input: CreateCapturedTaskInput
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), CAPTURED_TASKS), {
    userId,
    title: input.title,
    demand: input.demand,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Every task this user has captured and not cleared.
 *
 * DELIBERATELY UNORDERED, AND DELIBERATELY WITHOUT A COMPOSITE INDEX. The query
 * is a bare equality on `userId`, which a single-field index already serves.
 * Grouping by demand and ordering within each group are the screen layer's job
 * (TB-2b), computed client-side.
 *
 * This was chosen, not deferred, for three reasons:
 *   1. The screen has to group client-side regardless — the demand buckets are
 *      not a sort order, and no Firestore query returns them pre-grouped. Once
 *      the rows are in memory, sorting them there costs nothing.
 *   2. An open capture list is small by construction. A user with hundreds of
 *      unresolved captures has a product problem, not a pagination problem.
 *   3. Adding `orderBy('createdAt')` here would require a (userId, createdAt)
 *      composite index, and a missing composite fails against PRODUCTION while
 *      passing every mocked test in this suite — the exact class of bug that
 *      bit dayBlocks and getRecentWeeklyCycles. Not needing one removes the
 *      failure mode and the deploy gate together.
 *
 * If a future query genuinely needs server-side ordering or filtering, that
 * change adds the index THEN, in the same commit, and deploys it before the
 * code that depends on it.
 */
export async function listCapturedTasks(userId: string): Promise<CapturedTask[]> {
  const q = query(
    collection(requireDb(), CAPTURED_TASKS),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  // id LAST: the document id is the identity, and a stale `id` inside the
  // stored data must never win over it.
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<CapturedTask, 'id'>),
    id: d.id,
  }));
}

/**
 * A patch. Only these two fields exist, and that is the entity.
 *
 * There is no `createdAt`, no ownership and no scheduling here because there is
 * nothing else on a CapturedTask to change. If a third key ever appears, check
 * it against the "deliberately absent" list on the type first.
 */
export interface CapturedTaskPatch {
  title?: string;
  demand?: Demand;
}

/**
 * Patch a task.
 *
 * THE PAYLOAD IS CONSTRUCTED FROM AN ALLOWLIST, NEVER SPREAD FROM THE INPUT.
 * That is the whole guard, and it is structural rather than typed: `userId`,
 * `id` and `createdAt` are not READ from `patch` anywhere below, so no caller —
 * typed or not, careless or hostile — can reach them. Spreading `...patch`
 * would undo it in one character, which is why this reads as tediously
 * explicit. Keep it that way. Same reasoning, same shape as updateDayBlock.
 *
 * Only keys the caller actually supplied are written, so retagging a task
 * cannot silently rewrite its title.
 */
export async function updateCapturedTask(
  taskId: string,
  patch: CapturedTaskPatch
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.demand !== undefined) payload.demand = patch.demand;

  payload.updatedAt = serverTimestamp();

  await updateDoc(doc(requireDb(), CAPTURED_TASKS, taskId), payload);
}

/**
 * Clear a task.
 *
 * A HARD DELETE, and that is the model rather than a shortcut. There is no
 * `completed` flag, no cleared list and no history to write to — clearing a
 * task is meant to leave nothing behind. Anything that wants a record of what
 * got done wants a different feature.
 */
export async function deleteCapturedTask(taskId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), CAPTURED_TASKS, taskId));
}
