/**
 * useSubscription Hook
 * Provides real-time subscription status from Firestore
 */

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseError } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  getSubscriptionStatus,
  SubscriptionStatus,
  formatSubscriptionType,
  getSubscriptionDescription,
} from '../utils/subscription';

interface UseSubscriptionResult {
  /** Current subscription status */
  status: SubscriptionStatus | null;
  /** Whether subscription data is still loading */
  loading: boolean;
  /** Any error that occurred while loading */
  error: Error | null;
  /** Formatted subscription type for display */
  formattedType: string;
  /** User-friendly description of subscription */
  description: string;
  /** Force refresh the subscription data */
  refresh: () => void;
}

/**
 * Hook to get real-time subscription status
 * Listens to the user document in Firestore and calculates subscription status
 */
export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if Firebase is properly initialized
    if (!db) {
      console.error('Firestore not initialized - cannot load subscription status');
      setError(firebaseError || new Error('Firestore is not initialized.'));
      setLoading(false);
      // Default to allowing access so the app doesn't block on Firestore failure
      setStatus({
        type: 'trial',
        isActive: true,
        canAccessApp: true,
      });
      return;
    }

    setLoading(true);
    setError(null);

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const calculatedStatus = getSubscriptionStatus(userData);
          // Only update state if the status actually changed to prevent re-render loops
          setStatus((prev) => {
            if (prev && prev.type === calculatedStatus.type && prev.canAccessApp === calculatedStatus.canAccessApp && prev.isActive === calculatedStatus.isActive) {
              return prev;
            }
            return calculatedStatus;
          });
        } else {
          // User document doesn't exist yet - grant access during beta
          setStatus((prev) => {
            if (prev && prev.type === 'trial' && prev.canAccessApp === true) return prev;
            return {
              type: 'trial',
              isActive: true,
              canAccessApp: true,
            };
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to subscription status:', err);
        setError(err instanceof Error ? err : new Error('Failed to load subscription'));
        setLoading(false);
        // On error, default to no access so the paywall is shown
        setStatus({
          type: 'trial',
          isActive: false,
          canAccessApp: false,
        });
      }
    );

    return () => unsubscribe();
  }, [user?.uid, refreshKey]);

  // Computed values for convenience
  const formattedType = status ? formatSubscriptionType(status.type) : '';
  const description = status ? getSubscriptionDescription(status) : '';

  return {
    status,
    loading,
    error,
    formattedType,
    description,
    refresh,
  };
}

export default useSubscription;
