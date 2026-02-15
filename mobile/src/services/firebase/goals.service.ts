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
import { db, firebaseError } from '../../config/firebase';
import { Goal } from '../../types';
import { checkAndSendGoalMilestone } from '../notificationScheduler.service';

const COLLECTION = 'goals';

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
    const firestore = ensureFirestore();

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required to create a goal');
    }

    const goalData = {
      ...data,
      userId,
      progress: data.progress || 0,
      status: data.status || 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, COLLECTION), goalData);
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
    // Get current goal to check previous progress
    const goal = await getGoal(id);
    const previousProgress = goal?.progress || 0;

    const docRef = doc(db, COLLECTION, id);
    const status = progress >= 100 ? 'completed' : 'active';

    await updateDoc(docRef, {
      progress,
      status,
      updatedAt: serverTimestamp(),
    });

    // Check for milestone notifications (25%, 50%, 75%, 100%)
    if (goal?.userId) {
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (previousProgress < milestone && progress >= milestone) {
          try {
            await checkAndSendGoalMilestone(goal.userId, milestone);
          } catch (notifError) {
            console.log('Could not send goal milestone notification:', notifError);
          }
          break; // Only send one notification
        }
      }
    }
  } catch (error) {
    console.error('Error updating goal progress:', error);
    throw error;
  }
};

/**
 * Update goal progress with milestone tracking
 * Returns array of newly completed milestones for celebration triggers
 */
export const updateGoalProgressWithMilestones = async (
  id: string,
  newProgress: number,
  note?: string
): Promise<{ completedMilestones: Goal['milestones'] }> => {
  try {
    const goal = await getGoal(id);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const previousProgress = goal.progress;
    const clampedProgress = Math.min(100, Math.max(0, newProgress));
    const status = clampedProgress >= 100 ? 'completed' : 'active';

    // Find milestones that are newly completed
    const newlyCompletedMilestones: Goal['milestones'] = [];
    const updatedMilestones = goal.milestones?.map((milestone) => {
      const targetProgress = milestone.targetProgress || 0;

      // Check if milestone is newly completed
      if (
        !milestone.completed &&
        targetProgress > 0 &&
        previousProgress < targetProgress &&
        clampedProgress >= targetProgress
      ) {
        newlyCompletedMilestones.push({
          ...milestone,
          completed: true,
          completedAt: Timestamp.now(),
        });

        return {
          ...milestone,
          completed: true,
          completedAt: Timestamp.now(),
        };
      }

      return milestone;
    });

    // Update the goal
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      progress: clampedProgress,
      status,
      milestones: updatedMilestones || [],
      updatedAt: serverTimestamp(),
    });

    // Check for progress milestone notifications (25%, 50%, 75%, 100%)
    if (goal.userId) {
      const progressMilestones = [25, 50, 75, 100];
      for (const milestone of progressMilestones) {
        if (previousProgress < milestone && clampedProgress >= milestone) {
          try {
            await checkAndSendGoalMilestone(goal.userId, milestone);
          } catch (notifError) {
            console.log('Could not send goal milestone notification:', notifError);
          }
          break; // Only send one notification
        }
      }
    }

    return { completedMilestones: newlyCompletedMilestones };
  } catch (error) {
    console.error('Error updating goal progress with milestones:', error);
    throw error;
  }
};

/**
 * Complete a specific milestone
 */
export const completeMilestone = async (
  goalId: string,
  milestoneId: string
): Promise<void> => {
  try {
    const goal = await getGoal(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const updatedMilestones = goal.milestones?.map((milestone) => {
      if (milestone.id === milestoneId && !milestone.completed) {
        return {
          ...milestone,
          completed: true,
          completedAt: Timestamp.now(),
        };
      }
      return milestone;
    });

    // Calculate new progress based on completed milestones
    const completedCount = updatedMilestones?.filter((m) => m.completed).length || 0;
    const totalMilestones = updatedMilestones?.length || 1;
    const newProgress = Math.round((completedCount / totalMilestones) * 100);

    const docRef = doc(db, COLLECTION, goalId);
    await updateDoc(docRef, {
      milestones: updatedMilestones || [],
      progress: newProgress,
      status: newProgress >= 100 ? 'completed' : 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing milestone:', error);
    throw error;
  }
};

/**
 * Add milestones to an existing goal
 */
export const addMilestonesToGoal = async (
  goalId: string,
  milestones: Goal['milestones']
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, goalId);
    await updateDoc(docRef, {
      milestones,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding milestones to goal:', error);
    throw error;
  }
};
