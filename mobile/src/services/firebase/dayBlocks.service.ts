/**
 * dayBlocks — persistence for Time-Blocking (TB-1a, the spine slice).
 *
 * Plain owner-scoped collection: ownership lives in the `userId` FIELD, never
 * in the document ID, because a list query evaluates the rule per candidate
 * document and checking the field is what makes `where userId == uid` legal
 * for the caller's own rows and illegal for everyone else's.
 *
 * EXPORT-CLEAN STORAGE IS THE DESIGN CONSTRAINT HERE. A block persists a real
 * `startAt` instant plus a numeric `durationMinutes`, which is precisely what a
 * calendar event needs, so Phase 2 sync re-derives nothing. A rhythm zone key
 * is NEVER written as the block's time; `suggestedFrom` is provenance only.
 *
 * NO UPDATE AT MVP — a known gap, stated rather than hidden. Editing a block
 * means deleting it and adding another. When an update lands it must stamp
 * `updatedAt` (the field is already written on create for exactly that reason)
 * and must never let `userId`, `id` or `createdAt` be patched.
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
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { requireDb } from './ensureDb';
import type { DayBlock, Demand } from '../../types/models';
import type { FocusRhythmKey } from '../../constants/focusRhythms';

const DAY_BLOCKS = 'dayBlocks';

/**
 * What a caller supplies to create a block. Identity, ownership and timestamps
 * are the service's to set, so they are absent here by construction.
 */
export interface CreateDayBlockInput {
  title: string;
  demand: Demand;
  durationMinutes: number;
  /** The real start instant. Firestore stores a Date as a Timestamp. */
  startAt: Date;
  isProtected: boolean;
  /** Set only when the user accepted a rhythm suggestion. Provenance only. */
  suggestedFrom?: FocusRhythmKey;
}

/** Create a block. Returns the new document id. */
export async function createDayBlock(
  userId: string,
  input: CreateDayBlockInput
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), DAY_BLOCKS), {
    userId,
    title: input.title,
    demand: input.demand,
    durationMinutes: input.durationMinutes,
    startAt: input.startAt,
    isProtected: input.isProtected,
    // SPREAD, NOT `suggestedFrom: input.suggestedFrom`. Firestore rejects an
    // explicit `undefined` field value, so the key has to be absent rather than
    // unset when no suggestion was accepted.
    ...(input.suggestedFrom ? { suggestedFrom: input.suggestedFrom } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Every block starting within [start, end], oldest first.
 *
 * The day view's only read. Bounds are inclusive on both ends, and the caller
 * owns the window — this service has no opinion about where a day begins,
 * which keeps the user's start-day anchor out of the persistence layer.
 *
 * REQUIRES A COMPOSITE INDEX (dayBlocks: userId ASC, startAt ASC): an equality
 * filter plus a range on a different field cannot be served by single-field
 * indexes. It is added in firestore.indexes.json alongside this slice, and
 * mirrors the existing focusSessions (userId, startedAt) entry. Without it this
 * call fails against production while passing every mocked test here.
 */
export async function listDayBlocksBetween(
  userId: string,
  start: Date,
  end: Date
): Promise<DayBlock[]> {
  const q = query(
    collection(requireDb(), DAY_BLOCKS),
    where('userId', '==', userId),
    where('startAt', '>=', start),
    where('startAt', '<=', end),
    orderBy('startAt', 'asc')
  );
  const snap = await getDocs(q);
  // id LAST: the document id is the identity, and a stale `id` inside the
  // stored data must never win over it.
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<DayBlock, 'id'>),
    id: d.id,
  }));
}

/** Remove a block. The only way to change one at MVP; see the no-update note. */
export async function deleteDayBlock(blockId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), DAY_BLOCKS, blockId));
}
