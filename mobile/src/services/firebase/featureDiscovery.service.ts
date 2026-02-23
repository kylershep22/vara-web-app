/**
 * Feature Discovery Service
 * Manages the progressive feature discovery system with engagement-based unlocking
 *
 * Design Philosophy: Features unlock through natural engagement milestones.
 * Users never "earn" access — features open organically as they explore.
 */

import { db, firebaseError } from '../../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';

/**
 * Check if Firestore is available
 */
const ensureFirestore = () => {
  if (!db) {
    const errorMessage = firebaseError?.message || 'Firestore is not initialized. Please check your Firebase configuration.';
    throw new Error(errorMessage);
  }
  return db;
};
import { BrainPillar } from '../../constants/featureUnlock';
import {
  DiscoverableFeatureId,
  FeatureDiscoveryState,
  FeatureDiscoveryMap,
  FeatureDiscoveryDocument,
  UserEngagementMetrics,
  PendingUnlockToast,
} from '../../types/featureDiscovery';
import {
  ALL_DISCOVERABLE_FEATURES,
  UNLOCK_TRIGGERS,
  PILLAR_INITIAL_FEATURES,
  DEFAULT_ENGAGEMENT_METRICS,
  initializeFeatureStates,
} from '../../constants/featureDiscovery';

/**
 * Initialize feature discovery for a new user
 * Called after onboarding when pillar is selected
 */
export async function initializeFeatureDiscovery(
  userId: string,
  selectedPillar: BrainPillar
): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    const initialStates = initializeFeatureStates(selectedPillar);

    // Convert to Firestore format
    const firestoreFeatures: FeatureDiscoveryDocument['features'] = {};
    for (const [key, state] of Object.entries(initialStates)) {
      firestoreFeatures[key as DiscoverableFeatureId] = {
        status: state.status,
        unlockedAt: state.unlockedAt ? Timestamp.fromDate(state.unlockedAt) : null,
        toastShown: state.toastShown,
        firstOpenedAt: state.firstOpenedAt ? Timestamp.fromDate(state.firstOpenedAt) : null,
      };
    }

    await updateDoc(userRef, {
      featureDiscovery: {
        features: firestoreFeatures,
        engagement: {
          sessionCount: 1, // First session
          habitsCompleted: 0,
          morningCheckInsCompleted: 0,
          journalEntriesCount: 0,
          goalsCreated: 0,
          breathworkSessionsCount: 0,
          discoverArticlesRead: 0,
          groupsJoined: 0,
          featuresEngaged: [],
          lastActivityAt: serverTimestamp(),
        },
        initializedAt: serverTimestamp(),
        lastEvaluatedAt: null,
      },
      updatedAt: serverTimestamp(),
    });

    console.log(`Initialized feature discovery for user ${userId} with pillar ${selectedPillar}`);
  } catch (error) {
    console.error('Error initializing feature discovery:', error);
    throw error;
  }
}

/**
 * Get feature discovery state from user document
 */
export async function getFeatureDiscoveryState(userId: string): Promise<{
  features: FeatureDiscoveryMap | null;
  engagement: UserEngagementMetrics | null;
} | null> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const discovery = data.featureDiscovery as FeatureDiscoveryDocument | undefined;

    if (!discovery) {
      return null;
    }

    // Convert from Firestore format
    const features: Partial<FeatureDiscoveryMap> = {};
    for (const [key, state] of Object.entries(discovery.features || {})) {
      features[key as DiscoverableFeatureId] = {
        status: state.status,
        unlockedAt: state.unlockedAt?.toDate?.() || null,
        toastShown: state.toastShown,
        firstOpenedAt: state.firstOpenedAt?.toDate?.() || null,
      };
    }

    // Ensure all features have a state (for newly added features)
    for (const featureId of ALL_DISCOVERABLE_FEATURES) {
      if (!features[featureId]) {
        features[featureId] = {
          status: 'upcoming',
          unlockedAt: null,
          toastShown: false,
          firstOpenedAt: null,
        };
      }
    }

    const engagement: UserEngagementMetrics = {
      sessionCount: discovery.engagement?.sessionCount || 0,
      habitsCompleted: discovery.engagement?.habitsCompleted || 0,
      morningCheckInsCompleted: discovery.engagement?.morningCheckInsCompleted || 0,
      journalEntriesCount: discovery.engagement?.journalEntriesCount || 0,
      goalsCreated: discovery.engagement?.goalsCreated || 0,
      breathworkSessionsCount: discovery.engagement?.breathworkSessionsCount || 0,
      discoverArticlesRead: discovery.engagement?.discoverArticlesRead || 0,
      groupsJoined: discovery.engagement?.groupsJoined || 0,
      featuresEngaged: discovery.engagement?.featuresEngaged || [],
      lastActivityAt: discovery.engagement?.lastActivityAt?.toDate?.() || null,
    };

    return {
      features: features as FeatureDiscoveryMap,
      engagement,
    };
  } catch (error) {
    console.error('Error getting feature discovery state:', error);
    return null;
  }
}

/**
 * Track an engagement metric increment
 */
export async function trackEngagementMetric(
  userId: string,
  metric: keyof Omit<UserEngagementMetrics, 'featuresEngaged' | 'lastActivityAt'>,
  incrementBy: number = 1
): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    await updateDoc(userRef, {
      [`featureDiscovery.engagement.${metric}`]: increment(incrementBy),
      'featureDiscovery.engagement.lastActivityAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error tracking engagement metric ${metric}:`, error);
    throw error;
  }
}

/**
 * Track a feature as engaged (used for unlock triggers)
 */
export async function trackFeatureEngaged(
  userId: string,
  featureId: string
): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    await updateDoc(userRef, {
      'featureDiscovery.engagement.featuresEngaged': arrayUnion(featureId),
      'featureDiscovery.engagement.lastActivityAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error tracking feature engaged ${featureId}:`, error);
    throw error;
  }
}

/**
 * Increment session count (call on app foreground)
 */
export async function trackNewSession(userId: string): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    await updateDoc(userRef, {
      'featureDiscovery.engagement.sessionCount': increment(1),
      'featureDiscovery.engagement.lastActivityAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking new session:', error);
    throw error;
  }
}

/**
 * Evaluate unlock triggers and return newly unlocked features
 */
export async function evaluateUnlockTriggers(
  userId: string,
  selectedPillar: BrainPillar | null
): Promise<DiscoverableFeatureId[]> {
  try {
    const state = await getFeatureDiscoveryState(userId);
    if (!state || !state.features || !state.engagement) {
      return [];
    }

    const newlyUnlocked: DiscoverableFeatureId[] = [];
    const updates: Record<string, any> = {};

    // Sort triggers by priority
    const sortedTriggers = [...UNLOCK_TRIGGERS].sort((a, b) => a.priority - b.priority);

    for (const trigger of sortedTriggers) {
      const featureState = state.features[trigger.featureId];

      // Skip if not upcoming (already available or active)
      if (featureState.status !== 'upcoming') {
        continue;
      }

      // Skip if this is an initial feature for the pillar (already handled)
      const initialFeatures = selectedPillar ? PILLAR_INITIAL_FEATURES[selectedPillar] : [];
      if (initialFeatures.includes(trigger.featureId)) {
        continue;
      }

      // Evaluate the trigger
      if (trigger.evaluate(state.engagement, selectedPillar)) {
        newlyUnlocked.push(trigger.featureId);
        updates[`featureDiscovery.features.${trigger.featureId}`] = {
          status: 'available',
          unlockedAt: serverTimestamp(),
          toastShown: false,
          firstOpenedAt: null,
        };
      }
    }

    // Apply updates if any features unlocked
    if (newlyUnlocked.length > 0) {
      const userRef = doc(ensureFirestore(), 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        'featureDiscovery.lastEvaluatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`Unlocked features for user ${userId}:`, newlyUnlocked);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error evaluating unlock triggers:', error);
    return [];
  }
}

/**
 * Mark a feature as opened (transitions available → active)
 */
export async function markFeatureOpened(
  userId: string,
  featureId: DiscoverableFeatureId
): Promise<void> {
  try {
    const state = await getFeatureDiscoveryState(userId);
    if (!state || !state.features) {
      return;
    }

    const featureState = state.features[featureId];

    // Only transition if currently "available"
    if (featureState.status !== 'available') {
      return;
    }

    const userRef = doc(ensureFirestore(), 'users', userId);
    await updateDoc(userRef, {
      [`featureDiscovery.features.${featureId}.status`]: 'active',
      [`featureDiscovery.features.${featureId}.firstOpenedAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`Marked feature ${featureId} as active for user ${userId}`);
  } catch (error) {
    console.error(`Error marking feature ${featureId} as opened:`, error);
    throw error;
  }
}

/**
 * Mark unlock toast as shown
 */
export async function markToastShown(
  userId: string,
  featureId: DiscoverableFeatureId
): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);
    await updateDoc(userRef, {
      [`featureDiscovery.features.${featureId}.toastShown`]: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error marking toast shown for ${featureId}:`, error);
    throw error;
  }
}

/**
 * Get pending toasts (features that are available but toast hasn't been shown)
 */
export function getPendingToasts(features: FeatureDiscoveryMap | null): PendingUnlockToast[] {
  if (!features) return [];

  const pending: PendingUnlockToast[] = [];

  for (const [featureId, state] of Object.entries(features)) {
    if (state.status === 'available' && !state.toastShown && state.unlockedAt) {
      pending.push({
        featureId: featureId as DiscoverableFeatureId,
        queuedAt: state.unlockedAt,
      });
    }
  }

  // Sort by unlock time (oldest first)
  return pending.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());
}

/**
 * Check if a feature is accessible (available or active)
 */
export function isFeatureAccessible(
  featureId: DiscoverableFeatureId,
  features: FeatureDiscoveryMap | null
): boolean {
  if (!features) return true; // Default to accessible if no state
  const state = features[featureId];
  return state.status === 'available' || state.status === 'active';
}

/**
 * Check if a feature is upcoming (preview only)
 */
export function isFeatureUpcoming(
  featureId: DiscoverableFeatureId,
  features: FeatureDiscoveryMap | null
): boolean {
  if (!features) return false; // Default to not upcoming if no state
  return features[featureId]?.status === 'upcoming';
}

/**
 * Get features grouped by status
 */
export function getFeaturesByStatus(
  features: FeatureDiscoveryMap | null
): {
  upcoming: DiscoverableFeatureId[];
  available: DiscoverableFeatureId[];
  active: DiscoverableFeatureId[];
} {
  if (!features) {
    return { upcoming: [], available: [], active: [] };
  }

  const result = {
    upcoming: [] as DiscoverableFeatureId[],
    available: [] as DiscoverableFeatureId[],
    active: [] as DiscoverableFeatureId[],
  };

  for (const [featureId, state] of Object.entries(features)) {
    result[state.status].push(featureId as DiscoverableFeatureId);
  }

  return result;
}

/**
 * Migrate from old feature unlock system to new discovery system
 * Call this when user has old system data but no discovery data
 */
export async function migrateFromOldSystem(
  userId: string,
  selectedPillar: BrainPillar,
  oldUnlockedFeatures: string[]
): Promise<void> {
  try {
    const userRef = doc(ensureFirestore(), 'users', userId);

    // Initialize states based on pillar
    const states = initializeFeatureStates(selectedPillar);

    // Mark old unlocked features as active (user has already used them)
    for (const featureId of oldUnlockedFeatures) {
      if (states[featureId as DiscoverableFeatureId]) {
        states[featureId as DiscoverableFeatureId] = {
          status: 'active',
          unlockedAt: new Date(),
          toastShown: true,
          firstOpenedAt: new Date(),
        };
      }
    }

    // Convert to Firestore format
    const firestoreFeatures: FeatureDiscoveryDocument['features'] = {};
    for (const [key, state] of Object.entries(states)) {
      firestoreFeatures[key as DiscoverableFeatureId] = {
        status: state.status,
        unlockedAt: state.unlockedAt ? Timestamp.fromDate(state.unlockedAt) : null,
        toastShown: state.toastShown,
        firstOpenedAt: state.firstOpenedAt ? Timestamp.fromDate(state.firstOpenedAt) : null,
      };
    }

    await updateDoc(userRef, {
      featureDiscovery: {
        features: firestoreFeatures,
        engagement: {
          sessionCount: 5, // Assume some engagement from old system
          habitsCompleted: 0,
          morningCheckInsCompleted: 0,
          journalEntriesCount: 0,
          goalsCreated: 0,
          breathworkSessionsCount: 0,
          discoverArticlesRead: 0,
          groupsJoined: 0,
          featuresEngaged: oldUnlockedFeatures,
          lastActivityAt: serverTimestamp(),
        },
        initializedAt: serverTimestamp(),
        lastEvaluatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    console.log(`Migrated feature discovery for user ${userId}`);
  } catch (error) {
    console.error('Error migrating to new discovery system:', error);
    throw error;
  }
}
