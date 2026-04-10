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
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { setUserId as setCrashReportingUserId, setUserAttributes, clearUser as clearCrashReportingUser } from '../services/crashReporting.service';
import { setUserId as setAnalyticsUserId, setUserProperties, trackLogin, trackSignup } from '../services/analytics.service';
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

        // Set user ID in Analytics
        setAnalyticsUserId(user.uid);

        // Set user properties for Analytics
        setUserProperties({
          email_verified: user.emailVerified ? 'true' : 'false',
        });
      } else {
        try {
          await SecureStore.deleteItemAsync('userId');
        } catch (e) {
          // Silently fail if key doesn't exist
        }

        // Clear user from crash reporting and Analytics on logout
        clearCrashReportingUser();
        setAnalyticsUserId('');
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

      // Create user profile document in Firestore with trial subscription
      const userRef = doc(db, 'users', userCredential.user.uid);
      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await setDoc(userRef, {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        displayName: displayName.trim(),
        hasCompletedOnboarding: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Subscription: Start with 7-day free trial
        subscription: {
          type: 'trial',
          trialStartedAt: serverTimestamp(),
          trialExpiresAt: Timestamp.fromDate(trialExpiresAt),
        },
        hasActiveSubscription: true,
        subscriptionType: 'trial',
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Track signup event
      await trackSignup('email');

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

      await Promise.race([signInPromise, timeoutPromise]);

      // Track login event (non-blocking, errors caught internally)
      trackLogin('email');

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
