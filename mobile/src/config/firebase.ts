/**
 * Firebase Configuration for Mobile App
 * Initialize Firebase services
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './env';

/**
 * Firebase Configuration Object
 */
const firebaseConfig = {
  apiKey: config.firebaseApiKey,
  authDomain: config.firebaseAuthDomain,
  projectId: config.firebaseProjectId,
  storageBucket: config.firebaseStorageBucket,
  messagingSenderId: config.firebaseMessagingSenderId,
  appId: config.firebaseAppId,
};

/**
 * Initialize Firebase App
 * Uses singleton pattern to prevent multiple initializations
 */
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

/**
 * Initialize Firebase Auth with AsyncStorage persistence
 * This ensures auth state persists across app restarts
 */
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  // If auth is already initialized, just get the instance
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

/**
 * Initialize Firestore with offline persistence
 * Enables offline data access and automatic syncing
 */
let db;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  });
} catch (error: any) {
  // If Firestore is already initialized, just get the instance
  if (error.code === 'failed-precondition') {
    db = getFirestore(app);
  } else {
    throw error;
  }
}

/**
 * Initialize Firebase Storage
 */
const storage = getStorage(app);

// Use emulators in development if configured
if (config.useEmulators && __DEV__) {
  const { connectAuthEmulator } = require('firebase/auth');
  const { connectFirestoreEmulator } = require('firebase/firestore');
  const { connectStorageEmulator } = require('firebase/storage');

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('🔧 Using Firebase Emulators');
  } catch (error) {
    console.warn('⚠️ Failed to connect to Firebase Emulators:', error);
  }
}

export { app, auth, db, storage };
