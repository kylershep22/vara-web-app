/**
 * Offline Queue Service
 * Queues operations when offline and syncs when back online
 * Supports core actions: habits, tasks, journal entries
 *
 * Note: Network detection is simplified - assumes online by default
 * and queues operations that fail due to network errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

const QUEUE_STORAGE_KEY = '@vara_offline_queue';

export type QueuedOperationType = 'create' | 'update' | 'delete';

export interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  collection: string;
  docId?: string; // For update/delete
  data?: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

let isProcessing = false;
let syncListeners: Array<(status: 'syncing' | 'synced' | 'error') => void> = [];

/**
 * Generate unique ID for queued operations
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Load queue from storage
 */
export const loadQueue = async (): Promise<QueuedOperation[]> => {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading offline queue:', error);
    return [];
  }
};

/**
 * Save queue to storage
 */
const saveQueue = async (queue: QueuedOperation[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
};

/**
 * Add operation to queue
 */
export const queueOperation = async (
  type: QueuedOperationType,
  collectionName: string,
  data?: Record<string, any>,
  docId?: string
): Promise<string> => {
  const queue = await loadQueue();
  const operation: QueuedOperation = {
    id: generateId(),
    type,
    collection: collectionName,
    docId,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(operation);
  await saveQueue(queue);

  // Try to process immediately
  processQueue();

  return operation.id;
};

/**
 * Process a single operation
 */
const processOperation = async (operation: QueuedOperation): Promise<boolean> => {
  if (!db) {
    console.warn('Firestore not initialized - cannot process offline queue operation');
    return false;
  }
  try {
    const { type, collection: collectionName, docId, data } = operation;

    switch (type) {
      case 'create':
        if (data) {
          // Replace placeholder timestamps with actual serverTimestamp
          const processedData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await addDoc(collection(db, collectionName), processedData);
        }
        break;

      case 'update':
        if (docId && data) {
          const processedData = {
            ...data,
            updatedAt: serverTimestamp(),
          };
          await updateDoc(doc(db, collectionName, docId), processedData);
        }
        break;

      case 'delete':
        if (docId) {
          await deleteDoc(doc(db, collectionName, docId));
        }
        break;
    }

    return true;
  } catch (error: any) {
    // Check if it's a network error
    if (error.code === 'unavailable' || error.message?.includes('network')) {
      console.log('Network error, will retry later');
      return false;
    }
    console.error('Error processing operation:', error);
    return false;
  }
};

/**
 * Process all queued operations
 */
export const processQueue = async (): Promise<void> => {
  if (isProcessing) return;

  isProcessing = true;
  notifyListeners('syncing');

  try {
    const queue = await loadQueue();

    if (queue.length === 0) {
      notifyListeners('synced');
      return;
    }

    let hasErrors = false;
    const updatedQueue: QueuedOperation[] = [];

    for (const operation of queue) {
      const success = await processOperation(operation);

      if (success) {
        // Operation succeeded, remove from queue
        continue;
      } else {
        // Operation failed
        hasErrors = true;
        operation.retryCount += 1;

        // Keep in queue if under retry limit
        if (operation.retryCount < 5) {
          updatedQueue.push(operation);
        } else {
          console.warn('Operation exceeded retry limit, discarding:', operation);
        }
      }
    }

    await saveQueue(updatedQueue);
    notifyListeners(hasErrors ? 'error' : 'synced');
  } catch (error) {
    console.error('Error processing queue:', error);
    notifyListeners('error');
  } finally {
    isProcessing = false;
  }
};

/**
 * Get pending operations count
 */
export const getPendingCount = async (): Promise<number> => {
  const queue = await loadQueue();
  return queue.length;
};

/**
 * Clear the queue (use with caution)
 */
export const clearQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
};

/**
 * Subscribe to sync status changes
 */
export const subscribeToSync = (
  listener: (status: 'syncing' | 'synced' | 'error') => void
): (() => void) => {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
};

/**
 * Notify all listeners of status change
 */
const notifyListeners = (status: 'syncing' | 'synced' | 'error'): void => {
  syncListeners.forEach((listener) => listener(status));
};

/**
 * Initialize offline queue (process any pending operations)
 */
export const initializeOfflineQueue = (): (() => void) => {
  // Process any pending operations on init
  processQueue();

  // Return a no-op cleanup function
  return () => {};
};

/**
 * Check if network features are available
 * Always returns true in this simplified implementation
 */
export const checkNetworkAvailable = (): boolean => {
  return true;
};

// ============================================
// Helper functions for common operations
// ============================================

/**
 * Queue a habit completion (works offline)
 */
export const queueHabitCompletion = async (
  habitId: string,
  userId: string,
  date: string,
  value: number = 1
): Promise<string> => {
  return queueOperation('create', `habits/${habitId}/completions`, {
    date,
    value,
    userId,
    completedAt: Date.now(),
  });
};

/**
 * Queue creating a task (works offline)
 */
export const queueCreateTask = async (
  userId: string,
  title: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> => {
  return queueOperation('create', 'tasks', {
    userId,
    title,
    completed: false,
    priority,
  });
};

/**
 * Queue task completion toggle (works offline)
 */
export const queueToggleTask = async (
  taskId: string,
  completed: boolean
): Promise<string> => {
  return queueOperation('update', 'tasks', { completed }, taskId);
};

/**
 * Queue journal entry (works offline)
 */
export const queueJournalEntry = async (
  userId: string,
  content: string,
  mood?: number,
  tags?: string[]
): Promise<string> => {
  return queueOperation('create', 'journalEntries', {
    userId,
    content,
    mood,
    tags: tags || [],
    type: 'entry',
  });
};
