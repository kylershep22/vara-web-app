/**
 * Onboarding Service
 * Persistence for onboarding flow data
 *
 * MIGRATION SLICE 2. Every field this module writes is non-allowlist — the
 * check-in carries energy/focus/mood, the insight is an AI-generated wellness
 * narrative, and neither belongs on a document any authenticated account can
 * read. They all now go to userPrivate/{uid}.
 *
 * The two GATE fields are the exception: hasCompletedOnboarding and
 * onboardingCompletedAt are dual-written to users/{uid} as well, because they
 * steer AppNavigator's routing and web clients (plus any not-yet-updated
 * mobile build) still read them there. Writing them privately alone would send
 * those clients back through onboarding. Each dual-write is tagged
 * MIGRATION_FALLBACK; slice 4 deletes the public half.
 */

import { doc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
import { setUserPrivate, stageUserPrivate } from './userPrivate.service';
import { db, firebaseError } from '../../config/firebase';
import {
  OnboardingCheckInData,
  OnboardingInsightResult,
  CompletedOnboardingActivity,
  BrainPillar,
} from '../../types';

const USERS_COLLECTION = 'users';

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

/**
 * Save the Quick Check-in data to user document
 */
export const saveOnboardingCheckIn = async (
  userId: string,
  data: OnboardingCheckInData
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    await setUserPrivate(userId, {
      onboardingCheckIn: {
        energy: data.energy,
        focus: data.focus,
        mood: data.mood,
        timestamp: data.timestamp,
      },
    });

    if (__DEV__) console.log('Onboarding check-in saved for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding check-in:', error);
    throw error;
  }
};

/**
 * Save the generated insight to user document
 */
export const saveOnboardingInsight = async (
  userId: string,
  insight: OnboardingInsightResult
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    await setUserPrivate(userId, {
      onboardingInsight: {
        text: insight.text,
        recommendedFocus: insight.recommendedFocus,
        focusExplanation: insight.focusExplanation,
      },
    });

    if (__DEV__) console.log('Onboarding insight saved for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding insight:', error);
    throw error;
  }
};

/**
 * Save the user's selected focus (may differ from recommended)
 */
export const saveSelectedFocus = async (
  userId: string,
  focus: BrainPillar
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    await setUserPrivate(userId, { selectedPillar: focus });

    if (__DEV__) console.log('Selected focus saved for user:', userId, '- Focus:', focus);
  } catch (error) {
    console.error('Error saving selected focus:', error);
    throw error;
  }
};

/**
 * Save the completed activity data
 */
export const saveCompletedActivity = async (
  userId: string,
  activity: CompletedOnboardingActivity
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    await setUserPrivate(userId, {
      completedOnboardingActivity: {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        duration: activity.duration,
        completedAt: activity.completedAt,
        response: activity.response || null,
      },
    });

    if (__DEV__) console.log('Completed activity saved for user:', userId, '- Activity:', activity.name);
  } catch (error) {
    console.error('Error saving completed activity:', error);
    throw error;
  }
};

/**
 * Mark onboarding as complete
 * Sets hasCompletedOnboarding to true and records completion timestamp
 */
export const completeOnboarding = async (
  userId: string,
  habitCreated: boolean = false
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    const batch = writeBatch(firestore);

    // MIGRATION_FALLBACK — gate-field dual-write. hasCompletedOnboarding and
    // onboardingCompletedAt stay mirrored on users/{uid} until slice 4 so a
    // web session or an old mobile build does not re-run onboarding for a user
    // who has already finished it. onboardingHabitCreated is NOT a gate field
    // and goes private only.
    batch.update(userRef, {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await stageUserPrivate(batch, userId, {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: serverTimestamp() as unknown as Timestamp,
      onboardingHabitCreated: habitCreated,
    });
    await batch.commit();

    if (__DEV__) console.log('Onboarding completed for user:', userId, '- Habit created:', habitCreated);
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
};

/**
 * Save the user's selected values from onboarding Step 5
 */
export const saveSelectedValues = async (
  userId: string,
  values: string[]
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    if (!values || values.length < 2 || values.length > 3) {
      throw new Error('Must select 2 or 3 values');
    }

    await setUserPrivate(userId, { selectedValues: values });

    if (__DEV__) console.log('Selected values saved for user:', userId, '- Values:', values);
  } catch (error) {
    console.error('Error saving selected values:', error);
    throw error;
  }
};

/**
 * Save all onboarding data at once (alternative batch approach)
 * Useful if you want to persist everything at the end instead of incrementally
 */
export const saveOnboardingState = async (
  userId: string,
  state: {
    checkIn?: OnboardingCheckInData;
    insight?: OnboardingInsightResult;
    selectedFocus?: BrainPillar;
    completedActivity?: CompletedOnboardingActivity;
    habitCreated?: boolean;
  }
): Promise<void> => {
  try {
    const firestore = ensureFirestore();

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    const userRef = doc(firestore, USERS_COLLECTION, userId);

    // The private half carries everything; the public half carries only the two
    // gate fields. One batch, so a user can never end up marked complete
    // publicly with none of their onboarding capture stored privately.
    const updateData: Record<string, any> = {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: serverTimestamp(),
    };

    if (state.checkIn) {
      updateData.onboardingCheckIn = {
        energy: state.checkIn.energy,
        focus: state.checkIn.focus,
        mood: state.checkIn.mood,
        timestamp: state.checkIn.timestamp,
      };
    }

    if (state.insight) {
      updateData.onboardingInsight = {
        text: state.insight.text,
        recommendedFocus: state.insight.recommendedFocus,
        focusExplanation: state.insight.focusExplanation,
      };
    }

    if (state.selectedFocus) {
      updateData.selectedPillar = state.selectedFocus;
    }

    if (state.completedActivity) {
      updateData.completedOnboardingActivity = {
        id: state.completedActivity.id,
        name: state.completedActivity.name,
        type: state.completedActivity.type,
        duration: state.completedActivity.duration,
        completedAt: state.completedActivity.completedAt,
        response: state.completedActivity.response || null,
      };
    }

    if (state.habitCreated !== undefined) {
      updateData.onboardingHabitCreated = state.habitCreated;
    }

    const batch = writeBatch(firestore);
    // MIGRATION_FALLBACK — gate-field dual-write, as in completeOnboarding.
    batch.update(userRef, {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: updateData.onboardingCompletedAt,
      updatedAt: serverTimestamp(),
    });
    await stageUserPrivate(batch, userId, updateData);
    await batch.commit();

    if (__DEV__) console.log('Full onboarding state saved for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    throw error;
  }
};
