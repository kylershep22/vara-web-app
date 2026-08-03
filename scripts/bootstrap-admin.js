// scripts/bootstrap-admin.js
const admin = require('firebase-admin');

// Application Default Credentials. Point GOOGLE_APPLICATION_CREDENTIALS at a
// service-account key stored OUTSIDE this repo; never save a key inside it.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
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
