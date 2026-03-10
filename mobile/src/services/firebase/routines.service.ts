/**
 * Routines Service
 * Firebase operations for routines management
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export type RoutineType = 'morning' | 'bedtime' | 'evening' | 'custom';

export interface Activity {
  id: number;
  name: string;
  duration: number; // minutes
  order: number;
  icon: string;
  color: string;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  type: RoutineType;
  activities: Activity[];
  active: boolean;
  reminderTime: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fetch all routines for a user
 */
export async function fetchUserRoutines(userId: string): Promise<Routine[]> {
  if (!db) return [];
  try {
    const routinesQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(routinesQuery);

    const routines = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Routine[];

    return routines;
  } catch (error) {
    console.error('Error fetching routines:', error);
    throw error;
  }
}

/**
 * Fetch active routine for a specific type
 */
export async function fetchActiveRoutineByType(
  userId: string,
  type: RoutineType
): Promise<Routine | null> {
  if (!db) return null;
  try {
    const routinesQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', type),
      where('active', '==', true)
    );
    const snapshot = await getDocs(routinesQuery);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Routine;
  } catch (error) {
    console.error('Error fetching active routine:', error);
    throw error;
  }
}

/**
 * Create a new routine
 * Automatically deactivates other routines of the same type
 */
export async function createRoutine(
  userId: string,
  routineData: Omit<Routine, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    // First, deactivate all existing routines of the same type
    await deactivateRoutinesOfType(userId, routineData.type);

    // Create the new routine
    const docRef = await addDoc(collection(db, 'routines'), {
      userId,
      ...routineData,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating routine:', error);
    throw error;
  }
}

/**
 * Update an existing routine
 */
export async function updateRoutine(
  routineId: string,
  updates: Partial<Omit<Routine, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const routineRef = doc(db, 'routines', routineId);
    await updateDoc(routineRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating routine:', error);
    throw error;
  }
}

/**
 * Delete a routine
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const routineRef = doc(db, 'routines', routineId);
    await deleteDoc(routineRef);
  } catch (error) {
    console.error('Error deleting routine:', error);
    throw error;
  }
}

/**
 * Deactivate all routines of a specific type for a user
 */
async function deactivateRoutinesOfType(
  userId: string,
  type: RoutineType
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const routinesQuery = query(
      collection(db, 'routines'),
      where('userId', '==', userId),
      where('type', '==', type),
      where('active', '==', true)
    );
    const snapshot = await getDocs(routinesQuery);

    const updatePromises = snapshot.docs.map(docSnap =>
      updateDoc(doc(db, 'routines', docSnap.id), {
        active: false,
        updatedAt: serverTimestamp(),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error deactivating routines:', error);
    throw error;
  }
}

/**
 * Calculate total duration of a routine
 */
export function calculateTotalDuration(activities: Activity[]): number {
  return activities.reduce((total, activity) => total + activity.duration, 0);
}
