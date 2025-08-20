import { addDoc, collection, doc, getDocs, query, setDoc, updateDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function pairId(a,b){ return [a,b].sort().join("_"); }

export async function requestConnection(a, b) {
  const id = pairId(a,b);
  await setDoc(doc(db, "connections", id), { a, b, status: "pending", createdAt: serverTimestamp() });
  return id;
}

export async function acceptConnection(a, b) {
  const id = pairId(a,b);
  await updateDoc(doc(db, "connections", id), { status: "accepted", acceptedAt: serverTimestamp() });
}

export async function declineConnection(a, b) {
  const id = pairId(a,b);
  await updateDoc(doc(db, "connections", id), { status: "declined", declinedAt: serverTimestamp() });
}

export async function getPendingFor(uid) {
  // Show requests where other person asked you
  const q = query(collection(db, "connections"),
    where("status", "==", "pending"),
    where("b", "==", uid) // assuming requester is a, recipient is b
  );
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function areConnected(a,b) {
  const id = pairId(a,b);
  const snap = await getDocs(query(collection(db, "connections"), where("__name__", "==", id)));
  if (snap.size === 0) return false;
  return snap.docs[0].data().status === "accepted";
}

