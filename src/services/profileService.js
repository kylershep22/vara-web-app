import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { sanitizeText, sanitizeBio } from "../utils/sanitization";

export async function getUserProfile(uid) {
  return (await getDoc(doc(db, "users", uid))).data() || null;
}

export async function upsertUserProfile(uid, data) {
  const ref = doc(db, "users", uid);
  const sanitized = {
    ...data,
    ...(data.displayName ? { displayName: sanitizeText(data.displayName) } : {}),
    ...(data.bio ? { bio: sanitizeBio(data.bio) } : {}),
  };
  await setDoc(ref, {
    displayName: "",
    bio: "",
    interests: [],
    goals: [],
    location: "",
    privacy: "public",
    searchable: true,
    keywords: makeKeywords(sanitized.displayName, sanitized.interests),
    updatedAt: serverTimestamp(),
    ...sanitized
  }, { merge: true });
}

function makeKeywords(name = "", interests = []) {
  const base = (name || "").toLowerCase().split(/\s+/);
  const ints = (interests || []).map(i => String(i).toLowerCase());
  return Array.from(new Set([...base, ...ints].filter(Boolean)));
}
