import { db } from "../../firebase";
import { sanitizeText, sanitizeTitle } from '../../utils/sanitization';
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

/** Groups */
export async function listGroups(opts = { onlyPublic: false, max: 50 }) {
  const { onlyPublic = false, max = 50 } = opts;
  const col = collection(db, "groups");
  const filters = [];
  if (onlyPublic) filters.push(where("visibility", "==", "public"));
  const q = query(col, ...filters, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createGroup(userId, payload = { name: '', visibility: 'private' }) {
  const col = collection(db, "groups");
  const data = {
    ownerId: userId,
    visibility: payload.visibility ?? "private",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...payload,
    name: sanitizeTitle(payload.name) || "",
    description: sanitizeText(payload.description) || "",
  };
  const res = await addDoc(col, data);
  return { id: res.id, ...data };
}

export async function updateGroup(id, patch = {}) {
  const ref = doc(db, "groups", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function removeGroup(id) {
  const ref = doc(db, "groups", id);
  await deleteDoc(ref);
  return { id, deleted: true };
}

/** Posts (forum-style) */
export async function listPosts(groupId, opts = { max: 50 }) {
  const { max = 50 } = opts;
  const col = collection(db, "posts");
  const q = query(
    col,
    where("groupId", "==", groupId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPost(userId, groupId, payload = { content: '' }) {
  const col = collection(db, "posts");
  const data = {
    userId,
    groupId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...payload,
    content: sanitizeText(payload.content) || "",
  };
  const res = await addDoc(col, data);
  return { id: res.id, ...data };
}
