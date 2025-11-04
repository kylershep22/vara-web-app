import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp
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
    goalId: payload.goalId ?? null,
    name: payload.name ?? "",
    frequency: payload.frequency ?? "daily",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...payload
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
