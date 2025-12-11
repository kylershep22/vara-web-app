/**
 * Community Service
 * Firebase operations for groups, posts, and connections
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const GROUPS_COLLECTION = 'groups';
const POSTS_COLLECTION = 'posts';
const CONNECTIONS_COLLECTION = 'connections';
const USERS_COLLECTION = 'users';

// ==========================================
// TYPES
// ==========================================

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  visibility: 'public' | 'private';
  isPublic: boolean;
  members: string[];
  memberCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Post {
  id: string;
  authorId?: string; // Web app uses authorId
  userId?: string; // Mobile app uses userId (legacy support)
  groupId?: string;
  content: string;
  likes: string[];
  comments: Comment[];
  images?: string[];
  timestamp?: Timestamp; // Web app uses timestamp
  createdAt?: Timestamp; // Mobile app uses createdAt
  updatedAt?: Timestamp;
}

export interface Comment {
  userId: string;
  text: string;
  likes: string[];
  createdAt: Timestamp;
}

export interface Connection {
  id: string;
  // Mobile app format
  a?: string;
  b?: string;
  requester?: string;
  // Web app format
  participants?: string[];
  requesterId?: string;
  addresseeId?: string;
  // Common fields
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  avatar?: string;
  privacy?: 'public' | 'connections' | 'private';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// GROUPS
// ==========================================

/**
 * Fetch all public groups
 */
export const fetchPublicGroups = async (): Promise<Group[]> => {
  try {
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isPublic: doc.data().visibility === 'public',
    })) as Group[];
  } catch (error) {
    console.error('Error fetching public groups:', error);
    throw error;
  }
};

/**
 * Fetch groups the user is a member of
 */
export const fetchUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isPublic: doc.data().visibility === 'public',
    })) as Group[];
  } catch (error) {
    console.error('Error fetching user groups:', error);
    throw error;
  }
};

/**
 * Get group details
 */
export const getGroupInfo = async (groupId: string): Promise<Group | null> => {
  try {
    const docRef = doc(db, GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        isPublic: docSnap.data().visibility === 'public',
      } as Group;
    }

    return null;
  } catch (error) {
    console.error('Error getting group info:', error);
    throw error;
  }
};

/**
 * Create a new group
 */
export const createGroup = async (data: {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  ownerId: string;
}): Promise<string> => {
  try {
    const groupData = {
      ...data,
      isPublic: data.visibility === 'public',
      members: [data.ownerId],
      memberCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Join a group
 */
export const joinGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(docRef, {
      members: arrayUnion(userId),
      memberCount: await getGroupMemberCount(groupId) + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
};

/**
 * Leave a group
 */
export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId),
      memberCount: Math.max(0, (await getGroupMemberCount(groupId)) - 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

/**
 * Helper: Get current member count
 */
const getGroupMemberCount = async (groupId: string): Promise<number> => {
  const group = await getGroupInfo(groupId);
  return group?.memberCount || 0;
};

// ==========================================
// POSTS
// ==========================================

/**
 * Create a post
 */
export const createPost = async (data: {
  userId: string;
  content: string;
  groupId?: string;
}): Promise<string> => {
  try {
    const postData = {
      authorId: data.userId, // Use authorId to match web app
      content: data.content,
      groupId: data.groupId || null,
      likes: [],
      comments: [],
      images: [],
      timestamp: serverTimestamp(), // Use timestamp to match web app
    };

    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

/**
 * Fetch posts for a group
 */
export const fetchGroupPosts = async (groupId: string): Promise<Post[]> => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[];
  } catch (error) {
    console.error('Error fetching group posts:', error);
    throw error;
  }
};

/**
 * Toggle post like
 */
export const togglePostLike = async (postId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Post not found');
    }

    const likes = docSnap.data().likes || [];
    const isLiked = likes.includes(userId);

    await updateDoc(docRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
};

/**
 * Add comment to post
 */
export const addCommentToPost = async (
  postId: string,
  comment: {
    userId: string;
    text: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(docRef, {
      comments: arrayUnion({
        ...comment,
        likes: [],
        createdAt: serverTimestamp(),
      }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// ==========================================
// CONNECTIONS
// ==========================================

/**
 * Helper: Generate connection ID from two user IDs
 */
const getConnectionId = (uidA: string, uidB: string): string => {
  return [uidA, uidB].sort().join('_');
};

/**
 * Send connection request
 */
export const sendConnectionRequest = async (
  requesterId: string,
  addresseeId: string
): Promise<string> => {
  try {
    console.log('[sendConnectionRequest] requesterId:', requesterId, 'addresseeId:', addresseeId);

    if (!requesterId || !addresseeId) {
      throw new Error('Invalid user IDs');
    }

    if (requesterId === addresseeId) {
      throw new Error('Cannot connect to yourself');
    }

    // Use web app format - addDoc with auto-generated ID
    const connectionData = {
      requesterId: requesterId,
      addresseeId: addresseeId,
      participants: [requesterId, addresseeId],
      status: 'pending' as const,
      createdAt: serverTimestamp(),
    };

    console.log('[sendConnectionRequest] Creating connection with data:', {
      requesterId: connectionData.requesterId,
      addresseeId: connectionData.addresseeId,
      participants: connectionData.participants,
      status: connectionData.status,
    });

    // Use addDoc like web app (auto-generated ID)
    const docRef = await addDoc(collection(db, CONNECTIONS_COLLECTION), connectionData);
    console.log('[sendConnectionRequest] Connection created successfully with ID:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('[sendConnectionRequest] Error:', error);
    throw error;
  }
};

/**
 * Accept connection request
 */
export const acceptConnection = async (connectionId: string): Promise<void> => {
  try {
    const docRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
    await updateDoc(docRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error accepting connection:', error);
    throw error;
  }
};

/**
 * Decline connection request
 */
export const declineConnection = async (connectionId: string): Promise<void> => {
  try {
    const docRef = doc(db, CONNECTIONS_COLLECTION, connectionId);
    await updateDoc(docRef, {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error declining connection:', error);
    throw error;
  }
};

/**
 * Fetch user connections (accepted)
 */
export const fetchUserConnections = async (userId: string): Promise<Connection[]> => {
  try {
    console.log('[fetchUserConnections] Starting query for userId:', userId);

    // Query 1: Web app format (participants array)
    const qWeb = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('status', '==', 'accepted')
    );

    // Query 2 & 3: Mobile app format (a/b fields)
    const qMobile1 = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('a', '==', userId),
      where('status', '==', 'accepted')
    );

    const qMobile2 = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('b', '==', userId),
      where('status', '==', 'accepted')
    );

    const [webSnapshot, mobile1Snapshot, mobile2Snapshot] = await Promise.all([
      getDocs(qWeb),
      getDocs(qMobile1),
      getDocs(qMobile2),
    ]);

    console.log('[fetchUserConnections] Query results - web:', webSnapshot.docs.length, 'mobile(a):', mobile1Snapshot.docs.length, 'mobile(b):', mobile2Snapshot.docs.length);

    if (webSnapshot.docs.length > 0) {
      console.log('[fetchUserConnections] Sample web doc:', webSnapshot.docs[0].data());
    }

    // Combine all results, avoiding duplicates by ID
    const connectionMap = new Map();

    [...webSnapshot.docs, ...mobile1Snapshot.docs, ...mobile2Snapshot.docs].forEach((doc) => {
      const data = doc.data();
      connectionMap.set(doc.id, {
        id: doc.id,
        // Normalize to mobile format
        a: data.a || (data.participants ? data.participants[0] : ''),
        b: data.b || (data.participants ? data.participants[1] : ''),
        status: data.status,
        requester: data.requester || data.requesterId || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    const connections = Array.from(connectionMap.values());
    console.log('[fetchUserConnections] Total unique connections found:', connections.length);

    return connections as Connection[];
  } catch (error) {
    console.error('Error fetching user connections:', error);
    throw error;
  }
};

/**
 * Fetch incoming connection requests
 */
export const fetchIncomingConnectionRequests = async (
  userId: string
): Promise<Connection[]> => {
  try {
    console.log('[fetchIncomingRequests] Starting query for userId:', userId);

    // Query 1: Web app format (addresseeId)
    const qWeb = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('addresseeId', '==', userId),
      where('status', '==', 'pending')
    );

    // Query 2 & 3: Mobile app format (a/b fields)
    const qMobile1 = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('a', '==', userId),
      where('status', '==', 'pending')
    );

    const qMobile2 = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('b', '==', userId),
      where('status', '==', 'pending')
    );

    const [webSnapshot, mobile1Snapshot, mobile2Snapshot] = await Promise.all([
      getDocs(qWeb),
      getDocs(qMobile1),
      getDocs(qMobile2),
    ]);

    console.log('[fetchIncomingRequests] Query results - web:', webSnapshot.docs.length, 'mobile(a):', mobile1Snapshot.docs.length, 'mobile(b):', mobile2Snapshot.docs.length);

    // Combine all results, avoiding duplicates
    const requestMap = new Map();

    [...webSnapshot.docs, ...mobile1Snapshot.docs, ...mobile2Snapshot.docs].forEach((doc) => {
      const data = doc.data();
      const requester = data.requester || data.requesterId || '';

      // Only include if user is NOT the requester (incoming requests only)
      if (requester !== userId) {
        requestMap.set(doc.id, {
          id: doc.id,
          a: data.a || (data.participants ? data.participants[0] : ''),
          b: data.b || (data.participants ? data.participants[1] : ''),
          status: data.status,
          requester,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });

    const requests = Array.from(requestMap.values());
    console.log('[fetchIncomingRequests] Total incoming requests found:', requests.length);

    return requests as Connection[];
  } catch (error) {
    console.error('Error fetching incoming requests:', error);
    throw error;
  }
};

/**
 * Fetch outgoing connection requests (sent by user)
 */
export const fetchSentConnectionRequests = async (
  userId: string
): Promise<Connection[]> => {
  try {
    console.log('[fetchSentRequests] Starting query for userId:', userId);

    // Query 1: Web app format (requesterId)
    const qWeb = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('requesterId', '==', userId),
      where('status', '==', 'pending')
    );

    // Query 2: Mobile app format (requester field)
    const qMobile = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('requester', '==', userId),
      where('status', '==', 'pending')
    );

    const [webSnapshot, mobileSnapshot] = await Promise.all([
      getDocs(qWeb),
      getDocs(qMobile),
    ]);

    console.log('[fetchSentRequests] Query results - web:', webSnapshot.docs.length, 'mobile:', mobileSnapshot.docs.length);

    // Combine all results, avoiding duplicates
    const requestMap = new Map();

    [...webSnapshot.docs, ...mobileSnapshot.docs].forEach((doc) => {
      const data = doc.data();
      requestMap.set(doc.id, {
        id: doc.id,
        a: data.a || (data.participants ? data.participants[0] : ''),
        b: data.b || (data.participants ? data.participants[1] : ''),
        status: data.status,
        requester: data.requester || data.requesterId || '',
        addresseeId: data.addresseeId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    const requests = Array.from(requestMap.values());
    console.log('[fetchSentRequests] Total sent requests found:', requests.length);

    return requests as Connection[];
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    throw error;
  }
};

// ==========================================
// USERS
// ==========================================

/**
 * Get user profile by ID
 */
export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Search users by display name
 */
export const searchUsers = async (searchQuery: string): Promise<UserProfile[]> => {
  try {
    // Note: Firestore doesn't support full-text search
    // This is a basic implementation - consider using Algolia or similar for production
    const q = query(collection(db, USERS_COLLECTION), orderBy('displayName'));

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProfile[];

    // Client-side filtering
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(lowerQuery) ||
        user.email?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};
