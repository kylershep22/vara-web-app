// backend/firebase/firebase.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  // In production (Cloud Run, GCP), use Application Default Credentials.
  // Locally, load the service account key file from backend/.
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(__dirname, '..', 'serviceAccountKey.json');

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // No key file found — use Application Default Credentials (works in GCP)
    admin.initializeApp();
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
