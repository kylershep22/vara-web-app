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
 * As of slice 2 of the migration this is the destination for every
 * non-allowlist field that used to live on users/{uid}: email, push tokens,
 * onboarding capture, consent, feature-discovery state and the rest. Readers
 * reach it through userMigrationRead.ts until slice 4 removes the fallback.
 *
 * Uses requireDb() rather than the raw `db` import so the Firestore handle is
 * narrowed to non-null at the call site — the un-narrowed `db` pattern is what
 * produces the "Firestore | null is not assignable" errors elsewhere in this
 * directory, and this module adds none of them.
 */
import { doc, getDoc, setDoc, serverTimestamp, type WriteBatch } from 'firebase/firestore';
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

export function userPrivateRef(uid: string) {
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
 * Max length of the floor commitment (spec 10.1: "one free-text line, max ~100
 * chars"). Enforced here rather than only in the TextInput so the cap holds for
 * every caller, not just the one screen that happens to set maxLength.
 */
export const FLOOR_COMMITMENT_MAX_CHARS = 100;

/**
 * The user's floor commitment, or null when they have not written one.
 *
 * Collapses the two "no floor yet" states a caller would otherwise have to
 * distinguish by hand — no private document at all, and a document without the
 * field — into the single null the entry guard actually branches on. A stored
 * value that is only whitespace is also null: it is not a commitment.
 */
export async function getFloorCommitment(uid: string): Promise<string | null> {
  const priv = await getUserPrivate(uid);
  const value = priv?.floorCommitment?.trim();
  return value ? value : null;
}

/**
 * Write the floor commitment. Returns the value actually stored, which is the
 * trimmed and capped form rather than the raw input.
 *
 * Rejects an empty commitment instead of storing one: an empty floor reads back
 * as "no floor" through getFloorCommitment, so writing it would put the user in
 * a state where they have completed capture and the guard still sends them
 * back. Callers gate their own submit button; this is the backstop.
 */
export async function setFloorCommitment(uid: string, text: string): Promise<string> {
  // Trim, cap, then trim again: slicing at the cap can leave a trailing space
  // that the first trim had no way to see.
  const value = text.trim().slice(0, FLOOR_COMMITMENT_MAX_CHARS).trim();
  if (!value) {
    throw new Error('Floor commitment cannot be empty.');
  }
  await setUserPrivate(uid, { floorCommitment: value });
  return value;
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

/**
 * Stage a userPrivate patch onto a caller-owned WriteBatch instead of
 * committing it directly.
 *
 * Exists for the sites that must touch BOTH documents in one atomic commit:
 * signup (public profile card + private email), the settings save (allowlist
 * half stays public, the rest is private) and the gate-field dual-writes. Two
 * sequential writes there would leave a half-applied account — an existing
 * user with no email in the private store, or a settings form where the tone
 * saved and the privacy did not.
 *
 * The existence read happens here, BEFORE the commit, for the same reason
 * setUserPrivate does one: a blind createdAt under merge resets the creation
 * time on every subsequent write. The read is outside the atomic unit, which
 * is harmless — worst case a concurrent first write elsewhere means createdAt
 * is stamped twice with near-identical values.
 *
 * Await this before committing the batch. It stages, it does not commit; the
 * caller owns the commit so it can stage its public-document writes too.
 */
export async function stageUserPrivate(
  batch: WriteBatch,
  uid: string,
  patch: UserPrivatePatch
): Promise<void> {
  const ref = userPrivateRef(uid);
  const existing = await getDoc(ref);

  // Same key-stripping guarantee as setUserPrivate; see the comment there.
  const safePatch: Record<string, unknown> = { ...patch };
  delete safePatch.uid;
  delete safePatch.createdAt;
  delete safePatch.updatedAt;

  batch.set(
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
