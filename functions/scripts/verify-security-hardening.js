#!/usr/bin/env node
/**
 * verify-security-hardening.js
 *
 * End-to-end verification of the production security hardening:
 *   V1) onUserCreate auth trigger writes a trial subscription server-side.
 *   V2) Authenticated client write of subscription.type is denied by
 *       firestore.rules (subscription-state lockdown).
 *
 * The script creates a unique test user, runs both checks, and cleans up
 * (deletes the /users/{uid} doc and the Auth user) in a finally block so
 * cleanup runs even on errors.
 *
 * Usage:
 *   node functions/scripts/verify-security-hardening.js
 *
 * Requires:
 *   - Service account JSON at ./serviceAccountKey.json (repo root) OR
 *     GOOGLE_APPLICATION_CREDENTIALS / SERVICE_ACCOUNT_KEY_PATH set to its path.
 *   - EXPO_PUBLIC_FIREBASE_API_KEY (+ MESSAGING_SENDER_ID, APP_ID) available
 *     either in the shell env OR in mobile/.env (auto-loaded by this script).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// 1. Load mobile/.env into process.env (if present) so the user doesn't have
//    to manually export EXPO_PUBLIC_FIREBASE_* vars. Tiny inline parser; no
//    dotenv dependency added.
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

const repoRoot = path.resolve(__dirname, '..', '..');
const loadedEnv = loadEnvFile(path.join(repoRoot, 'mobile', '.env'));

// ---------------------------------------------------------------------------
// 2. Resolve service account key path.
// ---------------------------------------------------------------------------
const serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || process.env.SERVICE_ACCOUNT_KEY_PATH
  || path.resolve(repoRoot, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountKeyPath)) {
  console.error(`[setup] Service account key not found at: ${serviceAccountKeyPath}`);
  console.error('[setup] Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_KEY_PATH,');
  console.error('[setup] or place serviceAccountKey.json at the repo root.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Build the web SDK config from the same source the mobile app uses
//    (mobile/src/config/env.ts). Re-declared rather than imported because
//    this script runs in Node CJS, not Expo/Metro.
// ---------------------------------------------------------------------------
const firebaseWebConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'vara-4a99f.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'vara-4a99f',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'vara-4a99f.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const missing = [];
if (!firebaseWebConfig.apiKey) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
if (!firebaseWebConfig.messagingSenderId) missing.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseWebConfig.appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
if (missing.length) {
  console.error('[setup] Missing required env vars:', missing.join(', '));
  console.error('[setup] Set them in the shell or in mobile/.env, then re-run.');
  if (!loadedEnv) console.error('[setup] (mobile/.env was not found.)');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4. Initialize SDKs.
// ---------------------------------------------------------------------------
const admin = require('firebase-admin');
const { initializeApp: initializeClientApp } = require('firebase/app');
const {
  getAuth: getClientAuth,
  signInWithCustomToken,
  signOut,
} = require('firebase/auth');
const {
  getFirestore: getClientFirestore,
  doc: clientDocRef,
  updateDoc,
} = require('firebase/firestore');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || firebaseWebConfig.projectId,
});

const clientApp = initializeClientApp(firebaseWebConfig, 'verify-security-hardening');
const clientAuth = getClientAuth(clientApp);
const clientDb = getClientFirestore(clientApp);

// ---------------------------------------------------------------------------
// 5. Run verifications + always clean up.
// ---------------------------------------------------------------------------
const testEmail = `verify-${Date.now()}@example.com`;
const testPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);

let testUid = null;
let v1Pass = false;
let v2Pass = false;

(async () => {
  try {
    console.log(`Project: ${firebaseWebConfig.projectId}`);
    console.log(`Test user: ${testEmail}`);

    // ----- V1: onUserCreate trigger writes trial subscription -----
    console.log('\n[V1] Creating test user via admin SDK...');
    const userRecord = await admin.auth().createUser({
      email: testEmail,
      password: testPassword,
    });
    testUid = userRecord.uid;
    console.log(`[V1] Created uid=${testUid}`);

    console.log('[V1] Waiting 5s for onUserCreate trigger to fire...');
    await new Promise((res) => setTimeout(res, 5000));

    const userSnap = await admin.firestore().collection('users').doc(testUid).get();
    if (!userSnap.exists) {
      console.log(`[V1] FAIL — /users/${testUid} does not exist after 5s`);
    } else {
      const data = userSnap.data() || {};
      const subType = data.subscription && data.subscription.type;
      if (subType === 'trial') {
        console.log(`[V1] PASS — subscription.type === 'trial'`);
        v1Pass = true;
      } else {
        console.log(`[V1] FAIL — subscription.type is ${JSON.stringify(subType)}`);
        console.log('[V1] Actual doc:\n' + JSON.stringify(data, null, 2));
      }
    }

    // ----- V2: client write of subscription.type is denied -----
    console.log('\n[V2] Minting custom token + signing in as test user...');
    const customToken = await admin.auth().createCustomToken(testUid);
    await signInWithCustomToken(clientAuth, customToken);
    console.log('[V2] Attempting client updateDoc({ \'subscription.type\': \'premium\' })...');

    try {
      await updateDoc(clientDocRef(clientDb, 'users', testUid), {
        'subscription.type': 'premium',
      });
      console.log('[V2] FAIL — write SUCCEEDED. Subscription lockdown rule is not enforcing.');
    } catch (err) {
      const code = err && err.code;
      const message = err && err.message;
      const isPermissionDenied = code === 'permission-denied'
        || (typeof message === 'string' && /insufficient permissions/i.test(message));
      if (isPermissionDenied) {
        console.log(`[V2] PASS — write denied (code=${code})`);
        v2Pass = true;
      } else {
        console.log('[V2] FAIL — error was not a permission denial');
        console.log(`[V2]   code:    ${code}`);
        console.log(`[V2]   message: ${message}`);
      }
    }
  } catch (err) {
    console.error('\n[ERROR] Unhandled error during verification:');
    console.error(err && err.stack ? err.stack : err);
  } finally {
    console.log('\n[cleanup]');
    try { await signOut(clientAuth); } catch (_) { /* ignore */ }

    if (testUid) {
      try {
        await admin.firestore().collection('users').doc(testUid).delete();
        console.log(`[cleanup] Deleted /users/${testUid}`);
      } catch (e) {
        console.warn(`[cleanup] Failed to delete user doc: ${e && e.message || e}`);
      }
      try {
        await admin.auth().deleteUser(testUid);
        console.log(`[cleanup] Deleted auth user ${testUid}`);
      } catch (e) {
        console.warn(`[cleanup] Failed to delete auth user: ${e && e.message || e}`);
      }
    } else {
      console.log('[cleanup] No test user was created; nothing to clean up.');
    }

    console.log('\n=== Results ===');
    console.log(`V1 onUserCreate trigger writes trial:    ${v1Pass ? 'PASS' : 'FAIL'}`);
    console.log(`V2 client write of subscription denied: ${v2Pass ? 'PASS' : 'FAIL'}`);
    process.exit((v1Pass && v2Pass) ? 0 : 1);
  }
})();
