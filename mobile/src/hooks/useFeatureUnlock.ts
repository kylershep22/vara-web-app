/**
 * useFeatureUnlock Hook
 * Provides access to the feature unlock state and computed access
 *
 * Design Philosophy: Makes it easy for components to check if features
 * are available and to unlock all features when users are ready.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFeatureUnlockState,
  unlockAllFeatures as unlockAllFeaturesService,
  computeFeatureAccess,
  FeatureUnlockState,
  ComputedFeatureAccess,
} from '../services/firebase/featureUnlock.service';
import { FeatureId, BrainPillar, getPillarById } from '../constants/featureUnlock';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface UseFeatureUnlockReturn {
  /** Current feature unlock state */
  state: FeatureUnlockState | null;
  /** Computed feature access (unlocked/locked features, tier, etc.) */
  access: ComputedFeatureAccess;
  /** Whether the hook is still loading */
  loading: boolean;
  /** Check if a specific feature is unlocked */
  isUnlocked: (featureId: FeatureId) => boolean;
  /** Unlock all features (escape hatch) */
  unlockAll: () => Promise<void>;
  /** Selected pillar info */
  selectedPillarInfo: ReturnType<typeof getPillarById> | undefined;
  /** Error state */
  error: Error | null;
}

/**
 * Hook to access and manage feature unlock state
 */
export function useFeatureUnlock(): UseFeatureUnlockReturn {
  const { user } = useAuth();
  const [state, setState] = useState<FeatureUnlockState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Listen to user document for real-time updates
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const onboarding = data.onboarding || {};

          setState({
            selectedPillar: onboarding.selectedPillar || null,
            unlockedAll: onboarding.featureUnlockMode === 'full',
            onboardingCompletedAt: onboarding.completedAt?.toDate?.() || null,
            unlockedAllAt: onboarding.unlockedAllAt?.toDate?.() || null,
          });
        } else {
          setState(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to feature unlock state:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Compute access based on current state
  const access = useMemo(() => computeFeatureAccess(state), [state]);

  // Check if a specific feature is unlocked
  const isUnlocked = useCallback(
    (featureId: FeatureId): boolean => {
      return access.unlockedFeatures.includes(featureId);
    },
    [access.unlockedFeatures]
  );

  // Unlock all features
  const unlockAll = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    await unlockAllFeaturesService(user.uid);
  }, [user?.uid]);

  // Get selected pillar info
  const selectedPillarInfo = useMemo(() => {
    if (!state?.selectedPillar) return undefined;
    return getPillarById(state.selectedPillar);
  }, [state?.selectedPillar]);

  return {
    state,
    access,
    loading,
    isUnlocked,
    unlockAll,
    selectedPillarInfo,
    error,
  };
}

export default useFeatureUnlock;
