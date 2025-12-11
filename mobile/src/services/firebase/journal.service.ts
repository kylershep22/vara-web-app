/**
 * Journal Service
 * CRUD operations for journal entries collection
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
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { JournalEntry } from '../../types';

const COLLECTION = 'journalEntries';

/**
 * Get all journal entries for a user
 */
export const listJournalEntries = async (
  userId: string,
  limitCount?: number
): Promise<JournalEntry[]> => {
  try {
    let q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JournalEntry[];
  } catch (error) {
    console.error('Error listing journal entries:', error);
    throw error;
  }
};

/**
 * Get a single journal entry by ID
 */
export const getJournalEntry = async (id: string): Promise<JournalEntry | null> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as JournalEntry;
    }

    return null;
  } catch (error) {
    console.error('Error getting journal entry:', error);
    throw error;
  }
};

/**
 * Create a new journal entry
 */
export const createJournalEntry = async (
  userId: string,
  data: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const entryData = {
      ...data,
      userId,
      tags: data.tags || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION), entryData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
};

/**
 * Update an existing journal entry
 */
export const updateJournalEntry = async (
  id: string,
  data: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    throw error;
  }
};

/**
 * Delete a journal entry
 */
export const deleteJournalEntry = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
};

/**
 * Get journal entries for a specific date range
 */
export const getJournalEntriesByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<JournalEntry[]> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JournalEntry[];
  } catch (error) {
    console.error('Error getting journal entries by date range:', error);
    throw error;
  }
};

/**
 * Get journal entries with a specific mood
 */
export const getJournalEntriesByMood = async (
  userId: string,
  mood: JournalEntry['mood']
): Promise<JournalEntry[]> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('mood', '==', mood),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JournalEntry[];
  } catch (error) {
    console.error('Error getting journal entries by mood:', error);
    throw error;
  }
};

/**
 * Search journal entries by content
 */
export const searchJournalEntries = async (
  userId: string,
  searchTerm: string
): Promise<JournalEntry[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - for production, consider using Algolia or similar
    const entries = await listJournalEntries(userId);

    return entries.filter((entry) =>
      entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching journal entries:', error);
    throw error;
  }
};
