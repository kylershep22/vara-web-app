import { db } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "dailyReflections";

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getTodayReflection(userId) {
  const todayDate = getTodayDate();
  const reflectionId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, reflectionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

export async function saveReflection(userId, difficulty) {
  const todayDate = getTodayDate();
  const reflectionId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, reflectionId);
  await setDoc(ref, {
    userId,
    date: todayDate,
    difficulty,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}
