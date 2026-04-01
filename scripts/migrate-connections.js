// scripts/migrate-connections.js
// Migration script to consolidate all connection data into standardized format

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../backend/serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Migrate connections from all collections to standardized format
 */
async function migrateConnections() {
  console.log('🚀 Starting connection migration...\n');

  const stats = {
    connections: { found: 0, migrated: 0, skipped: 0 },
    connectionRequests: { found: 0, migrated: 0, skipped: 0 },
    connectionInvites: { found: 0, migrated: 0, skipped: 0 },
    duplicates: 0,
    errors: 0
  };

  const migratedConnections = new Set(); // Track migrated connections to avoid duplicates

  try {
    // ========== MIGRATE FROM 'connections' collection ==========
    console.log('📦 Migrating from "connections" collection...');
    const connectionsSnap = await db.collection('connections').get();
    stats.connections.found = connectionsSnap.size;

    for (const doc of connectionsSnap.docs) {
      const data = doc.data();

      try {
        // Create connection key for duplicate detection
        const participants = [data.requesterId, data.addresseeId].sort();
        const connectionKey = `${participants[0]}_${participants[1]}`;

        if (migratedConnections.has(connectionKey)) {
          console.log(`  ⚠️  Skipping duplicate: ${connectionKey}`);
          stats.duplicates++;
          stats.connections.skipped++;
          continue;
        }

        // Check if already in correct format
        if (data.requesterId && data.addresseeId && data.participants && data.status) {
          console.log(`  ✓ Already migrated: ${doc.id}`);
          stats.connections.skipped++;
          migratedConnections.add(connectionKey);
          continue;
        }

        // Need to migrate this document
        // Determine requesterId and addresseeId
        let requesterId = data.requesterId || data.fromUserId || data.from || data.a;
        let addresseeId = data.addresseeId || data.toUserId || data.to || data.b;

        // If still undefined, use participants array (if available)
        if (!requesterId && data.participants && data.participants.length >= 2) {
          requesterId = data.participants[0];
          addresseeId = data.participants[1];
          console.log(`  ℹ️  Inferred requester/addressee from participants array`);
        }

        // Convert "active" status to "accepted"
        let status = data.status || 'pending';
        if (status === 'active') {
          status = 'accepted';
          console.log(`  ℹ️  Converted status from "active" to "accepted"`);
        }

        const updates = {
          requesterId,
          addresseeId,
          participants: data.participants || participants,
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Preserve existing fields
        if (!data.createdAt) {
          updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await doc.ref.update(updates);
        console.log(`  ✓ Migrated: ${doc.id}`);
        stats.connections.migrated++;
        migratedConnections.add(connectionKey);
      } catch (error) {
        console.error(`  ✗ Error migrating ${doc.id}:`, error.message);
        stats.errors++;
      }
    }

    // ========== MIGRATE FROM 'connectionRequests' collection ==========
    console.log('\n📦 Migrating from "connectionRequests" collection...');
    const requestsSnap = await db.collection('connectionRequests').get();
    stats.connectionRequests.found = requestsSnap.size;

    for (const doc of requestsSnap.docs) {
      const data = doc.data();

      try {
        const requesterId = data.fromUserId || data.requesterId;
        const addresseeId = data.toUserId || data.addresseeId;

        if (!requesterId || !addresseeId) {
          console.log(`  ⚠️  Skipping invalid document: ${doc.id}`);
          stats.connectionRequests.skipped++;
          continue;
        }

        const participants = [requesterId, addresseeId].sort();
        const connectionKey = `${participants[0]}_${participants[1]}`;

        if (migratedConnections.has(connectionKey)) {
          console.log(`  ⚠️  Skipping duplicate: ${connectionKey}`);
          stats.duplicates++;
          stats.connectionRequests.skipped++;
          continue;
        }

        // Create new document in 'connections' collection
        const newConnection = {
          requesterId,
          addresseeId,
          participants,
          status: data.status || 'pending',
          createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('connections').add(newConnection);
        console.log(`  ✓ Migrated: ${doc.id} → connections`);
        stats.connectionRequests.migrated++;
        migratedConnections.add(connectionKey);

        // Optionally delete from old collection
        // await doc.ref.delete();
      } catch (error) {
        console.error(`  ✗ Error migrating ${doc.id}:`, error.message);
        stats.errors++;
      }
    }

    // ========== MIGRATE FROM 'connectionInvites' collection ==========
    console.log('\n📦 Migrating from "connectionInvites" collection...');
    const invitesSnap = await db.collection('connectionInvites').get();
    stats.connectionInvites.found = invitesSnap.size;

    for (const doc of invitesSnap.docs) {
      const data = doc.data();

      try {
        const requesterId = data.from || data.requesterId;
        const addresseeId = data.to || data.addresseeId;

        if (!requesterId || !addresseeId) {
          console.log(`  ⚠️  Skipping invalid document: ${doc.id}`);
          stats.connectionInvites.skipped++;
          continue;
        }

        const participants = [requesterId, addresseeId].sort();
        const connectionKey = `${participants[0]}_${participants[1]}`;

        if (migratedConnections.has(connectionKey)) {
          console.log(`  ⚠️  Skipping duplicate: ${connectionKey}`);
          stats.duplicates++;
          stats.connectionInvites.skipped++;
          continue;
        }

        // Create new document in 'connections' collection
        const newConnection = {
          requesterId,
          addresseeId,
          participants,
          status: data.status || 'pending',
          createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('connections').add(newConnection);
        console.log(`  ✓ Migrated: ${doc.id} → connections`);
        stats.connectionInvites.migrated++;
        migratedConnections.add(connectionKey);

        // Optionally delete from old collection
        // await doc.ref.delete();
      } catch (error) {
        console.error(`  ✗ Error migrating ${doc.id}:`, error.message);
        stats.errors++;
      }
    }

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION COMPLETE\n');
    console.log('connections collection:');
    console.log(`  Found: ${stats.connections.found}`);
    console.log(`  Migrated: ${stats.connections.migrated}`);
    console.log(`  Skipped: ${stats.connections.skipped}`);
    console.log('\nconnectionRequests collection:');
    console.log(`  Found: ${stats.connectionRequests.found}`);
    console.log(`  Migrated: ${stats.connectionRequests.migrated}`);
    console.log(`  Skipped: ${stats.connectionRequests.skipped}`);
    console.log('\nconnectionInvites collection:');
    console.log(`  Found: ${stats.connectionInvites.found}`);
    console.log(`  Migrated: ${stats.connectionInvites.migrated}`);
    console.log(`  Skipped: ${stats.connectionInvites.skipped}`);
    console.log(`\nDuplicates found: ${stats.duplicates}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(50));

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Verify migrated data in Firestore console');
    console.log('2. Test connection features in the app');
    console.log('3. Once verified, run cleanup script to remove old collections');
    console.log('   (Uncomment delete lines in this script and re-run)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Fix user searchable field
 */
async function fixUserSearchable() {
  console.log('\n🔍 Fixing user searchable field...\n');

  try {
    const usersSnap = await db.collection('users').get();
    let updated = 0;
    let skipped = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // If searchable field is missing or false, set it to true
      if (data.searchable !== true) {
        await doc.ref.update({
          searchable: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ✓ Updated user: ${doc.id} (${data.displayName || data.email})`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n✅ User searchable fix complete:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Already searchable: ${skipped}`);
  } catch (error) {
    console.error('\n❌ User searchable fix failed:', error);
  }
}

// Run migrations
async function main() {
  console.log('🎯 WELLNESS APP - CONNECTION MIGRATION TOOL\n');

  await migrateConnections();
  await fixUserSearchable();

  console.log('\n✨ All done! Exiting...\n');
  process.exit(0);
}

main();
