/**
 * Firebase Configuration for Mobile App
 * Initialize Firebase services
 *
 * IMPORTANT: This module MUST NOT throw exceptions at module load time.
 * All errors are caught and logged, allowing the app to continue.
 */

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { config } from './env';
import { secureStorePersistence } from '../utils/secureStorePersistence';
import { logger } from '../utils/logger';

/**
 * Firebase initialization state
 * Exported so components can check if Firebase is ready
 */
export let firebaseInitialized = false;
export let firebaseError: Error | null = null;

/**
 * Validate Firebase configuration
 * Returns true if valid, false otherwise (NEVER throws)
 */
function validateFirebaseConfig(): boolean {
  try {
    const requiredFields = [
      { key: 'firebaseApiKey', value: config.firebaseApiKey },
      { key: 'firebaseAuthDomain', value: config.firebaseAuthDomain },
      { key: 'firebaseProjectId', value: config.firebaseProjectId },
      { key: 'firebaseStorageBucket', value: config.firebaseStorageBucket },
      { key: 'firebaseMessagingSenderId', value: config.firebaseMessagingSenderId },
      { key: 'firebaseAppId', value: config.firebaseAppId },
    ];

    logger.log('Firebase Configuration Validation:');
    requiredFields.forEach(field => {
      const hasValue = !!(field.value && field.value.trim());
      logger.log(`  - ${field.key}: ${hasValue ? 'SET' : 'MISSING'}`);
    });

    const missingFields = requiredFields.filter(field => {
      const value = field.value;
      return !value || !value.trim();
    }).map(field => field.key);

    if (missingFields.length > 0) {
      const errorMsg = `Missing Firebase configuration fields: ${missingFields.join(', ')}`;
      logger.error('Firebase config validation failed:', errorMsg);
      logger.error('Tip: Ensure EXPO_PUBLIC_* env vars are set in eas.json for production builds');
      firebaseError = new Error(errorMsg);
      return false;
    }

    logger.log('Firebase configuration validated successfully');
    return true;
  } catch (error) {
    logger.error('Firebase validation error:', error);
    firebaseError = error as Error;
    return false;
  }
}

/**
 * Firebase Configuration Object
 */
const firebaseConfig = {
  apiKey: config.firebaseApiKey || '',
  authDomain: config.firebaseAuthDomain || '',
  projectId: config.firebaseProjectId || '',
  storageBucket: config.firebaseStorageBucket || '',
  messagingSenderId: config.firebaseMessagingSenderId || '',
  appId: config.firebaseAppId || '',
};

/**
 * Initialize Firebase App
 * NEVER throws - returns null on error
 */
function initializeFirebaseApp(): FirebaseApp | null {
  try {
    if (!validateFirebaseConfig()) {
      logger.warn('Firebase config invalid, skipping initialization');
      return null;
    }

    if (getApps().length === 0) {
      logger.log('Initializing Firebase app...');
      const app = initializeApp(firebaseConfig);
      logger.log('Firebase app initialized');
      return app;
    } else {
      logger.log('Using existing Firebase app');
      return getApp();
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase app:', error);
    firebaseError = error as Error;
    return null;
  }
}

/**
 * Initialize Firebase Auth
 * NEVER throws - returns null on error
 */
function initializeFirebaseAuth(app: FirebaseApp | null): Auth | null {
  if (!app) {
    logger.warn('Firebase app not initialized, skipping auth');
    return null;
  }

  try {
    logger.log('Initializing Firebase Auth...');
    const authInstance = initializeAuth(app, {
      persistence: secureStorePersistence,
    });
    logger.log('Firebase Auth initialized');
    return authInstance;
  } catch (error: any) {
    // If auth is already initialized, just get the instance
    if (error.code === 'auth/already-initialized') {
      logger.log('Firebase Auth already initialized');
      try {
        return getAuth(app);
      } catch (getError) {
        logger.error('Failed to get existing Auth:', getError);
        firebaseError = getError as Error;
        return null;
      }
    } else {
      logger.error('Failed to initialize Firebase Auth:', error);
      firebaseError = error;
      return null;
    }
  }
}

/**
 * Initialize Firestore
 * NEVER throws - returns null on error
 */
function initializeFirebaseFirestore(app: FirebaseApp | null): Firestore | null {
  if (!app) {
    logger.warn('Firebase app not initialized, skipping Firestore');
    return null;
  }

  try {
    logger.log('Initializing Firestore...');
    const dbInstance = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
    logger.log('Firestore initialized');
    return dbInstance;
  } catch (error: any) {
    // If Firestore is already initialized, just get the instance
    if (error.code === 'failed-precondition') {
      logger.log('Firestore already initialized');
      try {
        return getFirestore(app);
      } catch (getError) {
        logger.error('Failed to get existing Firestore:', getError);
        firebaseError = getError as Error;
        return null;
      }
    } else {
      logger.error('Failed to initialize Firestore:', error);
      firebaseError = error;
      return null;
    }
  }
}

/**
 * Initialize Firebase Storage
 * NEVER throws - returns null on error
 */
function initializeFirebaseStorage(app: FirebaseApp | null): FirebaseStorage | null {
  if (!app) {
    logger.warn('Firebase app not initialized, skipping Storage');
    return null;
  }

  try {
    logger.log('Initializing Firebase Storage...');
    const storageInstance = getStorage(app);
    logger.log('Firebase Storage initialized');
    return storageInstance;
  } catch (error) {
    logger.error('Failed to initialize Firebase Storage:', error);
    firebaseError = error as Error;
    return null;
  }
}

/**
 * Initialize Firebase (safe initialization)
 * This runs at module load time but NEVER throws exceptions
 */
const app = initializeFirebaseApp();
const auth = initializeFirebaseAuth(app);
const db = initializeFirebaseFirestore(app);
const storage = initializeFirebaseStorage(app);

// Mark Firebase as initialized (even if some services failed)
firebaseInitialized = true;

// Use emulators in development if configured
if (config.useEmulators && __DEV__ && app && auth && db && storage) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectAuthEmulator } = require('firebase/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectFirestoreEmulator } = require('firebase/firestore');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectStorageEmulator } = require('firebase/storage');

    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    logger.log('Using Firebase Emulators');
  } catch (error) {
    logger.warn('Failed to connect to Firebase Emulators:', error);
    // Don't set firebaseError for emulator connection failures
  }
}

// Log final status
if (firebaseError) {
  logger.error('Firebase initialization completed with errors:', firebaseError.message);
} else if (app && auth && db && storage) {
  logger.log('Firebase fully initialized successfully');
} else {
  logger.warn('Firebase partially initialized (some services may be unavailable)');
}

export { app, auth, db, storage };
