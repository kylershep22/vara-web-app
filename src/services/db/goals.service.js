import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

/** List goals for a user (newest first) */
export async function listGoals(userId, opts = {}) {
  const {
    max = 50,
    order = ["createdAt", "desc"], // [field, direction]
  } = opts;

  const col = collection(db, "goals");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy(order[0], order[1]),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single goal by id (enforce owner check at rules layer) */
export async function getGoal(id) {
  const ref = doc(db, "goals", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Create a goal (assigns createdAt/updatedAt) */
export async function createGoal(userId, payload) {
  const col = collection(db, "goals");
  const docData = {
    userId,
    title: payload.title ?? "",
    primaryFocus: payload.primaryFocus ?? null,
    refinedFocus: payload.refinedFocus ?? null,
    timeframe: payload.timeframe ?? null,
    targetDate: payload.targetDate ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...payload
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

/** Update a goal (partial patch) */
export async function updateGoal(id, patch) {
  const ref = doc(db, "goals", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Delete a goal */
export async function removeGoal(id) {
  const ref = doc(db, "goals", id);
  await deleteDoc(ref);
  return { id, deleted: true };
}
