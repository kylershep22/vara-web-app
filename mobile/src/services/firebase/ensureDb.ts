/**
 * Firestore null guard
 *
 * Firebase initializes at module load time and `db` can be null if config
 * is invalid or initialization fails. Every service function that accesses
 * Firestore must call this guard first.
 *
 * Returns the Firestore instance or throws a descriptive error.
 * For functions that should return empty/default values instead of throwing,
 * check `db` directly with `if (!db) return <default>;`.
 */

import { Firestore } from 'firebase/firestore';
import { db, firebaseError } from '../../config/firebase';

/**
 * Returns the Firestore instance, or throws if not available.
 * Use in write operations where a failure should surface to the user.
 */
export function requireDb(): Firestore {
  if (!db) {
    const msg = firebaseError?.message || 'Firestore is not initialized';
    throw new Error(msg);
  }
  return db;
}

/**
 * Returns the Firestore instance or null.
 * Use in read operations where returning an empty result is acceptable.
 */
export function getDb(): Firestore | null {
  return db;
}
