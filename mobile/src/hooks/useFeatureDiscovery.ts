/**
 * useFeatureDiscovery Hook
 * Provides access to the progressive feature discovery system
 *
 * Design Philosophy: Makes it easy for components to check feature
 * accessibility, show previews for upcoming features, and track engagement.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { subscribeMergedUserData } from '../services/firebase/userMigrationRead';
import { db, firebaseError } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  DiscoverableFeatureId,
  FeatureDiscoveryMap,
  FeatureDiscoveryState,
  UserEngagementMetrics,
  PendingUnlockToast,
  UseFeatureDiscoveryReturn,
  FeaturePreviewContent,
  FeatureCardContent,
  UnlockToastContent,
} from '../types/featureDiscovery';
import {
  getFeatureDiscoveryState,
  trackEngagementMetric,
  trackFeatureEngaged as trackFeatureEngagedService,
  evaluateUnlockTriggers,
  markFeatureOpened as markFeatureOpenedService,
  markToastShown as markToastShownService,
  getPendingToasts,
  isFeatureAccessible,
  isFeatureUpcoming,
  getFeaturesByStatus,
} from '../services/firebase/featureDiscovery.service';
import {
  ALL_DISCOVERABLE_FEATURES,
  FEATURE_PREVIEW_CONTENT,
  FEATURE_CARD_CONTENT,
  UNLOCK_TOAST_CONTENT,
  DEFAULT_ENGAGEMENT_METRICS,
  getOrderedUpcomingFeatures,
} from '../constants/featureDiscovery';
import { BrainPillar } from '../constants/featureUnlock';

/**
 * Hook to access and manage feature discovery state
 */
export function useFeatureDiscovery(): UseFeatureDiscoveryReturn {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureDiscoveryMap | null>(null);
  const [engagement, setEngagement] = useState<UserEngagementMetrics | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<BrainPillar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Listen to user document for real-time updates
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    if (!db) {
      console.error('Firestore not initialized:', firebaseError?.message);
      setError(new Error(firebaseError?.message || 'Firestore not initialized'));
      setLoading(false);
      return;
    }

    setLoading(true);

    // MIGRATION_FALLBACK — featureDiscovery and the nested onboarding map moved
    // to userPrivate in slice 2. The merge is DEEP, which matters here: a
    // counter write touches only featureDiscovery.engagement, so a
    // mid-migration user has .features on users/{uid} and .engagement on
    // userPrivate, and a shallow overlay would drop every feature state.
    const unsubscribe = subscribeMergedUserData(
      user.uid,
      (mergedData) => {
        if (mergedData) {
          const data = mergedData as Record<string, any>;
          const discovery = data.featureDiscovery;
          const onboarding = data.onboarding;

          // Get selected pillar
          setSelectedPillar(onboarding?.selectedPillar || null);

          if (discovery?.features) {
            // Convert from Firestore format
            const parsedFeatures: Partial<FeatureDiscoveryMap> = {};
            for (const [key, state] of Object.entries(discovery.features)) {
              const typedState = state as any;
              parsedFeatures[key as DiscoverableFeatureId] = {
                status: typedState.status,
                unlockedAt: typedState.unlockedAt?.toDate?.() || null,
                toastShown: typedState.toastShown,
                firstOpenedAt: typedState.firstOpenedAt?.toDate?.() || null,
              };
            }

            // Ensure all features have a state
            for (const featureId of ALL_DISCOVERABLE_FEATURES) {
              if (!parsedFeatures[featureId]) {
                parsedFeatures[featureId] = {
                  status: 'upcoming',
                  unlockedAt: null,
                  toastShown: false,
                  firstOpenedAt: null,
                };
              }
            }

            setFeatures(parsedFeatures as FeatureDiscoveryMap);

            // Parse engagement metrics
            const engagementData = discovery.engagement;
            setEngagement({
              sessionCount: engagementData?.sessionCount || 0,
              habitsCompleted: engagementData?.habitsCompleted || 0,
              morningCheckInsCompleted: engagementData?.morningCheckInsCompleted || 0,
              journalEntriesCount: engagementData?.journalEntriesCount || 0,
              goalsCreated: engagementData?.goalsCreated || 0,
              breathworkSessionsCount: engagementData?.breathworkSessionsCount || 0,
              discoverArticlesRead: engagementData?.discoverArticlesRead || 0,
              groupsJoined: engagementData?.groupsJoined || 0,
              featuresEngaged: engagementData?.featuresEngaged || [],
              lastActivityAt: engagementData?.lastActivityAt?.toDate?.() || null,
            });
          } else {
            setFeatures(null);
            setEngagement(null);
          }
        } else {
          setFeatures(null);
          setEngagement(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to feature discovery state:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Compute features by status
  const { upcomingFeatures, availableFeatures, activeFeatures } = useMemo(() => {
    const { upcoming, available, active } = getFeaturesByStatus(features);

    // Order upcoming features by pillar relevance
    const orderedUpcoming = selectedPillar && features
      ? getOrderedUpcomingFeatures(selectedPillar, features as Record<DiscoverableFeatureId, FeatureDiscoveryState>)
      : upcoming;

    return {
      upcomingFeatures: orderedUpcoming,
      availableFeatures: available,
      activeFeatures: active,
    };
  }, [features, selectedPillar]);

  // Get pending toasts
  const pendingToasts = useMemo(() => getPendingToasts(features), [features]);

  // Check if a feature is accessible
  const isAccessible = useCallback(
    (featureId: DiscoverableFeatureId): boolean => {
      return isFeatureAccessible(featureId, features);
    },
    [features]
  );

  // Check if a feature is upcoming
  const isUpcoming = useCallback(
    (featureId: DiscoverableFeatureId): boolean => {
      return isFeatureUpcoming(featureId, features);
    },
    [features]
  );

  // Mark a feature as opened
  const markFeatureOpened = useCallback(
    async (featureId: DiscoverableFeatureId): Promise<void> => {
      if (!user?.uid) return;
      await markFeatureOpenedService(user.uid, featureId);
    },
    [user?.uid]
  );

  // Mark a toast as shown
  const markToastShown = useCallback(
    async (featureId: DiscoverableFeatureId): Promise<void> => {
      if (!user?.uid) return;
      await markToastShownService(user.uid, featureId);
    },
    [user?.uid]
  );

  // Evaluate unlock triggers
  const evaluateTriggers = useCallback(async (): Promise<DiscoverableFeatureId[]> => {
    if (!user?.uid) return [];
    return evaluateUnlockTriggers(user.uid, selectedPillar);
  }, [user?.uid, selectedPillar]);

  // Track engagement metric
  const trackEngagement = useCallback(
    async (
      metric: keyof Omit<UserEngagementMetrics, 'featuresEngaged' | 'lastActivityAt'>,
      incrementValue: number = 1
    ): Promise<void> => {
      if (!user?.uid) return;
      await trackEngagementMetric(user.uid, metric, incrementValue);
      // Evaluate triggers after tracking engagement
      await evaluateUnlockTriggers(user.uid, selectedPillar);
    },
    [user?.uid, selectedPillar]
  );

  // Track feature engaged
  const trackFeatureEngaged = useCallback(
    async (featureId: string): Promise<void> => {
      if (!user?.uid) return;
      await trackFeatureEngagedService(user.uid, featureId);
      // Evaluate triggers after tracking engagement
      await evaluateUnlockTriggers(user.uid, selectedPillar);
    },
    [user?.uid, selectedPillar]
  );

  // Get preview content for a feature
  const getPreviewContent = useCallback(
    (featureId: DiscoverableFeatureId): FeaturePreviewContent => {
      return FEATURE_PREVIEW_CONTENT[featureId];
    },
    []
  );

  // Get card content for a feature
  const getCardContent = useCallback(
    (featureId: DiscoverableFeatureId): FeatureCardContent => {
      return FEATURE_CARD_CONTENT[featureId];
    },
    []
  );

  // Get toast content for a feature
  const getToastContent = useCallback(
    (featureId: DiscoverableFeatureId): UnlockToastContent => {
      return UNLOCK_TOAST_CONTENT[featureId];
    },
    []
  );

  return {
    features,
    engagement,
    upcomingFeatures,
    availableFeatures,
    activeFeatures,
    pendingToasts,
    loading,
    error,
    isAccessible,
    isUpcoming,
    markFeatureOpened,
    markToastShown,
    evaluateTriggers,
    trackEngagement,
    trackFeatureEngaged,
    getPreviewContent,
    getCardContent,
    getToastContent,
  };
}

export default useFeatureDiscovery;
