import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp
} from "firebase/firestore";

export async function listHabits(userId, opts = {}) {
  const { goalId, max = 100 } = opts;
  const col = collection(db, "habits");
  const filters = [where("userId", "==", userId)];
  if (goalId) filters.push(where("goalId", "==", goalId));
  const q = query(col, ...filters, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createHabit(userId, payload) {
  const col = collection(db, "habits");
  const docData = {
    userId,
    name: payload.name ?? "",
    title: payload.name ?? "",
    category: payload.category ?? null,
    frequency: payload.frequency ?? "daily",
    active: true,
    streak: 0,
    consecutiveMisses: 0,
    missedYesterday: false,
    reminderEnabled: payload.reminderEnabled ?? false,
    reminderTime: payload.reminderTime ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

export async function updateHabit(id, patch) {
  const ref = doc(db, "habits", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function removeHabit(id) {
  const ref = doc(db, "habits", id);
  await deleteDoc(ref);
  return { id, deleted: true };
}

/**
 * Log a habit completion with optional reflection data.
 * Creates a doc in habitCompletions with a deterministic ID (habitId_dateISO).
 * Accepts optional `version` ('full' | 'quick' | 'just_show_up') to track which
 * scaling version was completed.
 */
export async function logCompletion(userId, habitId, dateISO, reflectionData = {}) {
  const completionId = `${habitId}_${dateISO}`;
  const ref = doc(db, "habitCompletions", completionId);
  await setDoc(ref, {
    userId,
    habitId,
    dateISO,
    reflection: reflectionData.reflection ?? null,
    connectionQuality: reflectionData.connectionQuality ?? null,
    skippedReflection: reflectionData.skippedReflection ?? false,
    source: reflectionData.source ?? 'track',
    crFlagged: reflectionData.crFlagged ?? false,
    valueAlignment: reflectionData.valueAlignment ?? null,
    version: reflectionData.version ?? null,
    createdAt: serverTimestamp(),
  });

  // Reset bounce-back tracking on completion
  const habitRef = doc(db, "habits", habitId);
  await updateDoc(habitRef, {
    consecutiveMisses: 0,
    missedYesterday: false,
    updatedAt: serverTimestamp(),
  });

  return { id: completionId };
}

/**
 * Remove a habit completion (un-toggle).
 */
export async function removeCompletion(habitId, dateISO) {
  const completionId = `${habitId}_${dateISO}`;
  const ref = doc(db, "habitCompletions", completionId);
  await deleteDoc(ref);
  return { id: completionId, deleted: true };
}

/**
 * Check which active habits were missed yesterday and update bounce-back fields.
 * Returns an array of habits that were missed (for dashboard messaging).
 */
export async function checkMissedHabits(userId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayISO = `${y}-${m}-${d}`;

  // Get all active habits
  const habitsCol = collection(db, "habits");
  const habitsQ = query(habitsCol, where("userId", "==", userId), where("active", "==", true));
  const habitsSnap = await getDocs(habitsQ);
  const habits = habitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const missed = [];

  await Promise.all(habits.map(async (habit) => {
    const completionId = `${habit.id}_${yesterdayISO}`;
    const completionRef = doc(db, "habitCompletions", completionId);
    const completionSnap = await getDoc(completionRef);

    if (!completionSnap.exists()) {
      // Yesterday was missed
      const currentMisses = (habit.consecutiveMisses || 0) + 1;
      const habitRef = doc(db, "habits", habit.id);
      await updateDoc(habitRef, {
        consecutiveMisses: currentMisses,
        missedYesterday: true,
        updatedAt: serverTimestamp(),
      });
      missed.push({ ...habit, consecutiveMisses: currentMisses });
    } else {
      // Yesterday was completed - ensure fields are accurate
      if (habit.missedYesterday) {
        const habitRef = doc(db, "habits", habit.id);
        await updateDoc(habitRef, {
          missedYesterday: false,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }));

  return missed;
}
