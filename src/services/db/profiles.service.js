import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sanitizeText, sanitizeBio } from "../../utils/sanitization";

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
  if (data.displayName) data.displayName = sanitizeText(data.displayName);
  if (data.bio) data.bio = sanitizeBio(data.bio);
  await setDoc(ref, data, { merge: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Patch a profile */
export async function patchProfile(userId, patch) {
  const ref = doc(db, "users", userId);
  if (patch.displayName) patch.displayName = sanitizeText(patch.displayName);
  if (patch.bio) patch.bio = sanitizeBio(patch.bio);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}
