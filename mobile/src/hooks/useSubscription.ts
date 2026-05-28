/**
 * useSubscription Hook
 *
 * Derives subscription/access status from TWO affirmative sources:
 *   1. Firestore `users/{uid}.subscription` (the durable source of truth),
 *      read in real time via onSnapshot and classified by getSubscriptionStatus.
 *   2. The RevenueCat entitlement signal (rcEntitlement store) — an additional
 *      affirmative signal that updates immediately after a purchase and on app
 *      foreground.
 *
 * Access is granted if EITHER source affirmatively confirms it. If neither does
 * — including Firestore errors, timeouts, a missing user doc, or an uninitialized
 * SDK — access is DENIED (fail-closed). We never default access to true on error.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseError } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  getRcAccess,
  subscribeRcEntitlement,
  refreshRcEntitlement,
} from '../services/rcEntitlement';
import {
  getSubscriptionStatus,
  SubscriptionStatus,
  formatSubscriptionType,
  getSubscriptionDescription,
} from '../utils/subscription';

interface UseSubscriptionResult {
  /** Current subscription status (Firestore combined with the RevenueCat signal) */
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
 * Fail-closed sentinel: no subscription to display (missing doc, Firestore
 * error/timeout, uninitialized SDK). type:'none' — we have nothing to show,
 * distinct from type:'expired' (a real subscription that expired). Referenced
 * by the error, timeout, and no-db paths below.
 */
const NO_ACCESS: SubscriptionStatus = {
  type: 'none',
  isActive: false,
  canAccessApp: false,
};

/** Cheap equality on the fields the route guard and display rely on. */
function sameAccess(a: SubscriptionStatus | null, b: SubscriptionStatus): boolean {
  return (
    !!a &&
    a.type === b.type &&
    a.canAccessApp === b.canAccessApp &&
    a.isActive === b.isActive
  );
}

/**
 * Combine the Firestore-derived status with the RevenueCat signal.
 * Firestore wins when it grants (preserves trial/premium/coaching/event detail).
 * When Firestore denies (or is absent) but RevenueCat affirmatively shows an
 * active entitlement, grant access as premium. Otherwise deny.
 */
function combineStatus(
  fsStatus: SubscriptionStatus | null,
  rcAccess: boolean | null
): SubscriptionStatus | null {
  if (fsStatus?.canAccessApp) return fsStatus;
  if (rcAccess === true) {
    return fsStatus
      ? { ...fsStatus, type: 'premium', isActive: true, canAccessApp: true }
      : { type: 'premium', isActive: true, canAccessApp: true };
  }
  return fsStatus;
}

/**
 * Hook to get real-time subscription status
 */
export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [fsStatus, setFsStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rcAccess, setRcAccess] = useState<boolean | null>(() => getRcAccess());
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    void refreshRcEntitlement();
  }, []);

  // Subscribe to the shared RevenueCat entitlement signal. The store installs a
  // single AppState 'active' listener and reconciles via getCustomerInfo on
  // foreground; every hook instance observes the same value.
  useEffect(() => {
    setRcAccess(getRcAccess());
    const unsubscribe = subscribeRcEntitlement(() => setRcAccess(getRcAccess()));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setFsStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Firestore unavailable — no affirmative Firestore signal. Fail closed;
    // access then depends solely on the RevenueCat signal.
    if (!db) {
      console.error('Firestore not initialized - cannot load subscription status');
      setError(firebaseError || new Error('Firestore is not initialized.'));
      setLoading(false);
      setFsStatus(NO_ACCESS);
      return;
    }

    setLoading(true);
    setError(null);

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const calculated = getSubscriptionStatus(snapshot.data());
          setFsStatus((prev) => (sameAccess(prev, calculated) ? prev : calculated));
        } else {
          // No user document — no affirmative signal. Fail closed.
          setFsStatus((prev) => (sameAccess(prev, NO_ACCESS) ? prev : NO_ACCESS));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to subscription status:', err);
        setError(err instanceof Error ? err : new Error('Failed to load subscription'));
        setLoading(false);
        // Fail closed on error; the RevenueCat signal may still grant access.
        setFsStatus(NO_ACCESS);
      }
    );

    // Timeout: if the listener doesn't fire within 4s, fail closed rather than
    // defaulting to access. The RevenueCat signal can still grant; a real
    // listener result supersedes this once it arrives.
    const timeoutId = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.warn('Subscription listener timeout - failing closed');
          setFsStatus((prev) => prev ?? NO_ACCESS);
          return false;
        }
        return current;
      });
    }, 4000);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user?.uid, refreshKey]);

  const status = useMemo(() => combineStatus(fsStatus, rcAccess), [fsStatus, rcAccess]);

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
