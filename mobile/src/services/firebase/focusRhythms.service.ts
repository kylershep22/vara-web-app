/**
 * Persists the user's focus rhythms (Four-Pillar IA Phase B-3c) on
 * users/{uid}. Follows the onboardingStressRecovery.service.ts pattern
 * (updateDoc + serverTimestamp on the user doc, nested dot-path fields).
 *
 * This is a plain user-level capture: an array of time-of-day keys plus an
 * updatedAt. No scores, no counts, no session/protocol rows. Downstream use is
 * out of scope for this slice.
 */
import { serverTimestamp, type Timestamp } from 'firebase/firestore';
import { setUserPrivate } from './userPrivate.service';
import { getMergedUserData } from './userMigrationRead';


export async function saveFocusRhythms(
  userId: string,
  windows: string[]
): Promise<void> {
  // userPrivate from migration slice 2. Nested object rather than dotted paths
  // — see the note in focusPreferences.service.
  await setUserPrivate(userId, {
    focusRhythms: { windows, updatedAt: serverTimestamp() as unknown as Timestamp },
  });
}

export async function getFocusRhythms(userId: string): Promise<string[]> {
  // MIGRATION_FALLBACK — userPrivate first, users/{uid} as the fallback.
  const merged = await getMergedUserData(userId);
  if (!merged) return [];
  const rhythms = merged.focusRhythms as { windows?: unknown } | undefined;
  const windows = rhythms?.windows;
  return Array.isArray(windows) ? windows : [];
}
