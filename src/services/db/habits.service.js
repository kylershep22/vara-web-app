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
    createdAt: serverTimestamp(),
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
