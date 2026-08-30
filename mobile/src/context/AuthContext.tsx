/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { AppState } from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { stageUserPrivate } from '../services/firebase/userPrivate.service';
import * as SecureStore from 'expo-secure-store';
import { setUserId as setCrashReportingUserId, setUserAttributes, clearUser as clearCrashReportingUser } from '../services/crashReporting.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import { identifyPurchaser, clearPurchaser } from '../services/purchases.service';
import { clearRcEntitlement } from '../services/rcEntitlement';
import { logger } from '../utils/logger';

// Types
interface AuthContextType {
  user: User | null;
  isAuthReady: boolean;
  isLoading: boolean;
  refreshCounter: number;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Listen to auth state changes
  useEffect(() => {
    // If Firebase auth is not initialized, mark as ready immediately
    // This allows the app to continue and show appropriate error screens
    if (!auth) {
      logger.warn('⚠️ Firebase Auth not initialized - AuthContext will not function');
      setIsAuthReady(true);
      return;
    }

    // Safety timeout: if onAuthStateChanged never fires (e.g. Firebase SDK
    // stalls or config is wrong), unblock the app so users see the login
    // screen instead of an indefinite loading spinner.
    let authResolved = false;

    const authTimeout = setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        logger.warn('⚠️ Auth state timeout - unblocking app after 5s');
        setIsAuthReady(true);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      authResolved = true;
      clearTimeout(authTimeout);
      setUser(user);
      setIsAuthReady(true);

      // Safety: reset isLoading when auth state changes (e.g., forced sign-out
      // from token refresh failure). Prevents the login button from staying
      // greyed out if a previous operation left isLoading stuck.
      if (!user) {
        setIsLoading(false);
      }

      // Store user ID in secure storage for offline access
      if (user) {
        try {
          await SecureStore.setItemAsync('userId', user.uid);
        } catch (e) {
          logger.error('Failed to store user ID:', e);
        }

        // Set anonymized user ID in crash reporting (Sentry)
        // Only UID — no PII (email, displayName) sent to crash reporting
        setCrashReportingUserId(user.uid);
        setUserAttributes({ userId: user.uid });

        // No analytics identity call here. The event pipe stamps `userId` on
        // every row by design (the rules gate the collection on ownership), so
        // there is no separate identity to set and nothing to clear on sign-out.

        // Bind RevenueCat to this Firebase UID so webhook events carry
        // app_user_id === uid (the webhook routes on this to update Firestore
        // subscription state). Fire-and-forget; failures are non-fatal.
        void identifyPurchaser(user.uid);
      } else {
        try {
          await SecureStore.deleteItemAsync('userId');
        } catch (e) {
          // Silently fail if key doesn't exist
        }

        // Clear user from crash reporting on logout
        clearCrashReportingUser();

        // Clear RevenueCat identity on sign-out.
        void clearPurchaser();
        // Reset the local entitlement signal so the next session never inherits
        // a stale grant from the previous user (fail-closed).
        clearRcEntitlement();
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Periodic token refresh (every 30 minutes while app is active)
  const tokenRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!auth) return;

    const startTokenRefresh = () => {
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      tokenRefreshRef.current = setInterval(async () => {
        if (auth.currentUser) {
          try {
            await auth.currentUser.getIdToken(true);
          } catch {
            logger.warn('Token refresh failed, signing out');
            signOut(auth).catch(() => {});
          }
        }
      }, 30 * 60 * 1000);
    };

    const handleAppState = (state: string) => {
      if (state === 'active') {
        startTokenRefresh();
      } else if (tokenRefreshRef.current) {
        clearInterval(tokenRefreshRef.current);
        tokenRefreshRef.current = null;
      }
    };

    startTokenRefresh();
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      subscription.remove();
    };
  }, []);

  /**
   * Sign up with email and password
   */
  const signup = async (email: string, password: string, displayName: string) => {
    if (!auth || !db) {
      throw new Error('Firebase is not initialized. Please check your internet connection and restart the app.');
    }

    setIsLoading(true);
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });

      // Create the user's documents in Firestore. ONE BATCH, TWO DOCUMENTS.
      //
      // Subscription state is owned by the onUserCreate Cloud Function trigger
      // (functions/src/auth/onUserCreate.js) — never written from the client.
      // Use merge:true so we don't race-overwrite that trigger's subscription write.
      //
      // `email` moved to userPrivate in migration slice 2: users/{uid} is
      // readable by any authenticated account, so an email address on it is an
      // address book anyone can enumerate. It is now written ONLY to the
      // private document.
      //
      // The batch is not decoration. Two sequential writes could leave an
      // account whose public card exists with no private document behind it —
      // a user with no stored email, which nothing in the app would later
      // notice or repair.
      const uid = userCredential.user.uid;
      const batch = writeBatch(db);

      batch.set(doc(db, 'users', uid), {
        uid,
        displayName: displayName.trim(),
        // MIGRATION_FALLBACK — gate-field dual-write. hasCompletedOnboarding
        // steers AppNavigator's routing, and web clients plus any not-yet-
        // updated mobile build still read it here. Writing it to userPrivate
        // alone would send those clients back through onboarding. Slice 4
        // deletes this line and leaves the userPrivate write below.
        hasCompletedOnboarding: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await stageUserPrivate(batch, uid, {
        email: email.toLowerCase(),
        hasCompletedOnboarding: false,
      });

      await batch.commit();

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Telemetry, after the account and its profile exist and never before: an
      // event for a signup whose profile write failed would be a lie in the
      // funnel. The uid comes off the credential rather than the `user` state,
      // which onAuthStateChanged has not necessarily set yet.
      //
      // Its own try/catch and not awaited. logEvent is built never to throw, but
      // the account is already created by this point and no telemetry defect may
      // be able to fail a signup that succeeded.
      try {
        logEvent(uid, 'sign_up', { method: 'email' });
      } catch {
        // Never the user's problem.
      }

      logger.log('✅ Signup successful, verification email sent, user profile created');
    } catch (error: any) {
      logger.error('❌ Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log in with email and password
   */
  const login = async (email: string, password: string) => {
    if (!auth) {
      // Create a Firebase-like error object so it can be handled properly
      const error = new Error('Firebase is not initialized. Please check your internet connection and restart the app.');
      (error as any).code = 'auth/app-not-authorized';
      logger.error('❌ Login error: Firebase auth not initialized');
      throw error;
    }

    setIsLoading(true);
    try {
      // Wrap signIn with a timeout to prevent the button from staying greyed
      // if the Firebase call hangs (e.g., network issues, corrupted state)
      const LOGIN_TIMEOUT_MS = 15000;
      const signInPromise = signInWithEmailAndPassword(auth, email, password);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error('Login timed out. Please check your connection and try again.');
          (err as any).code = 'auth/timeout';
          reject(err);
        }, LOGIN_TIMEOUT_MS);
      });

      // The credential is bound rather than discarded so the event below has a
      // uid. It cannot come from the `user` state variable or from
      // auth.currentUser: onAuthStateChanged is asynchronous relative to this
      // line, so both still hold the pre-login value here.
      const credential = await Promise.race([signInPromise, timeoutPromise]);

      // Telemetry, after the sign-in resolves. Own try/catch, not awaited: the
      // user is already signed in and analytics must not be able to turn that
      // into a thrown login.
      try {
        logEvent(credential.user.uid, 'login', { method: 'email' });
      } catch {
        // Never the user's problem.
      }

      logger.log('✅ Login successful');
    } catch (error: any) {
      logger.warn('Login error:', error?.code);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out
   */
  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase is not initialized. Please check your internet connection and restart the app.');
    }

    setIsLoading(true);
    try {
      await signOut(auth);
      await SecureStore.deleteItemAsync('userId');
      logger.log('✅ Logout successful');
    } catch (error: any) {
      logger.error('❌ Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Firebase is not initialized. Please check your internet connection and restart the app.');
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      logger.log('✅ Password reset email sent');
    } catch (error: any) {
      logger.error('❌ Password reset error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send email verification to current user
   */
  const sendVerificationEmail = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      logger.log('✅ Verification email sent');
    } catch (error: any) {
      logger.error('❌ Send verification error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data (reload from Firebase)
   */
  const refreshUser = async () => {
    if (!auth) {
      throw new Error('Firebase is not initialized. Please check your internet connection and restart the app.');
    }

    if (auth.currentUser) {
      await auth.currentUser.reload();
      // Get the fresh current user and update state
      const freshUser = auth.currentUser;
      setUser(freshUser);
      // Increment counter to force re-renders in components that depend on user state
      setRefreshCounter(prev => prev + 1);
      logger.log('✅ User refreshed, emailVerified:', freshUser?.emailVerified);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthReady,
    isLoading,
    refreshCounter,
    signup,
    login,
    logout,
    resetPassword,
    sendVerificationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
