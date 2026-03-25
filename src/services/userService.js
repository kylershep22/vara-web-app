import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { sanitizeText, sanitizeBio } from "../utils/sanitization";

export const updateProfile = async (userId, patch) => {
  if (patch.displayName) patch.displayName = sanitizeText(patch.displayName);
  if (patch.bio) patch.bio = sanitizeBio(patch.bio);
  await updateDoc(doc(db, "users", userId), { ...patch, updatedAt: new Date() });
};

export const getProfile = async (userId) => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
