/**
 * userPrivate/{uid} — the owner-only private store.
 *
 * Reads and writes the singleton private document for a user. Follows the
 * focusRhythms.service / focusPreferences.service shape (a small module owning
 * one document, timestamps stamped server-side), with two deliberate
 * differences:
 *
 *   1. Its own COLLECTION, not a nested field on users/{uid}. That is the whole
 *      point of the store — users/{uid} is readable by any authenticated
 *      account, so privacy cannot be achieved with a nested field. See the
 *      UserPrivate doc comment in types/models.ts.
 *   2. setDoc(..., { merge: true }) rather than updateDoc, because the document
 *      is not created anywhere else. updateDoc would reject the first write on
 *      a user who has never had one.
 *
 * Nothing in the app calls this yet. The foundation slice establishes the
 * store, its rule, its type and this accessor; later slices (onboarding, the
 * weekly-capacity engine) are what actually populate it.
 *
 * Uses requireDb() rather than the raw `db` import so the Firestore handle is
 * narrowed to non-null at the call site — the un-narrowed `db` pattern is what
 * produces the "Firestore | null is not assignable" errors elsewhere in this
 * directory, and this module adds none of them.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireDb } from './ensureDb';
import type { UserPrivate } from '../../types/models';

const COLLECTION = 'userPrivate';

/**
 * The writable surface: everything except the identity and the timestamps.
 * `uid` is the document ID and the timestamps are stamped here, so accepting
 * either from a caller would let it write a value the store is meant to own.
 */
export type UserPrivatePatch = Partial<
  Omit<UserPrivate, 'uid' | 'createdAt' | 'updatedAt'>
>;

function userPrivateRef(uid: string) {
  return doc(requireDb(), COLLECTION, uid);
}

/**
 * Read the user's private document.
 *
 * Returns null when no document exists — which is the normal state for every
 * user until a later slice writes one, not an error. Callers must handle null
 * rather than treating it as a failure.
 */
export async function getUserPrivate(uid: string): Promise<UserPrivate | null> {
  const snap = await getDoc(userPrivateRef(uid));
  if (!snap.exists()) return null;
  // `uid` comes from the argument, not the stored field: the document ID is the
  // authority on ownership, so a document whose stored uid ever disagreed with
  // its ID would still read back correctly here.
  return { ...(snap.data() as Omit<UserPrivate, 'uid'>), uid };
}

/**
 * Upsert fields onto the user's private document.
 *
 * Merges, so a patch touching one field leaves the rest intact. `updatedAt` is
 * stamped on every write; `createdAt` only on the first, which is why this
 * reads before it writes — a blind `createdAt: serverTimestamp()` under merge
 * would silently reset the creation time on every subsequent call.
 */
export async function setUserPrivate(
  uid: string,
  patch: UserPrivatePatch
): Promise<void> {
  const ref = userPrivateRef(uid);
  const existing = await getDoc(ref);

  // Strip the three fields this module owns before merging the patch in.
  // UserPrivatePatch already omits them at the type level, so this only matters
  // when a caller casts past it — but relying on spread order alone would leave
  // a real hole on the UPDATE path: an existing document gets no createdAt from
  // the service, so there is nothing to win the collision and a supplied one
  // would be written. Removing the keys makes the guarantee unconditional
  // instead of accidental.
  const safePatch: Record<string, unknown> = { ...patch };
  delete safePatch.uid;
  delete safePatch.createdAt;
  delete safePatch.updatedAt;

  await setDoc(
    ref,
    {
      ...safePatch,
      uid,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
