/**
 * Onboarding Service
 * Persistence for onboarding flow data
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
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

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      onboardingCheckIn: {
        energy: data.energy,
        focus: data.focus,
        mood: data.mood,
        timestamp: data.timestamp,
      },
      updatedAt: serverTimestamp(),
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

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      onboardingInsight: {
        text: insight.text,
        recommendedFocus: insight.recommendedFocus,
        focusExplanation: insight.focusExplanation,
      },
      updatedAt: serverTimestamp(),
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

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      selectedPillar: focus,
      updatedAt: serverTimestamp(),
    });

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

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      completedOnboardingActivity: {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        duration: activity.duration,
        completedAt: activity.completedAt,
        response: activity.response || null,
      },
      updatedAt: serverTimestamp(),
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
    await updateDoc(userRef, {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: serverTimestamp(),
      onboardingHabitCreated: habitCreated,
      updatedAt: serverTimestamp(),
    });

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

    const userRef = doc(firestore, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      selectedValues: values,
      updatedAt: serverTimestamp(),
    });

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
    const updateData: Record<string, any> = {
      hasCompletedOnboarding: true,
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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

    await updateDoc(userRef, updateData);

    if (__DEV__) console.log('Full onboarding state saved for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    throw error;
  }
};
