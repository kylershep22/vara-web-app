// src/services/db/onboarding.service.js
// Port of mobile/src/services/firebase/onboarding.service.ts

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const USERS = 'users';

/**
 * Save the Quick Check-in data to user document
 */
export async function saveOnboardingCheckIn(userId, data) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    onboardingCheckIn: {
      energy: data.energy,
      focus: data.focus,
      mood: data.mood,
      timestamp: data.timestamp || new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Save the generated insight to user document
 */
export async function saveOnboardingInsight(userId, insight) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    onboardingInsight: {
      text: insight.text,
      recommendedFocus: insight.recommendedFocus,
      focusExplanation: insight.focusExplanation,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Save the user's selected focus pillar
 */
export async function saveSelectedFocus(userId, focus) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    selectedPillar: focus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Save the completed activity data
 */
export async function saveCompletedActivity(userId, activity) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    completedOnboardingActivity: {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: activity.duration,
      completedAt: activity.completedAt || new Date().toISOString(),
      response: activity.response || null,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId, habitCreated = false) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    hasCompletedOnboarding: true,
    onboardingCompletedAt: serverTimestamp(),
    onboardingHabitCreated: habitCreated,
    updatedAt: serverTimestamp(),
  });
  // Cache locally so ProtectedRoute sees it immediately
  try { sessionStorage.setItem('onboarding_complete', '1'); } catch {}
}

/**
 * Save user's selected values from onboarding
 */
export async function saveSelectedValues(userId, values) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    selectedValues: values,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId) {
  if (!userId) return false;
  // Fast path: if we just completed onboarding this session, skip Firestore read
  try { if (sessionStorage.getItem('onboarding_complete') === '1') return true; } catch {}
  const ref = doc(db, USERS, userId);
  const snap = await getDoc(ref);
  const completed = snap.exists() && snap.data()?.hasCompletedOnboarding === true;
  if (completed) {
    try { sessionStorage.setItem('onboarding_complete', '1'); } catch {}
  }
  return completed;
}

/**
 * Save all onboarding data at once (batch approach)
 */
export async function saveOnboardingState(userId, state) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  const updateData = {
    hasCompletedOnboarding: true,
    onboardingCompletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (state.checkIn) {
    updateData.onboardingCheckIn = {
      energy: state.checkIn.energy,
      focus: state.checkIn.focus,
      mood: state.checkIn.mood,
      timestamp: state.checkIn.timestamp || new Date().toISOString(),
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
      completedAt: state.completedActivity.completedAt || new Date().toISOString(),
      response: state.completedActivity.response || null,
    };
  }

  if (state.habitCreated !== undefined) {
    updateData.onboardingHabitCreated = state.habitCreated;
  }

  await updateDoc(ref, updateData);
}
