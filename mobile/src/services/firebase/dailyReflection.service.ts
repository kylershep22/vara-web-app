/**
 * Daily Reflection Service
 * CRUD operations for the dailyReflections Firestore collection.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DailyReflection, DailyReflectionValue } from '../../types';
import { logger } from '../../utils/logger';

const COLLECTION = 'dailyReflections';

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch today's daily reflection for a user.
 */
export const getTodayDailyReflection = async (
  userId: string
): Promise<DailyReflection | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const docId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DailyReflection;
    }
    return null;
  } catch (error) {
    logger.error('Error getting daily reflection:', error);
    return null;
  }
};

/**
 * Save today's daily reflection.
 */
export const saveDailyReflection = async (
  userId: string,
  reflection: DailyReflectionValue
): Promise<DailyReflection> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const docId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, docId);

    await setDoc(docRef, {
      userId,
      date: todayDate,
      reflection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docId,
      userId,
      date: todayDate,
      reflection,
    } as DailyReflection;
  } catch (error) {
    logger.error('Error saving daily reflection:', error);
    throw error;
  }
};
