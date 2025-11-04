import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/** Read a user's profile (users/{userId}) */
export async function getProfile(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Initialize or overwrite a profile */
export async function upsertProfile(userId, payload) {
  const ref = doc(db, "users", userId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    createdAt: payload?.createdAt ?? serverTimestamp()
  };
  await setDoc(ref, data, { merge: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Patch a profile */
export async function patchProfile(userId, patch) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}
