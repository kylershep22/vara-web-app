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
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../config/firebase';
import { GroupPrompt } from '../../types/models';

/**
 * Helper to ensure Firestore is initialized
 * Throws a clear error if db is null
 */
const ensureFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  return db;
};

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
  category?: string;
  coverImage?: string;
  lastActivityAt?: Timestamp;
  postCount?: number;
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
      collection(ensureFirestore(), GROUPS_COLLECTION),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(100)
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
      collection(ensureFirestore(), GROUPS_COLLECTION),
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
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
    console.log('[getGroupInfo] Fetching group:', groupId);
    const docRef = doc(ensureFirestore(), GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('[getGroupInfo] Group found:', {
        id: docSnap.id,
        name: data.name,
        visibility: data.visibility,
        memberCount: data.members?.length,
      });
      return {
        id: docSnap.id,
        ...data,
        isPublic: data.visibility === 'public',
      } as Group;
    }

    console.log('[getGroupInfo] Group not found:', groupId);
    return null;
  } catch (error: any) {
    console.error('[getGroupInfo] Error:', {
      groupId,
      code: error?.code,
      message: error?.message,
    });
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
  category?: string;
  invitePermission?: 'owner_only' | 'all_members';
}): Promise<string> => {
  try {
    const groupData = {
      ...data,
      isPublic: data.visibility === 'public',
      members: [data.ownerId],
      memberCount: 1,
      category: data.category || 'other',
      invitePermission: data.invitePermission || 'owner_only',
      lastActivityAt: serverTimestamp(),
      postCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(ensureFirestore(), GROUPS_COLLECTION), groupData);
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
    const docRef = doc(ensureFirestore(), GROUPS_COLLECTION, groupId);
    await updateDoc(docRef, {
      members: arrayUnion(userId),
      memberCount: increment(1),
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
    const docRef = doc(ensureFirestore(), GROUPS_COLLECTION, groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId),
      memberCount: increment(-1),
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
  images?: string[];
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  postType?: string;
  challengeId?: string;
  challengeName?: string;
}): Promise<string> => {
  try {
    const postData: Record<string, any> = {
      authorId: data.userId, // Use authorId to match web app
      userId: data.userId, // Also include userId for mobile app compatibility
      content: data.content,
      groupId: data.groupId || null,
      likes: [],
      comments: [],
      media: data.media || [],
      images: data.media?.filter(m => m.type === 'image').map(m => m.url) || data.images || [], // Backwards compat
      postType: data.postType || 'update',
      timestamp: serverTimestamp(), // Use timestamp to match web app
      createdAt: serverTimestamp(), // Also include createdAt for mobile feed query
    };

    if (data.challengeId) postData.challengeId = data.challengeId;
    if (data.challengeName) postData.challengeName = data.challengeName;

    const docRef = await addDoc(collection(ensureFirestore(), POSTS_COLLECTION), postData);

    // Update group's lastActivityAt and postCount if this is a group post
    if (data.groupId) {
      try {
        const groupRef = doc(ensureFirestore(), GROUPS_COLLECTION, data.groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const currentPostCount = groupSnap.data().postCount || 0;
          await updateDoc(groupRef, {
            lastActivityAt: serverTimestamp(),
            postCount: currentPostCount + 1,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (groupError) {
        console.warn('Failed to update group activity:', groupError);
        // Don't fail the post creation if group update fails
      }
    }

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
    // Note: Posts use 'timestamp' field (matching web app format)
    const q = query(
      collection(ensureFirestore(), POSTS_COLLECTION),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc')
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
    const docRef = doc(ensureFirestore(), POSTS_COLLECTION, postId);
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
 * Note: serverTimestamp() cannot be used inside arrayUnion(), so we use Timestamp.now() for comments
 * Stores authorName for efficient comment preview display
 */
export const addCommentToPost = async (
  postId: string,
  comment: {
    userId: string;
    text: string;
    authorName?: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(ensureFirestore(), POSTS_COLLECTION, postId);

    // First, get the current post to check its structure
    const postSnap = await getDoc(docRef);
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const currentData = postSnap.data();
    const currentComments = currentData.comments || [];

    console.log('[addCommentToPost] Current comments count:', currentComments.length);
    console.log('[addCommentToPost] Adding comment for user:', comment.userId);

    // Create the new comment object
    const newComment = {
      userId: comment.userId,
      content: comment.text,
      authorName: comment.authorName || 'Someone',
      likes: [],
      createdAt: Timestamp.now(),
    };

    // Use set with merge to ensure comments array exists, or just append
    await updateDoc(docRef, {
      comments: [...currentComments, newComment],
      updatedAt: serverTimestamp(),
    });

    // Verify the comment was saved
    const verifySnap = await getDoc(docRef);
    const verifyData = verifySnap.data();
    console.log('[addCommentToPost] Verified comments count after save:', verifyData?.comments?.length);
    console.log('[addCommentToPost] Comment added successfully');
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

    const firestore = ensureFirestore();
    const connectionsRef = collection(firestore, CONNECTIONS_COLLECTION);

    // Check for existing connection between these users using participants array
    // This uses the existing participants + status composite index
    const existingQuery = query(
      connectionsRef,
      where('participants', 'array-contains', requesterId),
      where('status', 'in', ['pending', 'accepted'])
    );

    try {
      const existingSnapshot = await getDocs(existingQuery);
      const existingConnection = existingSnapshot.docs.find((doc) => {
        const data = doc.data();
        const participants = data.participants || [];
        return participants.includes(addresseeId);
      });

      if (existingConnection) {
        const existingStatus = existingConnection.data().status;
        throw new Error(
          existingStatus === 'accepted'
            ? 'You are already connected with this user'
            : 'A connection request is already pending'
        );
      }
    } catch (error: any) {
      // Re-throw our own errors (duplicate detection)
      if (error.message?.includes('already')) throw error;
      // Log but don't block on query failures (e.g., missing index)
      console.warn('[sendConnectionRequest] Duplicate check failed:', error.message);
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

    const docRef = await addDoc(connectionsRef, connectionData);
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
    const docRef = doc(ensureFirestore(), CONNECTIONS_COLLECTION, connectionId);
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
    const docRef = doc(ensureFirestore(), CONNECTIONS_COLLECTION, connectionId);
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
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('status', '==', 'accepted')
    );

    // Query 2 & 3: Mobile app format (a/b fields)
    const qMobile1 = query(
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('a', '==', userId),
      where('status', '==', 'accepted')
    );

    const qMobile2 = query(
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
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
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('addresseeId', '==', userId),
      where('status', '==', 'pending')
    );

    // Query 2 & 3: Mobile app format (a/b fields)
    const qMobile1 = query(
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('a', '==', userId),
      where('status', '==', 'pending')
    );

    const qMobile2 = query(
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('b', '==', userId),
      where('status', '==', 'pending')
    );

    const [webSnapshot, mobile1Snapshot, mobile2Snapshot] = await Promise.all([
      getDocs(qWeb),
      getDocs(qMobile1),
      getDocs(qMobile2),
    ]);

    console.log('[fetchIncomingRequests] Query results - web:', webSnapshot.docs.length, 'mobile(a):', mobile1Snapshot.docs.length, 'mobile(b):', mobile2Snapshot.docs.length);

    // Combine all results, deduplicate by requester so only one card per person
    const requestByRequester = new Map();

    [...webSnapshot.docs, ...mobile1Snapshot.docs, ...mobile2Snapshot.docs].forEach((doc) => {
      const data = doc.data();
      const requester = data.requester || data.requesterId || '';

      // Only include if user is NOT the requester (incoming requests only)
      if (requester && requester !== userId) {
        const existing = requestByRequester.get(requester);
        const entry = {
          id: doc.id,
          a: data.a || (data.participants ? data.participants[0] : ''),
          b: data.b || (data.participants ? data.participants[1] : ''),
          status: data.status,
          requester,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };

        // Keep the most recent request per requester
        if (!existing || (data.createdAt && existing.createdAt && data.createdAt > existing.createdAt)) {
          requestByRequester.set(requester, entry);
        }
      }
    });

    const requests = Array.from(requestByRequester.values());
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
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
      where('requesterId', '==', userId),
      where('status', '==', 'pending')
    );

    // Query 2: Mobile app format (requester field)
    const qMobile = query(
      collection(ensureFirestore(), CONNECTIONS_COLLECTION),
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
    const docRef = doc(ensureFirestore(), USERS_COLLECTION, userId);
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
  // Minimum 3 characters to prevent overly broad queries
  if (!searchQuery || searchQuery.trim().length < 3) return [];

  try {
    // Server-side prefix search with limit to avoid fetching all users.
    // Uses displayName range query with post-fetch filter for searchable opt-out.
    // TODO: Replace with server-side full-text search (Algolia or Firebase Extension)
    // for better search quality and scalability.
    const q = query(
      collection(ensureFirestore(), USERS_COLLECTION),
      where('displayName', '>=', searchQuery),
      where('displayName', '<=', searchQuery + '\uf8ff'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile))
      .filter((user) => (user as any).searchable !== false);
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// ==========================================
// GROUP PROMPTS
// ==========================================

const GROUP_PROMPTS_COLLECTION = 'groupPrompts';

/**
 * Get active group prompt for a group
 */
export const getGroupPrompt = async (groupId: string): Promise<GroupPrompt | null> => {
  const q = query(
    collection(ensureFirestore(), GROUP_PROMPTS_COLLECTION),
    where('groupId', '==', groupId),
    where('active', '==', true),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GroupPrompt;
};

/**
 * Create or update a group prompt
 * Deactivates existing prompts for the group first
 */
export const createGroupPrompt = async (data: {
  groupId: string;
  prompt: string;
  dayOfWeek?: number;
}): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in');

  const firestore = ensureFirestore();

  // Deactivate existing prompts for this group
  const existing = await getDocs(
    query(
      collection(firestore, GROUP_PROMPTS_COLLECTION),
      where('groupId', '==', data.groupId),
      where('active', '==', true)
    )
  );
  const batch = writeBatch(firestore);
  existing.docs.forEach(existingDoc => {
    batch.update(existingDoc.ref, { active: false, updatedAt: serverTimestamp() });
  });

  const promptRef = doc(collection(firestore, GROUP_PROMPTS_COLLECTION));
  batch.set(promptRef, {
    groupId: data.groupId,
    prompt: data.prompt,
    frequency: 'weekly',
    dayOfWeek: data.dayOfWeek ?? 1,
    createdBy: user.uid,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return promptRef.id;
};

/**
 * Ensure a weekly prompt post exists for the current week
 * Creates a post with the prompt content if one doesn't exist yet
 */
export const ensureWeeklyPromptPost = async (
  groupId: string,
  prompt: GroupPrompt
): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const firestore = ensureFirestore();

  // Check if a prompt post exists for this week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Only create if it's past the scheduled day
  const scheduledDay = prompt.dayOfWeek || 1;
  const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  if (currentDay < scheduledDay) return;

  // Check if prompt post already exists this week by looking for recent posts with isGroupPrompt
  const q = query(
    collection(firestore, POSTS_COLLECTION),
    where('groupId', '==', groupId),
    where('isGroupPrompt', '==', true),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const lastPromptPost = snapshot.docs[0].data();
      const postDate = lastPromptPost.createdAt?.toDate ? lastPromptPost.createdAt.toDate() : new Date(lastPromptPost.createdAt);
      if (postDate >= monday) return; // Already created this week
    }

    // Create the prompt post
    await addDoc(collection(firestore, POSTS_COLLECTION), {
      userId: prompt.createdBy,
      authorId: prompt.createdBy,
      groupId: groupId,
      content: prompt.prompt,
      isGroupPrompt: true,
      promptId: prompt.id,
      likes: [],
      comments: [],
      media: [],
      images: [],
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error ensuring weekly prompt post:', error);
  }
};
