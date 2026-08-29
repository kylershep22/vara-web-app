/**
 * Feature Unlock Service
 * Manages progressive feature unlocking for the "Calm Start" onboarding
 *
 * Design Philosophy: Guide users gradually while always providing an escape hatch.
 * Users can unlock everything at any time.
 */

import { db } from '../../config/firebase';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { setUserPrivate } from './userPrivate.service';
import { getMergedUserData } from './userMigrationRead';
import {
  BrainPillar,
  FeatureId,
  ALL_FEATURES,
  getFeaturesForPillar,
} from '../../constants/featureUnlock';

export interface FeatureUnlockState {
  /** Selected brain pillar from onboarding */
  selectedPillar: BrainPillar | null;
  /** Whether user has unlocked all features manually */
  unlockedAll: boolean;
  /** Timestamp when onboarding was completed */
  onboardingCompletedAt: Date | null;
  /** Timestamp when user unlocked all features (if applicable) */
  unlockedAllAt: Date | null;
}

export interface ComputedFeatureAccess {
  /** List of currently unlocked features */
  unlockedFeatures: FeatureId[];
  /** List of locked features */
  lockedFeatures: FeatureId[];
  /** Current unlock tier (1, 2, or 3) */
  currentTier: 1 | 2 | 3;
  /** Days until next unlock tier (0 if fully unlocked) */
  daysUntilNextUnlock: number;
  /** Days since onboarding started */
  daysSinceStart: number;
  /** Current day (1-14+), used for display */
  currentDay: number;
  /** Whether user can unlock all features */
  canUnlockAll: boolean;
  /** Whether all features are currently unlocked */
  allUnlocked: boolean;
}

/**
 * Get feature unlock state from user document
 */
export async function getFeatureUnlockState(userId: string): Promise<FeatureUnlockState | null> {
  if (!db) return null;
  try {
    // MIGRATION_FALLBACK — the nested `onboarding` map moved to userPrivate in
    // slice 2; users who have not written since still have it on users/{uid}.
    const data = await getMergedUserData(userId);

    if (!data) {
      return null;
    }

    const onboarding = (data.onboarding || {}) as Record<string, any>;

    return {
      selectedPillar: onboarding.selectedPillar || null,
      unlockedAll: onboarding.featureUnlockMode === 'full',
      onboardingCompletedAt: onboarding.completedAt?.toDate?.() || null,
      unlockedAllAt: onboarding.unlockedAllAt?.toDate?.() || null,
    };
  } catch (error) {
    console.error('Error getting feature unlock state:', error);
    return null;
  }
}

/**
 * Set the selected pillar during onboarding
 * This also starts the progressive unlock timer
 */
export async function setSelectedPillar(userId: string, pillar: BrainPillar): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    // Nested object, not dotted paths — see the note in
    // onboardingStressRecovery.service.ts: setDoc(merge) would treat
    // 'onboarding.selectedPillar' as a literal dotted field name. A nested map
    // under merge deep-merges, so sibling keys survive exactly as they did.
    await setUserPrivate(userId, {
      onboarding: {
        selectedPillar: pillar,
        featureUnlockMode: 'progressive',
        completedAt: serverTimestamp() as unknown as Timestamp, // Start the unlock timer
      },
    });
    console.log(`Set selected pillar to ${pillar} for user ${userId}`);
  } catch (error) {
    console.error('Error setting selected pillar:', error);
    throw error;
  }
}

/**
 * Unlock all features for a user
 * This is the "escape hatch" allowing users to skip progressive unlocking
 */
export async function unlockAllFeatures(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    await setUserPrivate(userId, {
      onboarding: {
        featureUnlockMode: 'full',
        unlockedAllAt: serverTimestamp() as unknown as Timestamp,
      },
    });
    console.log(`Unlocked all features for user ${userId}`);
  } catch (error) {
    console.error('Error unlocking all features:', error);
    throw error;
  }
}

/**
 * Compute which features are currently unlocked based on state
 */
export function computeFeatureAccess(state: FeatureUnlockState | null): ComputedFeatureAccess {
  // Default: all features unlocked (for users who haven't done onboarding or have unlocked all)
  if (!state || !state.selectedPillar || state.unlockedAll) {
    const daysSinceStart = state?.onboardingCompletedAt
      ? Math.floor((Date.now() - state.onboardingCompletedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      unlockedFeatures: [...ALL_FEATURES],
      lockedFeatures: [],
      currentTier: 3,
      daysUntilNextUnlock: 0,
      daysSinceStart,
      currentDay: Math.max(1, daysSinceStart + 1),
      canUnlockAll: false, // Already unlocked or no pillar selected
      allUnlocked: true,
    };
  }

  // Calculate days since onboarding (Day 1 = first day)
  const daysSinceStart = state.onboardingCompletedAt
    ? Math.floor((Date.now() - state.onboardingCompletedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const currentDay = Math.max(1, daysSinceStart + 1); // Day 1, 2, 3, etc.

  // Get unlocked features based on pillar and time
  const unlockedFeatures = getFeaturesForPillar(state.selectedPillar, daysSinceStart);
  const lockedFeatures = ALL_FEATURES.filter(f => !unlockedFeatures.includes(f));

  // Determine current tier and days until next unlock
  let currentTier: 1 | 2 | 3;
  let daysUntilNextUnlock: number;

  if (daysSinceStart >= 14) {
    currentTier = 3;
    daysUntilNextUnlock = 0;
  } else if (daysSinceStart >= 7) {
    currentTier = 2;
    daysUntilNextUnlock = 14 - daysSinceStart;
  } else {
    currentTier = 1;
    daysUntilNextUnlock = 7 - daysSinceStart;
  }

  return {
    unlockedFeatures,
    lockedFeatures,
    currentTier,
    daysUntilNextUnlock,
    daysSinceStart,
    currentDay,
    canUnlockAll: true,
    allUnlocked: lockedFeatures.length === 0,
  };
}

/**
 * Check if a specific feature is unlocked
 */
export function isFeatureUnlocked(
  featureId: FeatureId,
  access: ComputedFeatureAccess
): boolean {
  return access.unlockedFeatures.includes(featureId);
}
