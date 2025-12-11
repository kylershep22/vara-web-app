/**
 * Goals Service
 * CRUD operations for goals collection
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Goal } from '../../types';

const COLLECTION = 'goals';

/**
 * Get all goals for a user
 */
export const listGoals = async (userId: string): Promise<Goal[]> => {
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
    })) as Goal[];
  } catch (error) {
    console.error('Error listing goals:', error);
    throw error;
  }
};

/**
 * Get a single goal by ID
 */
export const getGoal = async (id: string): Promise<Goal | null> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Goal;
    }

    return null;
  } catch (error) {
    console.error('Error getting goal:', error);
    throw error;
  }
};

/**
 * Create a new goal
 */
export const createGoal = async (
  userId: string,
  data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const goalData = {
      ...data,
      userId,
      progress: data.progress || 0,
      status: data.status || 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION), goalData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
};

/**
 * Update an existing goal
 */
export const updateGoal = async (
  id: string,
  data: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

/**
 * Delete a goal
 */
export const deleteGoal = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

/**
 * Update goal progress
 */
export const updateGoalProgress = async (
  id: string,
  progress: number
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const status = progress >= 100 ? 'completed' : 'active';

    await updateDoc(docRef, {
      progress,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    throw error;
  }
};
