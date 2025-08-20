import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function getUserProfile(uid) {
  return (await getDoc(doc(db, "users", uid))).data() || null;
}

export async function upsertUserProfile(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    displayName: "",
    bio: "",
    interests: [],
    goals: [],
    location: "",
    privacy: "public",
    searchable: true,
    keywords: makeKeywords(data.displayName, data.interests),
    updatedAt: serverTimestamp(),
    ...data
  }, { merge: true });
}

function makeKeywords(name = "", interests = []) {
  const base = (name || "").toLowerCase().split(/\s+/);
  const ints = (interests || []).map(i => String(i).toLowerCase());
  return Array.from(new Set([...base, ...ints].filter(Boolean)));
}
