// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { isSupported, getAnalytics } from "firebase/analytics";

// Build config from CRA env vars (keep these in .env*.local; never commit secrets)
const firebaseConfig = {
  apiKey: "AIzaSyB_RQJh0cMU3ruEm3vAY1uSKIk7vPlY6lc",
  authDomain: "vara-4a99f.firebaseapp.com",
  projectId: "vara-4a99f",
  storageBucket: "vara-4a99f.firebasestorage.app",
  messagingSenderId: "621980275569",
  appId: "1:621980275569:web:10a8fe77b202ac97575cd0",
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
