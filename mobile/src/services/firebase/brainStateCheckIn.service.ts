/**
 * Brain State Check-In Service
 * CRUD operations for the brainStateCheckIns Firestore collection.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BrainState, BrainStateCheckIn } from '../../types';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { logger } from '../../utils/logger';

const COLLECTION = 'brainStateCheckIns';

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch today's brain state check-in for a user.
 * Returns null if no check-in exists for today.
 */
export const getTodayBrainStateCheckIn = async (
  userId: string
): Promise<BrainStateCheckIn | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BrainStateCheckIn;
    }
    return null;
  } catch (error) {
    logger.error('Error getting brain state check-in:', error);
    return null;
  }
};

/**
 * Save (or update) today's brain state check-in.
 * Automatically maps the brain state to the corresponding protocol.
 */
export const saveBrainStateCheckIn = async (
  userId: string,
  brainState: BrainState
): Promise<BrainStateCheckIn> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const protocol = getProtocolForState(brainState);

    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : null;

    if (existingData) {
      const stateChanged = existingData.brainState !== brainState;
      await updateDoc(docRef, {
        brainState,
        protocolId: protocol.id,
        // Only reset protocol completion if brain state actually changed
        ...(stateChanged && { protocolCompleted: false }),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        ...existingData,
        brainState,
        protocolId: protocol.id,
        ...(stateChanged && { protocolCompleted: false }),
      } as BrainStateCheckIn;
    } else {
      await setDoc(docRef, {
        userId,
        date: todayDate,
        brainState,
        protocolId: protocol.id,
        protocolCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        userId,
        date: todayDate,
        brainState,
        protocolId: protocol.id,
        protocolCompleted: false,
      } as BrainStateCheckIn;
    }
  } catch (error) {
    logger.error('Error saving brain state check-in:', error);
    throw error;
  }
};

/**
 * Mark today's protocol as completed.
 */
export const markProtocolCompleted = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    await updateDoc(docRef, {
      protocolCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error marking protocol completed:', error);
    throw error;
  }
};

/**
 * Fetch brain state check-in history for the last N days.
 * For use in insights and correlation analysis.
 */
export const getBrainStateHistory = async (
  userId: string,
  days: number = 7
): Promise<BrainStateCheckIn[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(days)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BrainStateCheckIn));
  } catch (error) {
    logger.error('Error getting brain state history:', error);
    return [];
  }
};
