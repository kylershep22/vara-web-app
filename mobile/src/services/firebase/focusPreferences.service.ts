/**
 * Persists the user's Focus preferences (Four-Pillar IA Phase B-3c) on
 * users/{uid}. Follows the focusRhythms.service / onboardingStressRecovery
 * pattern (updateDoc + serverTimestamp on the user doc, nested dot-path fields).
 *
 * Currently just the "Center first" choice (whether to run a short box
 * breathing practice before a focus session). Remembered across sessions, not
 * reset each time. No new collection.
 */
import { serverTimestamp, type Timestamp } from 'firebase/firestore';
import { setUserPrivate } from './userPrivate.service';
import { getMergedUserData } from './userMigrationRead';


export interface FocusPreferences {
  centerFirst: boolean;
}

const DEFAULTS: FocusPreferences = { centerFirst: false };

export async function saveFocusPreferences(
  userId: string,
  prefs: FocusPreferences
): Promise<void> {
  // userPrivate from migration slice 2. Nested object rather than dotted paths:
  // setDoc(merge) would read 'focusPreferences.centerFirst' as a literal field
  // name containing a dot and drop the real value.
  await setUserPrivate(userId, {
    focusPreferences: {
      centerFirst: prefs.centerFirst,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    },
  });
}

export async function getFocusPreferences(
  userId: string
): Promise<FocusPreferences> {
  // MIGRATION_FALLBACK — userPrivate first, users/{uid} for anyone not yet
  // backfilled by slice 3.
  const merged = await getMergedUserData(userId);
  if (!merged) return { ...DEFAULTS };
  const prefs = merged.focusPreferences as { centerFirst?: boolean } | undefined;
  return { centerFirst: prefs?.centerFirst === true };
}
