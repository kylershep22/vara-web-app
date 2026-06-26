/**
 * Persists the user's focus rhythms (Four-Pillar IA Phase B-3c) on
 * users/{uid}. Follows the onboardingStressRecovery.service.ts pattern
 * (updateDoc + serverTimestamp on the user doc, nested dot-path fields).
 *
 * This is a plain user-level capture: an array of time-of-day keys plus an
 * updatedAt. No scores, no counts, no session/protocol rows. Downstream use is
 * out of scope for this slice.
 */
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const USERS_COLLECTION = 'users';

function userRef(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, userId);
}

export async function saveFocusRhythms(
  userId: string,
  windows: string[]
): Promise<void> {
  await updateDoc(userRef(userId), {
    'focusRhythms.windows': windows,
    'focusRhythms.updatedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getFocusRhythms(userId: string): Promise<string[]> {
  const snap = await getDoc(userRef(userId));
  if (!snap.exists()) return [];
  const windows = snap.data()?.focusRhythms?.windows;
  return Array.isArray(windows) ? windows : [];
}
