/**
 * Habits Service
 * CRUD operations for habits collection
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, firebaseError } from '../../config/firebase';
import { Habit, HabitCompletion } from '../../types';

const COLLECTION = 'habits';
const COMPLETIONS_SUBCOLLECTION = 'completions';

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
 * Get all habits for a user
 */
export const listHabits = async (userId: string): Promise<Habit[]> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Habit[];
  } catch (error) {
    console.error('Error listing habits:', error);
    throw error;
  }
};

/**
 * Get a single habit by ID
 */
export const getHabit = async (id: string): Promise<Habit | null> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Habit;
    }

    return null;
  } catch (error) {
    console.error('Error getting habit:', error);
    throw error;
  }
};

/**
 * Create a new habit
 */
export const createHabit = async (
  userId: string,
  data: Omit<Habit, 'id' | 'userId' | 'streak' | 'longestStreak' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const firestore = ensureFirestore();

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required to create a habit');
    }

    // Store both 'name' and 'title' for compatibility with web app
    const name = data.name;
    const habitData = {
      ...data,
      name: name,
      title: name, // Web app compatibility
      userId,
      streak: 0,
      longestStreak: 0,
      bestStreak: 0, // Web app compatibility
      active: data.active !== undefined ? data.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, COLLECTION), habitData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating habit:', error);
    throw error;
  }
};

/**
 * Update an existing habit
 */
export const updateHabit = async (
  id: string,
  data: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

/**
 * Delete a habit
 */
export const deleteHabit = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
};

/**
 * Mark habit as completed for a specific date
 */
export const markHabitComplete = async (
  habitId: string,
  userId: string,
  date: string // YYYY-MM-DD format
): Promise<void> => {
  try {
    const completionRef = doc(db, COLLECTION, habitId, COMPLETIONS_SUBCOLLECTION, date);

    await setDoc(completionRef, {
      habitId,
      userId,
      date,
      completed: true,
      completedAt: serverTimestamp(),
    });

    // Update streak
    await updateHabitStreak(habitId);
  } catch (error) {
    console.error('Error marking habit complete:', error);
    throw error;
  }
};

/**
 * Unmark habit completion for a specific date
 */
export const unmarkHabitComplete = async (
  habitId: string,
  date: string
): Promise<void> => {
  try {
    const completionRef = doc(db, COLLECTION, habitId, COMPLETIONS_SUBCOLLECTION, date);
    await deleteDoc(completionRef);

    // Update streak
    await updateHabitStreak(habitId);
  } catch (error) {
    console.error('Error unmarking habit:', error);
    throw error;
  }
};

/**
 * Get habit completions for a date range
 */
export const getHabitCompletions = async (
  habitId: string,
  startDate?: string,
  endDate?: string
): Promise<HabitCompletion[]> => {
  try {
    const completionsRef = collection(db, COLLECTION, habitId, COMPLETIONS_SUBCOLLECTION);
    const snapshot = await getDocs(completionsRef);

    let completions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as HabitCompletion[];

    // Filter by date range if provided
    if (startDate || endDate) {
      completions = completions.filter((completion) => {
        if (startDate && completion.date < startDate) return false;
        if (endDate && completion.date > endDate) return false;
        return true;
      });
    }

    return completions;
  } catch (error) {
    console.error('Error getting habit completions:', error);
    throw error;
  }
};

/**
 * Update habit streak based on recent completions
 * This is a simplified version - production would be more sophisticated
 */
const updateHabitStreak = async (habitId: string): Promise<void> => {
  try {
    const completions = await getHabitCompletions(habitId);
    const sortedDates = completions
      .map((c) => c.date)
      .sort()
      .reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let expectedDate = new Date();

    for (const dateStr of sortedDates) {
      const completionDate = new Date(dateStr);
      const diffDays = Math.floor(
        (expectedDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0 || diffDays === 1) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        expectedDate = completionDate;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    const maxStreak = Math.max(longestStreak, currentStreak);
    await updateHabit(habitId, {
      streak: currentStreak,
      longestStreak: maxStreak,
      bestStreak: maxStreak, // Web app compatibility
    });
  } catch (error) {
    console.error('Error updating habit streak:', error);
    throw error;
  }
};

/**
 * Check if habit is completed for today
 */
export const isHabitCompletedToday = async (habitId: string): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const completionRef = doc(db, COLLECTION, habitId, COMPLETIONS_SUBCOLLECTION, today);
    const completionSnap = await getDoc(completionRef);

    return completionSnap.exists();
  } catch (error) {
    console.error('Error checking habit completion:', error);
    throw error;
  }
};
