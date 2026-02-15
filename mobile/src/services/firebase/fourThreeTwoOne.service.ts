/**
 * 4-3-2-1 Daily Practice Service
 * CRUD operations for 4-3-2-1 daily entries collection
 *
 * 4-3-2-1 Framework:
 * - 4 minutes to yourself (uninterrupted alone time)
 * - 3 wins from the day (small accomplishments)
 * - 2 ways you fueled your body (nutrition, movement, rest)
 * - 1 connection with another person
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FourThreeTwoOneEntry, BodyFuelOption } from '../../types';

const COLLECTION = 'fourThreeTwoOne';

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get or create today's 4-3-2-1 entry for a user
 */
export const getTodayEntry = async (userId: string): Promise<FourThreeTwoOneEntry | null> => {
  try {
    const todayDate = getTodayDate();
    const entryId = `${userId}_${todayDate}`;

    const docRef = doc(db, COLLECTION, entryId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as FourThreeTwoOneEntry;
    }

    // Create empty entry for today
    const newEntry: Omit<FourThreeTwoOneEntry, 'id'> = {
      userId,
      date: todayDate,
      fourMinutes: false,
      threeWins: {
        completed: false,
      },
      twoFuel: {
        completed: false,
      },
      oneConnection: false,
      completed: false,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(docRef, newEntry);

    return {
      id: entryId,
      ...newEntry,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  } catch (error) {
    console.error('Error getting today entry:', error);
    throw error;
  }
};

/**
 * Update today's 4-3-2-1 entry
 */
export const updateTodayEntry = async (
  userId: string,
  updates: Partial<Omit<FourThreeTwoOneEntry, 'id' | 'userId' | 'date' | 'createdAt'>>
): Promise<void> => {
  try {
    const todayDate = getTodayDate();
    const entryId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, entryId);

    // Calculate if all parts are completed
    const docSnap = await getDoc(docRef);
    const currentData = docSnap.data() as FourThreeTwoOneEntry;

    const fourMinutes = updates.fourMinutes ?? currentData?.fourMinutes ?? false;
    const threeWins = updates.threeWins ?? currentData?.threeWins ?? { completed: false };
    const twoFuel = updates.twoFuel ?? currentData?.twoFuel ?? { completed: false };
    const oneConnection = updates.oneConnection ?? currentData?.oneConnection ?? false;

    const completed = fourMinutes && threeWins.completed && twoFuel.completed && oneConnection;

    await updateDoc(docRef, {
      ...updates,
      completed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating today entry:', error);
    throw error;
  }
};

/**
 * Toggle 4 minutes completion
 */
export const toggleFourMinutes = async (userId: string): Promise<void> => {
  const entry = await getTodayEntry(userId);
  if (entry) {
    await updateTodayEntry(userId, { fourMinutes: !entry.fourMinutes });
  }
};

/**
 * Update 3 wins
 */
export const updateThreeWins = async (
  userId: string,
  completed: boolean,
  wins?: string[]
): Promise<void> => {
  // Filter out empty wins, or use empty array if undefined
  const filteredWins = wins ? wins.filter(w => w.trim().length > 0) : [];

  await updateTodayEntry(userId, {
    threeWins: {
      completed,
      wins: filteredWins.length > 0 ? filteredWins : undefined, // Only include if not empty
    },
  });
};

/**
 * Update 2 fuel options
 */
export const updateTwoFuel = async (
  userId: string,
  completed: boolean,
  options?: BodyFuelOption[]
): Promise<void> => {
  await updateTodayEntry(userId, {
    twoFuel: {
      completed,
      options: options && options.length > 0 ? options : undefined, // Only include if not empty
    },
  });
};

/**
 * Toggle 1 connection completion
 */
export const toggleOneConnection = async (userId: string): Promise<void> => {
  const entry = await getTodayEntry(userId);
  if (entry) {
    await updateTodayEntry(userId, { oneConnection: !entry.oneConnection });
  }
};

/**
 * Get current streak (consecutive days of completion)
 */
export const getCurrentStreak = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('completed', '==', true),
      orderBy('date', 'desc'),
      limit(100) // Check last 100 days max
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data() as FourThreeTwoOneEntry);

    if (entries.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (entry.date === checkDateStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1); // Check previous day
      } else {
        // Gap in streak
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting current streak:', error);
    return 0;
  }
};

/**
 * Get longest streak
 */
export const getLongestStreak = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('completed', '==', true),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data() as FourThreeTwoOneEntry);

    if (entries.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].date);
      const currDate = new Date(entries[i].date);

      // Calculate difference in days
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        // Gap in streak, reset
        currentStreak = 1;
      }
    }

    return maxStreak;
  } catch (error) {
    console.error('Error getting longest streak:', error);
    return 0;
  }
};

/**
 * Get entries for the past N days
 */
export const getRecentEntries = async (
  userId: string,
  days: number = 7
): Promise<FourThreeTwoOneEntry[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('date', '>=', startDateStr),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FourThreeTwoOneEntry[];
  } catch (error) {
    console.error('Error getting recent entries:', error);
    throw error;
  }
};

/**
 * Get completion stats for the past week
 */
export const getWeeklyStats = async (userId: string): Promise<{
  completedDays: number;
  totalDays: number;
  completionRate: number;
}> => {
  try {
    const entries = await getRecentEntries(userId, 7);
    const completedDays = entries.filter(e => e.completed).length;
    const totalDays = 7;
    const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

    return {
      completedDays,
      totalDays,
      completionRate: Math.round(completionRate),
    };
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    return {
      completedDays: 0,
      totalDays: 7,
      completionRate: 0,
    };
  }
};
