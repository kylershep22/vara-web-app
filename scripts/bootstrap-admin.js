// scripts/bootstrap-admin.js
const admin = require('firebase-admin');

// Initialize with application default credentials or service account
const serviceAccount = require('../service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/bootstrap-admin.js <firebase-uid>');
  process.exit(1);
}

(async () => {
  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Successfully set role: 'admin' on user ${uid}`);
  } catch (err) {
    console.error('Error setting admin role:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();
