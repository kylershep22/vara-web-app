// src/services/messagingService.js
import {
  doc, setDoc, getDoc, updateDoc, addDoc,
  collection, query, where, orderBy, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

// Deterministic ID so we never create dup conversations
const convIdFor = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

/** Create (if needed) or fetch a 1:1 conversation between two users. */
export async function createOrGetConversation(uidA, uidB) {
  const id = convIdFor(uidA, uidB);
  const ref = doc(db, "conversations", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [uidA, uidB],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    });
    const newSnap = await getDoc(ref);
    return { id, ...newSnap.data() };
  }

  return { id, ...snap.data() };
}

/** Live list of the user’s conversations (sorted by updatedAt desc). */
export function subscribeConversations(userId, cb) {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Live messages in a conversation (ascending by createdAt). */
export function subscribeMessages(conversationId, cb) {
  const q = query(
    collection(db, "directMessages"),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

/** Send a text message. Also updates conversation’s lastMessage + updatedAt. */
export async function sendDirectMessage(conversationId, senderId, text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return;

  await addDoc(collection(db, "directMessages"), {
    conversationId,
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: { text: trimmed, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

