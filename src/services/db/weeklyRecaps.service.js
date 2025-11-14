import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

/** List weekly recaps for a user */
export async function listWeeklyRecaps(userId, opts = {}) {
  const {
    max = 52, // Default to last year
    order = ["weekStart", "desc"]
  } = opts;

  const col = collection(db, "weeklyRecaps");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy(order[0], order[1]),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single weekly recap by id */
export async function getWeeklyRecap(id) {
  const ref = doc(db, "weeklyRecaps", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get weekly recap for a specific week */
export async function getWeeklyRecapByWeek(userId, weekStart) {
  const col = collection(db, "weeklyRecaps");
  const q = query(
    col,
    where("userId", "==", userId),
    where("weekStart", "==", weekStart)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/** Create a weekly recap */
export async function createWeeklyRecap(userId, payload) {
  const col = collection(db, "weeklyRecaps");
  const docData = {
    userId,
    weekStart: payload.weekStart, // ISO date string "2025-11-10"
    weekEnd: payload.weekEnd, // ISO date string "2025-11-16"
    momentsOfJoy: payload.momentsOfJoy ?? [], // 4 items
    mindBodyFuel: payload.mindBodyFuel ?? [], // 3 items
    friendsConnected: payload.friendsConnected ?? [], // 2 items
    biggestWin: payload.biggestWin ?? "",
    obstacles: payload.obstacles ?? "",
    boundaries: payload.boundaries ?? "",
    aiSuggestions: payload.aiSuggestions ?? null,
    completedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

/** Update a weekly recap */
export async function updateWeeklyRecap(id, patch) {
  const ref = doc(db, "weeklyRecaps", id);
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Delete a weekly recap */
export async function removeWeeklyRecap(id) {
  const ref = doc(db, "weeklyRecaps", id);
  await deleteDoc(ref);
  return { id, deleted: true };
}

/** Get current week's date range */
export function getCurrentWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start

  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart: weekStart.toISOString().split('T')[0], // "2025-11-10"
    weekEnd: weekEnd.toISOString().split('T')[0] // "2025-11-16"
  };
}

/** Check if current week has a recap */
export async function hasCurrentWeekRecap(userId) {
  const { weekStart } = getCurrentWeekRange();
  const recap = await getWeeklyRecapByWeek(userId, weekStart);
  return recap !== null;
}
