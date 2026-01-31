/**
 * useSubscription Hook
 * Provides real-time subscription status from Firestore
 */

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
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

    setLoading(true);
    setError(null);

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const calculatedStatus = getSubscriptionStatus(userData);
          setStatus(calculatedStatus);
        } else {
          // User document doesn't exist - shouldn't happen but handle gracefully
          setStatus({
            type: 'expired',
            isActive: false,
            canAccessApp: false,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to subscription status:', err);
        setError(err instanceof Error ? err : new Error('Failed to load subscription'));
        setLoading(false);
        // On error, assume access to avoid blocking users incorrectly
        setStatus({
          type: 'trial',
          isActive: true,
          canAccessApp: true,
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
