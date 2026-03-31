/**
 * Routine Migration Service
 * Handles migration of Sunday routines to Custom type
 *
 * Per Focus Page Spec Section 5 (Answer to Question 5):
 * Migrate existing Sunday routines to "Custom" type
 */

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Migrate all Sunday routines to Custom type for a specific user
 * This is a one-time migration that should be called when the user
 * first accesses the updated Focus page
 */
export async function migrateSundayToCustom(userId: string): Promise<{
  migrated: number;
  errors: string[];
}> {
  if (!db) throw new Error('Firestore is not initialized');
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Query for all Sunday routines for this user
    const sundayQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', 'sunday')
    );

    const snapshot = await getDocs(sundayQuery);

    if (snapshot.empty) {
      console.log('[RoutineMigration] No Sunday routines to migrate');
      return { migrated: 0, errors: [] };
    }

    // Use batch write for efficiency
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnapshot) => {
      const routineRef = doc(db, 'routines', docSnapshot.id);
      batch.update(routineRef, {
        type: 'custom',
        migratedFrom: 'sunday',
        migratedAt: new Date().toISOString(),
      });
      migrated++;
    });

    await batch.commit();

    console.log(`[RoutineMigration] Migrated ${migrated} Sunday routine(s) to Custom`);
  } catch (error) {
    console.error('[RoutineMigration] Error migrating routines:', error);
    errors.push(`Migration failed: ${error}`);
  }

  return { migrated, errors };
}

/**
 * Migrate all Bedtime routines to Evening type for a specific user
 * This is a one-time migration that should be called when the user
 * first accesses the updated Focus page
 */
export async function migrateBedtimeToEvening(userId: string): Promise<{
  migrated: number;
  errors: string[];
}> {
  if (!db) throw new Error('Firestore is not initialized');
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Query for all Bedtime routines for this user
    const bedtimeQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', 'bedtime')
    );

    const snapshot = await getDocs(bedtimeQuery);

    if (snapshot.empty) {
      console.log('[RoutineMigration] No Bedtime routines to migrate');
      return { migrated: 0, errors: [] };
    }

    // Use batch write for efficiency
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnapshot) => {
      const routineRef = doc(db, 'routines', docSnapshot.id);
      batch.update(routineRef, {
        type: 'evening',
        migratedFrom: 'bedtime',
        migratedAt: serverTimestamp(),
      });
      migrated++;
    });

    await batch.commit();

    console.log(`[RoutineMigration] Migrated ${migrated} Bedtime routine(s) to Evening`);
  } catch (error) {
    console.error('[RoutineMigration] Error migrating bedtime routines:', error);
    errors.push(`Migration failed: ${error}`);
  }

  return { migrated, errors };
}

/**
 * Check if migration is needed for a user
 * Returns true if there are any Sunday or Bedtime routines that haven't been migrated
 */
export async function needsMigration(userId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const sundayQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', 'sunday')
    );

    const sundaySnapshot = await getDocs(sundayQuery);
    if (!sundaySnapshot.empty) return true;

    const bedtimeQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', 'bedtime')
    );

    const bedtimeSnapshot = await getDocs(bedtimeQuery);
    return !bedtimeSnapshot.empty;
  } catch (error) {
    console.error('[RoutineMigration] Error checking migration status:', error);
    return false;
  }
}

/**
 * Run migration if needed
 * Safe to call multiple times - will only migrate if needed
 */
export async function runMigrationIfNeeded(userId: string): Promise<void> {
  if (!db) return;
  const needs = await needsMigration(userId);

  if (needs) {
    console.log('[RoutineMigration] Migration needed, running...');
    const sundayResult = await migrateSundayToCustom(userId);

    if (sundayResult.errors.length > 0) {
      console.warn('[RoutineMigration] Sunday migration completed with errors:', sundayResult.errors);
    }

    const bedtimeResult = await migrateBedtimeToEvening(userId);

    if (bedtimeResult.errors.length > 0) {
      console.warn('[RoutineMigration] Bedtime migration completed with errors:', bedtimeResult.errors);
    }
  }
}
