import { db } from "../../firebase";
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";

const COLLECTION = "mutedUsers";

export async function getMutedUsers(userId) {
  const q = query(collection(db, COLLECTION), where("muterId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function muteUser(muterId, mutedUserId) {
  await addDoc(collection(db, COLLECTION), {
    muterId,
    mutedUserId,
    createdAt: serverTimestamp(),
  });
}

export async function unmuteUser(docId) {
  await deleteDoc(doc(db, COLLECTION, docId));
}
