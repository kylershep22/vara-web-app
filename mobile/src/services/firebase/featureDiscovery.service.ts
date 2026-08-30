/**
 * Feature Discovery Service
 * Manages the progressive feature discovery system with engagement-based unlocking
 *
 * Design Philosophy: Features unlock through natural engagement milestones.
 * Users never "earn" access — features open organically as they explore.
 *
 * MIGRATION SLICE 2 — this state moved from users/{uid} to userPrivate/{uid}.
 *
 * Two mechanical consequences, both deliberate:
 *
 *   1. DOTTED PATHS BECAME NESTED OBJECTS. setDoc(..., {merge:true}) reads a
 *      key like 'featureDiscovery.engagement.sessionCount' as a literal field
 *      name containing dots, so keeping the dotted form would have written
 *      junk and dropped the real value. Nested maps deep-merge under merge:true,
 *      so sibling keys survive as they did under the dotted updateDoc.
 *
 *   2. increment() AND arrayUnion() BECAME READ-MODIFY-WRITE. Those sentinels
 *      apply to whatever is in the document they are written to — and the
 *      private document starts empty, so increment(1) against it would reset a
 *      user's counter to 1 instead of continuing it. Each counter write now
 *      reads the MERGED state (private over public) and writes the resulting
 *      absolute value, which carries the pre-migration count forward intact.
 *      The trade is losing atomic increments; these are per-user, single-device
 *      counters feeding unlock thresholds, so a lost concurrent update would
 *      delay a feature unlock by one action rather than corrupt anything.
 */

import { db, firebaseError } from '../../config/firebase';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { setUserPrivate } from './userPrivate.service';
import { getMergedUserData } from './userMigrationRead';

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

    await setUserPrivate(userId, {
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
      // No `updatedAt` here — the userPrivate store stamps its own on every
      // write and strips a caller-supplied one.
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
    // MIGRATION_FALLBACK — merged read; see the module header.
    const data = await getMergedUserData(userId);

    if (!data) {
      return null;
    }

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
 * MIGRATION_FALLBACK — the merged engagement map (userPrivate over users/{uid}).
 *
 * Every read-modify-write counter goes through this so a user mid-migration
 * continues from the count they actually have rather than from zero. Returns
 * an empty object rather than null when neither document carries engagement
 * yet, so callers can treat "no value" and "value of zero" identically.
 */
async function readMergedEngagement(
  userId: string
): Promise<Record<string, unknown>> {
  const merged = await getMergedUserData(userId);
  const discovery = merged?.featureDiscovery as
    | { engagement?: Record<string, unknown> }
    | undefined;
  return discovery?.engagement ?? {};
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
    // MIGRATION_FALLBACK — read merged so a counter that still lives on
    // users/{uid} continues from its real value instead of restarting at zero.
    const current = await readMergedEngagement(userId);
    const previous = typeof current?.[metric] === 'number' ? (current[metric] as number) : 0;
    await setUserPrivate(userId, {
      featureDiscovery: {
        engagement: {
          [metric]: previous + incrementBy,
          lastActivityAt: serverTimestamp(),
        },
      },
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
    // MIGRATION_FALLBACK — the union is computed here rather than by
    // arrayUnion(), for the same reason the counters are: the sentinel would
    // union against an empty private document and lose the existing list.
    const current = await readMergedEngagement(userId);
    const existing = Array.isArray(current?.featuresEngaged)
      ? (current.featuresEngaged as string[])
      : [];
    if (existing.includes(featureId)) {
      // Already recorded — still stamp activity, but do not rewrite the array.
      await setUserPrivate(userId, {
        featureDiscovery: { engagement: { lastActivityAt: serverTimestamp() } },
      });
      return;
    }
    await setUserPrivate(userId, {
      featureDiscovery: {
        engagement: {
          featuresEngaged: [...existing, featureId],
          lastActivityAt: serverTimestamp(),
        },
      },
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
    // MIGRATION_FALLBACK — read-modify-write, as above.
    const current = await readMergedEngagement(userId);
    const previous =
      typeof current?.sessionCount === 'number' ? (current.sessionCount as number) : 0;
    await setUserPrivate(userId, {
      featureDiscovery: {
        engagement: {
          sessionCount: previous + 1,
          lastActivityAt: serverTimestamp(),
        },
      },
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
    // Keyed by featureId, then nested under featureDiscovery.features on the
    // write below. Was a flat map of dotted field paths before slice 2.
    const unlockedFeatureStates: Record<string, any> = {};

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
        unlockedFeatureStates[trigger.featureId] = {
          status: 'available',
          unlockedAt: serverTimestamp(),
          toastShown: false,
          firstOpenedAt: null,
        };
      }
    }

    // Apply updates if any features unlocked
    if (newlyUnlocked.length > 0) {
      await setUserPrivate(userId, {
        featureDiscovery: {
          features: unlockedFeatureStates,
          lastEvaluatedAt: serverTimestamp(),
        },
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

    await setUserPrivate(userId, {
      featureDiscovery: {
        features: {
          [featureId]: { status: 'active', firstOpenedAt: serverTimestamp() },
        },
      },
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
    await setUserPrivate(userId, {
      featureDiscovery: { features: { [featureId]: { toastShown: true } } },
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

    await setUserPrivate(userId, {
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
      // No `updatedAt` here — the userPrivate store stamps its own on every
      // write and strips a caller-supplied one.
    });

    console.log(`Migrated feature discovery for user ${userId}`);
  } catch (error) {
    console.error('Error migrating to new discovery system:', error);
    throw error;
  }
}
