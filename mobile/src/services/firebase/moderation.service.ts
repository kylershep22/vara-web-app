/**
 * Moderation Service
 * Firebase operations for post reporting, hiding, and user muting
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
import { db } from '../../config/firebase';
import { PostReportReason } from '../../types/moderation';

const ensureFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  return db;
};

const REPORTS_COLLECTION = 'postReports';
const HIDDEN_POSTS_COLLECTION = 'hiddenPosts';
const MUTED_USERS_COLLECTION = 'mutedUsers';
const POSTS_COLLECTION = 'posts';

// ==========================================
// POST REPORTS
// ==========================================

/**
 * Check if the user has already reported this post
 */
export const checkDuplicateReport = async (
  reporterId: string,
  postId: string
): Promise<boolean> => {
  try {
    const firestore = ensureFirestore();
    const q = query(
      collection(firestore, REPORTS_COLLECTION),
      where('reporterId', '==', reporterId),
      where('postId', '==', postId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking duplicate report:', error);
    throw error;
  }
};

/**
 * Submit a post report
 */
export const submitReport = async (
  reporterId: string,
  postId: string,
  reportedUserId: string,
  reason: PostReportReason,
  detail?: string
): Promise<string> => {
  try {
    const firestore = ensureFirestore();

    // Check for duplicate
    const isDuplicate = await checkDuplicateReport(reporterId, postId);
    if (isDuplicate) {
      throw new Error('DUPLICATE_REPORT');
    }

    const docRef = await addDoc(collection(firestore, REPORTS_COLLECTION), {
      postId,
      reporterId,
      reportedUserId,
      reason,
      detail: detail || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};

// ==========================================
// HIDDEN POSTS
// ==========================================

/**
 * Hide a post from the user's feed
 * Uses deterministic doc ID for idempotency
 */
export const hidePost = async (
  userId: string,
  postId: string
): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    const docId = `${userId}_${postId}`;
    await setDoc(doc(firestore, HIDDEN_POSTS_COLLECTION, docId), {
      userId,
      postId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error hiding post:', error);
    throw error;
  }
};

/**
 * Unhide a post (undo hide)
 */
export const unhidePost = async (
  userId: string,
  postId: string
): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    const docId = `${userId}_${postId}`;
    await deleteDoc(doc(firestore, HIDDEN_POSTS_COLLECTION, docId));
  } catch (error) {
    console.error('Error unhiding post:', error);
    throw error;
  }
};

/**
 * Fetch all hidden post IDs for a user
 */
export const fetchHiddenPostIds = async (
  userId: string
): Promise<string[]> => {
  try {
    const firestore = ensureFirestore();
    const q = query(
      collection(firestore, HIDDEN_POSTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().postId);
  } catch (error) {
    console.error('Error fetching hidden posts:', error);
    return [];
  }
};

// ==========================================
// MUTED USERS
// ==========================================

/**
 * Mute a user (hide all their posts from feed)
 * Uses deterministic doc ID for idempotency
 */
export const muteUser = async (
  muterId: string,
  mutedUserId: string
): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    const docId = `${muterId}_${mutedUserId}`;
    await setDoc(doc(firestore, MUTED_USERS_COLLECTION, docId), {
      muterId,
      mutedUserId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error muting user:', error);
    throw error;
  }
};

/**
 * Unmute a user (undo mute)
 */
export const unmuteUser = async (
  muterId: string,
  mutedUserId: string
): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    const docId = `${muterId}_${mutedUserId}`;
    await deleteDoc(doc(firestore, MUTED_USERS_COLLECTION, docId));
  } catch (error) {
    console.error('Error unmuting user:', error);
    throw error;
  }
};

/**
 * Fetch all muted user IDs for a user
 */
export const fetchMutedUserIds = async (
  muterId: string
): Promise<string[]> => {
  try {
    const firestore = ensureFirestore();
    const q = query(
      collection(firestore, MUTED_USERS_COLLECTION),
      where('muterId', '==', muterId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().mutedUserId);
  } catch (error) {
    console.error('Error fetching muted users:', error);
    return [];
  }
};

// ==========================================
// POST MUTATIONS (soft delete, edit)
// ==========================================

/**
 * Soft delete a post (mark as deleted, keep data for moderation)
 */
export const softDeletePost = async (postId: string): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    await updateDoc(doc(firestore, POSTS_COLLECTION, postId), {
      deleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error soft-deleting post:', error);
    throw error;
  }
};

/**
 * Update post content
 */
export const updatePostContent = async (
  postId: string,
  content: string
): Promise<void> => {
  try {
    const firestore = ensureFirestore();
    await updateDoc(doc(firestore, POSTS_COLLECTION, postId), {
      content,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating post content:', error);
    throw error;
  }
};
