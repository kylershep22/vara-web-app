// src/services/communityService.js
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { sanitizeText, sanitizeTitle } from '../utils/sanitization';

/**
 * Helper: normalize a group record so the UI can rely on consistent fields.
 * - Ensures `isPublic` boolean exists (derived from `type`)
 * - Ensures `members` is an array and `memberCount` is a number
 */
const normalizeGroup = (raw, id) => {
  const members = Array.isArray(raw?.members) ? raw.members : [];
  const isPublic =
    typeof raw?.isPublic === "boolean"
      ? raw.isPublic
      : (raw?.type || "").toLowerCase() === "public";

  return {
    id,
    ...raw,
    isPublic,
    members,
    memberCount:
      typeof raw?.memberCount === "number" ? raw.memberCount : members.length
  };
};

/**
 * Helper: batch-fetch minimal profiles and return a map { userId: profile }
 * We only read users that aren't already present in the map.
 */
const getProfilesMap = async (userIds) => {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const out = {};
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          out[uid] = { id: snap.id, ...snap.data() };
        }
      } catch (e) {
        console.warn("getProfilesMap() failed for", uid, e);
      }
    })
  );
  return out;
};

/**
 * Helper: decide if viewer can see an author's public feed post based on profile privacy.
 * Supports:
 *   - profile.privacy in {"public","connections","private"}
 *   - legacy profile.visibility == "public"
 */
const canViewAuthorPublicPost = (authorProfile, viewerId, connectionIds) => {
  // Viewer can always see their own posts
  if (authorProfile?.id && viewerId && authorProfile.id === viewerId) return true;

  // Legacy: visibility === "public"
  if (authorProfile?.visibility === "public") return true;

  const privacy = authorProfile?.privacy || "public";
  if (privacy === "public") return true;

  const isConnected = Array.isArray(connectionIds)
    ? connectionIds.includes(authorProfile?.id)
    : false;

  // For both "connections" and "private", only show if connected.
  // (You can tighten "private" later if you never want these to appear in feeds.)
  if (privacy === "connections" || privacy === "private") {
    return isConnected;
  }

  // Default safe fallback
  return false;
};

// ------------------------
// POSTS
// ------------------------

export const createPost = async ({
  authorId,
  content,
  images = [],
  groupId = null
}) => {
  const postData = {
    authorId,
    content: sanitizeText(content),
    images,
    groupId, // null = public
    likes: [],
    comments: [],
    // Prefer serverTimestamp for consistency across clients
    timestamp: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "posts"), postData);
  return docRef.id;
};

/**
 * Fetch posts for the feed with privacy enforcement:
 *   - Group posts (post.groupId): visible if the viewer has joined that group (client passes joinedGroupIds)
 *   - Public posts (post.groupId == null): visible if:
 *        * author === viewer, OR
 *        * authorProfile.privacy === "public", OR
 *        * authorProfile.privacy in {"connections","private"} AND author is in viewer's connectionIds
 */
export const fetchFeedPosts = async ({
  userId,
  joinedGroupIds = [],
  connectionIds = []
}) => {
  const postsRef = collection(db, "posts");
  const qPosts = query(postsRef, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(qPosts);

  const allPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Collect authors to enforce privacy on public posts
  const authorIds = Array.from(
    new Set(
      allPosts
        .filter((p) => !p.groupId) // only public posts need privacy checks here
        .map((p) => p.authorId)
        .filter(Boolean)
    )
  );

  const profilesById = await getProfilesMap(authorIds);

  // Filter with both membership (for group posts) and privacy (for public posts)
  const filtered = allPosts.filter((post) => {
    // Group posts: viewer must be in that group
    if (post.groupId) {
      return (
        Array.isArray(joinedGroupIds) && joinedGroupIds.includes(post.groupId)
      );
    }

    // Public (no groupId): must pass profile privacy check
    const authorProfile = profilesById[post.authorId] || { id: post.authorId };
    return (
      post.authorId === userId ||
      canViewAuthorPublicPost(authorProfile, userId, connectionIds)
    );
  });

  return filtered;
};

// ------------------------
// COMMENTS
// ------------------------

export const addCommentToPost = async (postId, comment) => {
  if (!postId) return;

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return;

  const postData = postSnap.data();
  const sanitizedComment = comment?.text !== undefined
    ? { ...comment, text: sanitizeText(comment.text) }
    : comment;
  const updatedComments = [...(postData.comments || []), sanitizedComment];

  await updateDoc(postRef, {
    comments: updatedComments
  });
};

export const toggleCommentLike = async (postId, commentIndex, userId) => {
  if (!postId) return;

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return;

  const postData = postSnap.data();
  const comments = Array.isArray(postData.comments)
    ? [...postData.comments]
    : [];

  if (!comments[commentIndex]) return;

  const likes = new Set(comments[commentIndex].likes || []);
  if (likes.has(userId)) {
    likes.delete(userId);
  } else {
    likes.add(userId);
  }

  comments[commentIndex].likes = Array.from(likes);

  await updateDoc(postRef, {
    comments
  });
};

// ------------------------
// GROUPS
// ------------------------

export const createGroup = async ({
  name,
  description,
  type = "public",
  creatorId
}) => {
  const groupData = {
    name: sanitizeTitle(name),
    description: sanitizeText(description),
    type, // "public" or "private"
    isPublic: type === "public", // Add boolean for UI compatibility
    creatorId,
    createdBy: creatorId, // Add for backwards compatibility
    ownerId: creatorId, // Add for backwards compatibility
    members: [creatorId],
    memberCount: 1,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "groups"), groupData);
  return docRef.id;
};

export const fetchUserGroups = async (userId) => {
  const qUserGroups = query(
    collection(db, "groups"),
    where("members", "array-contains", userId)
  );
  const snapshot = await getDocs(qUserGroups);

  return snapshot.docs.map((d) => normalizeGroup(d.data(), d.id));
};

export const fetchPublicGroups = async () => {
  // Data layer stores `type: "public"`, but UI expects `isPublic`
  const qPublic = query(collection(db, "groups"), where("type", "==", "public"));
  const snapshot = await getDocs(qPublic);

  return snapshot.docs.map((d) => normalizeGroup(d.data(), d.id));
};

export const joinGroup = async (groupId, userId) => {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    members: arrayUnion(userId)
  });
};

export const leaveGroup = async (groupId, userId) => {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    members: arrayRemove(userId)
  });
};

export const getGroupInfo = async (groupId) => {
  const groupRef = doc(db, "groups", groupId);
  const snapshot = await getDoc(groupRef);
  if (snapshot.exists()) {
    return normalizeGroup(snapshot.data(), snapshot.id);
  }
  return null;
};

// ------------------------
// USERS
// ------------------------

export const getUserById = async (userId) => {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
};

// ------------------------
// POST LIKES
// ------------------------

export const togglePostLike = async (postId, userId) => {
  if (!postId) return;

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return;

  const postData = postSnap.data();
  const currentLikes = new Set(postData.likes || []);

  if (currentLikes.has(userId)) {
    currentLikes.delete(userId);
  } else {
    currentLikes.add(userId);
  }

  await updateDoc(postRef, {
    likes: Array.from(currentLikes)
  });
};

// ------------------------
// CONNECTIONS  (single `connections` collection, status-based)
// ------------------------
/**
 * connections/{id} doc shape:
 * {
 *   requesterId: string,
 *   addresseeId: string,
 *   participants: [requesterId, addresseeId], // exactly 2
 *   status: 'pending' | 'accepted' | 'declined' | 'canceled',
 *   createdAt: serverTimestamp()
 * }
 *
 * Firestore rules allow:
 * - create by requester only
 * - read by participants only
 * - update: ONLY `status` while the request is pending,
 *   - addressee -> 'accepted' | 'declined'
 *   - requester -> 'canceled'
 * - delete: not allowed from client
 */

// --- Helpers ---

/** Find an existing connection doc between two users (any status). */
const findConnectionBetween = async (uidA, uidB) => {
  const qA = query(
    collection(db, "connections"),
    where("participants", "array-contains", uidA)
  );
  const snap = await getDocs(qA);
  const match = snap.docs.find((d) => {
    const data = d.data();
    return Array.isArray(data?.participants) && data.participants.includes(uidB);
  });
  return match ? { id: match.id, ...match.data() } : null;
};

// --- Queries ---

/** Accepted connections where user participates. */
export const fetchUserConnections = async (userId) => {
  try {
    const qConn = query(
      collection(db, "connections"),
      where("participants", "array-contains", userId),
      where("status", "==", "accepted")
    );
    const snapshot = await getDocs(qConn);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching user connections:", error);
    return [];
  }
};

/** Pending requests addressed *to* user (they can accept/decline). */
export const fetchIncomingConnectionRequests = async (userId) => {
  const qReq = query(
    collection(db, "connections"),
    where("addresseeId", "==", userId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(qReq);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Pending requests created *by* user (they can cancel). */
export const fetchSentConnectionRequests = async (userId) => {
  const qReq = query(
    collection(db, "connections"),
    where("requesterId", "==", userId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(qReq);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// --- Mutations (status-only updates) ---

/** Create a new pending connection request (requester -> addressee). */
export const sendConnectionRequest = async (requesterId, addresseeId) => {
  try {
    if (!requesterId || !addresseeId) {
      return { status: "invalid" };
    }
    if (requesterId === addresseeId) {
      return { status: "invalid" };
    }

    // 1) Is there any existing connection doc between these users?
    const existing = await findConnectionBetween(requesterId, addresseeId);
    if (existing) {
      // If already accepted, treat as connected
      if (existing.status === "accepted") {
        return { status: "already_connected", connectionId: existing.id };
      }
      // If there's a pending request in either direction, surface it
      if (existing.status === "pending") {
        return { status: "already_pending", connectionId: existing.id };
      }
      // If declined/canceled exists, you may choose to create a *new* request.
      // We'll allow creating a fresh one below to restart the flow.
    }

    // 2) Create new pending request (must match rules exactly)
    const ref = await addDoc(collection(db, "connections"), {
      requesterId,
      addresseeId,
      participants: [requesterId, addresseeId],
      status: "pending",
      createdAt: serverTimestamp()
    });

    return { status: "created", connectionId: ref.id };
  } catch (e) {
    console.error("sendConnectionRequest() error:", e);
    return { status: "invalid" };
  }
};

/** Accept a pending request (only the addressee can do this per rules). */
export const acceptConnection = async (connectionId) => {
  await updateDoc(doc(db, "connections", connectionId), { status: "accepted" });
  return true;
};

/** Decline a pending request (only the addressee can do this per rules). */
export const declineConnection = async (connectionId) => {
  await updateDoc(doc(db, "connections", connectionId), { status: "declined" });
  return true;
};

/** Cancel a pending request (only the requester can do this per rules). */
export const cancelConnectionRequest = async (connectionId) => {
  await updateDoc(doc(db, "connections", connectionId), { status: "canceled" });
  return true;
};

/**
 * Remove an existing connection
 * NOTE: Client-side delete is disabled by rules. If you need a "disconnect" feature,
 * you can implement a Cloud Function or add an authorized admin path.
 */
export const removeConnection = async (_connectionId) => {
  throw new Error(
    "Client-side delete of connections is not allowed by security rules. Consider an admin action or Cloud Function."
  );
};

// ------------------------
// (Legacy) CLEANUPS from old model
// ------------------------
/**
 * Your old code used:
 *  - connections: { members: [A, B] }
 *  - connectionRequests collection
 * Both are now replaced by the single `connections` collection above.
 * Ensure any UI calls that referenced connectionRequests are updated to the new functions:
 *   - fetchIncomingConnectionRequests, fetchSentConnectionRequests
 *   - sendConnectionRequest, acceptConnection, declineConnection, cancelConnectionRequest
 */







