/**
 * Moderation Service
 * Post reporting, hiding, and user muting
 * Ported from mobile/src/services/firebase/moderation.service.ts
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const REPORTS = 'postReports';
const HIDDEN_POSTS = 'hiddenPosts';
const MUTED_USERS = 'mutedUsers';
const POSTS = 'posts';

// ==========================================
// POST REPORTS
// ==========================================

export async function checkDuplicateReport(reporterId, postId) {
  const q = query(collection(db, REPORTS), where('reporterId', '==', reporterId), where('postId', '==', postId));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function submitReport(reporterId, postId, reportedUserId, reason, detail) {
  const isDuplicate = await checkDuplicateReport(reporterId, postId);
  if (isDuplicate) throw new Error('DUPLICATE_REPORT');

  const ref = await addDoc(collection(db, REPORTS), {
    postId,
    reporterId,
    reportedUserId,
    reason,
    detail: detail || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ==========================================
// HIDDEN POSTS
// ==========================================

export async function hidePost(userId, postId) {
  const docId = `${userId}_${postId}`;
  await setDoc(doc(db, HIDDEN_POSTS, docId), { userId, postId, createdAt: serverTimestamp() });
}

export async function unhidePost(userId, postId) {
  const docId = `${userId}_${postId}`;
  await deleteDoc(doc(db, HIDDEN_POSTS, docId));
}

export async function fetchHiddenPostIds(userId) {
  const q = query(collection(db, HIDDEN_POSTS), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().postId);
}

// ==========================================
// MUTED USERS
// ==========================================

export async function muteUser(muterId, mutedUserId) {
  const docId = `${muterId}_${mutedUserId}`;
  await setDoc(doc(db, MUTED_USERS, docId), { muterId, mutedUserId, createdAt: serverTimestamp() });
}

export async function unmuteUser(muterId, mutedUserId) {
  const docId = `${muterId}_${mutedUserId}`;
  await deleteDoc(doc(db, MUTED_USERS, docId));
}

export async function fetchMutedUserIds(muterId) {
  const q = query(collection(db, MUTED_USERS), where('muterId', '==', muterId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().mutedUserId);
}

// ==========================================
// POST MUTATIONS
// ==========================================

export async function softDeletePost(postId) {
  await updateDoc(doc(db, POSTS, postId), { deleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updatePostContent(postId, content) {
  await updateDoc(doc(db, POSTS, postId), { content, updatedAt: serverTimestamp() });
}
