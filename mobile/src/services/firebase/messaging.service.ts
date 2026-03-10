/**
 * Messaging Service
 * Firebase operations for direct messages and conversations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'directMessages';

// ==========================================
// TYPES
// ==========================================

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  };
  unreadCount?: { [userId: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ==========================================
// CONVERSATIONS
// ==========================================

/**
 * Create or get existing conversation between two users
 */
export const createOrGetConversation = async (
  uidA: string,
  uidB: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const participants = [uidA, uidB].sort();

    // Check if conversation already exists
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', '==', participants)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Create new conversation
    const conversationData = {
      participants,
      unreadCount: {
        [uidA]: 0,
        [uidB]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, CONVERSATIONS_COLLECTION),
      conversationData
    );
    return docRef.id;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw error;
  }
};

/**
 * Fetch conversations for a user
 */
export const fetchUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conversation[];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Subscribe to user's conversations
 */
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  if (!db) return () => {};
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];
      callback(conversations);
    },
    (error) => {
      console.error('Error subscribing to conversations:', error);
    }
  );
};

/**
 * Mark conversation as read for a user
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(docRef, {
      [`unreadCount.${userId}`]: 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

// ==========================================
// MESSAGES
// ==========================================

/**
 * Send a direct message
 */
export const sendDirectMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    // Add message
    const messageData = {
      conversationId,
      senderId,
      receiverId,
      text,
      read: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);

    // Update conversation
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const currentUnread = conversationSnap.data()?.unreadCount || {};

      await updateDoc(conversationRef, {
        lastMessage: {
          text,
          senderId,
          createdAt: serverTimestamp(),
        },
        [`unreadCount.${receiverId}`]: (currentUnread[receiverId] || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Fetch messages for a conversation
 */
export const fetchConversationMessages = async (
  conversationId: string,
  limitCount: number = 50
): Promise<DirectMessage[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .reverse() as DirectMessage[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Subscribe to conversation messages
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
): (() => void) => {
  if (!db) return () => {};
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DirectMessage[];
      callback(messages);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
    }
  );
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};
