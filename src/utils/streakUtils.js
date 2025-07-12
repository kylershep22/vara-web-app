// src/utils/streakUtils.js
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export const getTodayDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const checkStreak = async (userId, habitId) => {
  const ref = doc(db, 'users', userId, 'habitStreaks', habitId);
  const snap = await getDoc(ref);
  const today = getTodayDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toISOString().split('T')[0];

  if (snap.exists()) {
    const data = snap.data();

    // Already logged today
    if (data.lastCompleted === today) {
      return data;
    }

    const newStreak = data.lastCompleted === yestStr ? data.streak + 1 : 1;

    await updateDoc(ref, {
      lastCompleted: today,
      streak: newStreak,
      updatedAt: serverTimestamp(),
    });

    return { ...data, lastCompleted: today, streak: newStreak };
  } else {
    // First time logging streak
    await setDoc(ref, {
      lastCompleted: today,
      streak: 1,
      createdAt: serverTimestamp(),
    });
    return { lastCompleted: today, streak: 1 };
  }
};
