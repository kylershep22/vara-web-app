import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const updateProfile = async (userId, patch) => {
  await updateDoc(doc(db, "users", userId), { ...patch, updatedAt: new Date() });
};

export const getProfile = async (userId) => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
