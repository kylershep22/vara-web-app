/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { auth, db, firebaseInitialized, firebaseError } from '../config/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { setUserId as setCrashReportingUserId, setUserAttributes, clearUser as clearCrashReportingUser } from '../services/crashReporting.service';
import { setUserId as setAnalyticsUserId, setUserProperties, trackLogin, trackSignup } from '../services/analytics.service';

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
      console.warn('⚠️ Firebase Auth not initialized - AuthContext will not function');
      setIsAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);

      // Store user ID in secure storage for offline access
      if (user) {
        try {
          await SecureStore.setItemAsync('userId', user.uid);
        } catch (e) {
          console.error('Failed to store user ID:', e);
        }

        // Set user ID in crash reporting (Sentry) for crash tracking
        // These will silently fail in development/Expo Go
        setCrashReportingUserId(user.uid);

        // Set user attributes for better crash context
        setUserAttributes({
          email: user.email || 'unknown',
          displayName: user.displayName || 'unknown',
        });

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

    return unsubscribe;
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

      console.log('✅ Signup successful, verification email sent, user profile created');
    } catch (error: any) {
      console.error('❌ Signup error:', error);
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
      console.error('❌ Login error: Firebase auth not initialized');
      throw error;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Track login event (non-blocking, errors caught internally)
      trackLogin('email');

      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login error:', error?.code, error?.message);
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
      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
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
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
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
      console.log('✅ Verification email sent');
    } catch (error: any) {
      console.error('❌ Send verification error:', error);
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
      console.log('✅ User refreshed, emailVerified:', freshUser?.emailVerified);
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
