// src/utils/migrateBedtimeRoutines.js
// Data migration script: bedtimeRoutines → routines collection
// Run this once to migrate existing bedtime routines to the new structure

import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Migrates bedtime routines from old 'bedtimeRoutines' collection
 * to new 'routines' collection with type='bedtime'
 */
export async function migrateBedtimeRoutines() {
  console.log('🔄 Starting bedtime routine migration...');

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // 1. Fetch all existing bedtime routines
    const bedtimeRoutinesSnapshot = await getDocs(collection(db, 'bedtimeRoutines'));
    console.log(`📊 Found ${bedtimeRoutinesSnapshot.size} bedtime routines to migrate`);

    if (bedtimeRoutinesSnapshot.empty) {
      console.log('✅ No bedtime routines to migrate');
      return { success: true, migratedCount: 0, skippedCount: 0, errorCount: 0 };
    }

    // 2. Process each bedtime routine
    for (const doc of bedtimeRoutinesSnapshot.docs) {
      const data = doc.data();
      const userId = data.userId;

      if (!userId) {
        console.warn(`⚠️  Skipping routine ${doc.id} - missing userId`);
        skippedCount++;
        continue;
      }

      try {
        // 3. Check if user already has a bedtime routine in new collection
        const existingRoutineQuery = query(
          collection(db, 'routines'),
          where('userId', '==', userId),
          where('type', '==', 'bedtime'),
          where('active', '==', true)
        );
        const existingRoutines = await getDocs(existingRoutineQuery);

        if (!existingRoutines.empty) {
          console.log(`⏭️  User ${userId} already has a bedtime routine in new collection, skipping`);
          skippedCount++;

          // Still delete the old routine to clean up
          await deleteDoc(doc.ref);
          continue;
        }

        // 4. Create new routine in 'routines' collection
        const newRoutineData = {
          userId: userId,
          name: 'My Bedtime Routine',
          type: 'bedtime',
          activities: data.activities || [],
          active: true,
          reminderTime: data.reminderTime || null,
          createdAt: data.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'routines'), newRoutineData);
        console.log(`✅ Migrated routine for user ${userId}`);
        migratedCount++;

        // 5. Delete old bedtime routine document
        await deleteDoc(doc.ref);
        console.log(`🗑️  Deleted old routine ${doc.id}`);

      } catch (error) {
        console.error(`❌ Error migrating routine ${doc.id}:`, error);
        errorCount++;
      }
    }

    // 6. Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('🎉 Migration complete!\n');

    return {
      success: true,
      migratedCount,
      skippedCount,
      errorCount
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
      migratedCount,
      skippedCount,
      errorCount
    };
  }
}

/**
 * Rollback function - restores bedtimeRoutines from routines collection
 * USE WITH CAUTION - Only if migration needs to be reversed
 */
export async function rollbackMigration() {
  console.log('⏪ Starting rollback...');

  try {
    const bedtimeRoutinesQuery = query(
      collection(db, 'routines'),
      where('type', '==', 'bedtime')
    );
    const snapshot = await getDocs(bedtimeRoutinesQuery);

    console.log(`📊 Found ${snapshot.size} bedtime routines to rollback`);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Recreate in old collection
      await addDoc(collection(db, 'bedtimeRoutines'), {
        userId: data.userId,
        activities: data.activities,
        createdAt: data.createdAt
      });

      // Delete from new collection
      await deleteDoc(doc.ref);
    }

    console.log('✅ Rollback complete');
    return { success: true };

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    return { success: false, error: error.message };
  }
}

// Usage instructions:
//
// 1. Import in a component or create a migration page:
//    import { migrateBedtimeRoutines } from './utils/migrateBedtimeRoutines';
//
// 2. Run the migration:
//    await migrateBedtimeRoutines();
//
// 3. Check the console for results
//
// 4. If something goes wrong, rollback:
//    await rollbackMigration();
