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
 * Check if migration is needed for a user
 * Returns true if there are any Sunday routines that haven't been migrated
 */
export async function needsMigration(userId: string): Promise<boolean> {
  try {
    const sundayQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', 'sunday')
    );

    const snapshot = await getDocs(sundayQuery);
    return !snapshot.empty;
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
  const needs = await needsMigration(userId);

  if (needs) {
    console.log('[RoutineMigration] Migration needed, running...');
    const result = await migrateSundayToCustom(userId);

    if (result.errors.length > 0) {
      console.warn('[RoutineMigration] Migration completed with errors:', result.errors);
    }
  }
}
