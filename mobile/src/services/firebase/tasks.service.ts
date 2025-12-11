/**
 * Tasks Service
 * CRUD operations for tasks collection
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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Task } from '../../types';

const COLLECTION = 'tasks';

/**
 * Get all tasks for a user
 */
export const listTasks = async (
  userId: string,
  completedFilter?: boolean
): Promise<Task[]> => {
  try {
    let q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Filter by completed status if specified
    if (completedFilter !== undefined) {
      q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        where('completed', '==', completedFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
  } catch (error) {
    console.error('Error listing tasks:', error);
    throw error;
  }
};

/**
 * Get a single task by ID
 */
export const getTask = async (id: string): Promise<Task | null> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Task;
    }

    return null;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

/**
 * Create a new task
 */
export const createTask = async (
  userId: string,
  data: Omit<Task, 'id' | 'userId' | 'completed' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const taskData = {
      ...data,
      userId,
      completed: false,
      priority: data.priority || 'medium',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION), taskData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (
  id: string,
  data: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

/**
 * Toggle task completion status
 */
export const toggleTaskComplete = async (id: string): Promise<void> => {
  try {
    const task = await getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      completed: !task.completed,
      completedAt: !task.completed ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling task:', error);
    throw error;
  }
};

/**
 * Mark task as complete
 */
export const completeTask = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      completed: true,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
};

/**
 * Mark task as incomplete
 */
export const uncompleteTask = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      completed: false,
      completedAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error uncompleting task:', error);
    throw error;
  }
};
