// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { isSupported, getAnalytics } from "firebase/analytics";

// Build config from CRA env vars (keep these in .env*.local; never commit secrets)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize (safe for hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Core services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Cloud Functions (set your region; default us-central1)
const FUNCTIONS_REGION =
  process.env.REACT_APP_FUNCTIONS_REGION || "us-central1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

// Optional: GA4 (only if supported + you provided measurementId)
export let analytics = undefined;
if (
  process.env.NODE_ENV === "production" &&
  process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
) {
  isSupported()
    .then((ok) => {
      if (ok) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      /* ignore analytics init errors */
    });
}

// ---------- Emulator toggle (optional) ----------
// If you want to use local emulators, set REACT_APP_USE_FIREBASE_EMULATORS=true
// in .env.development.local and run `firebase emulators:start`.
if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === "true") {
  // Adjust ports if your emulator config uses different ones
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
    // console.info("[Firebase] Connected to local emulators.");
  } catch {
    // console.warn("[Firebase] Emulator connection failed (already connected?)");
  }
}

export { app };
