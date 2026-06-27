/**
 * Persists the user's Focus preferences (Four-Pillar IA Phase B-3c) on
 * users/{uid}. Follows the focusRhythms.service / onboardingStressRecovery
 * pattern (updateDoc + serverTimestamp on the user doc, nested dot-path fields).
 *
 * Currently just the "Center first" choice (whether to run a short box
 * breathing practice before a focus session). Remembered across sessions, not
 * reset each time. No new collection.
 */
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const USERS_COLLECTION = 'users';

export interface FocusPreferences {
  centerFirst: boolean;
}

const DEFAULTS: FocusPreferences = { centerFirst: false };

function userRef(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, userId);
}

export async function saveFocusPreferences(
  userId: string,
  prefs: FocusPreferences
): Promise<void> {
  await updateDoc(userRef(userId), {
    'focusPreferences.centerFirst': prefs.centerFirst,
    'focusPreferences.updatedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getFocusPreferences(
  userId: string
): Promise<FocusPreferences> {
  const snap = await getDoc(userRef(userId));
  if (!snap.exists()) return { ...DEFAULTS };
  const centerFirst = snap.data()?.focusPreferences?.centerFirst;
  return { centerFirst: centerFirst === true };
}
