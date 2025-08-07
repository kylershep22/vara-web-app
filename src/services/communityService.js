import { db } from '../../src/firebase';
import {
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// Create a new community post
export const createPost = async ({ authorId, content, images = [], groupId = null }) => {
  const postData = {
    authorId,
    content,
    images,
    groupId, // null = public
    likes: [],
    comments: [],
    timestamp: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, 'posts'), postData);
  return docRef.id;
};

// Fetch community posts for a user's feed
export const fetchFeedPosts = async ({ userId, joinedGroupIds = [], connectionIds = [] }) => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);

  const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return allPosts.filter(post =>
    (post.groupId && joinedGroupIds.includes(post.groupId)) ||
    (!post.groupId && connectionIds.includes(post.authorId))
  );
};

// Create a new group
export const createGroup = async ({ name, description, emoji, isPublic, createdBy }) => {
  const newGroup = {
    name,
    description,
    emoji,
    isPublic,
    createdBy,
    members: [createdBy],
    memberCount: 1,
    timestamp: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, 'groups'), newGroup);
  return docRef.id;
};

// Join or leave a group
export const updateGroupMembership = async (groupId, userId, join = true) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    members: join ? arrayUnion(userId) : arrayRemove(userId)
  });
};

// Fetch all groups the user is a member of
export const fetchUserGroups = async (userId) => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Fetch all public groups
export const fetchPublicGroups = async () => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('isPublic', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Fetch all connections for a user
export const fetchUserConnections = async (userId) => {
  const snapshot = await getDocs(query(
    collection(db, 'connections'),
    where('participants', 'array-contains', userId)
  ));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Accept or decline a group invitation
export const respondToInvitation = async (invitationId, accept = true, userId, groupId) => {
  const inviteRef = doc(db, 'invitations', invitationId);
  if (accept) {
    // Add user to group
    await updateGroupMembership(groupId, userId, true);
  }
  // Delete invitation after response
  await deleteDoc(inviteRef);
};

// Create user document on first signup
export const createUserProfile = async (userId, data) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...data,
    createdAt: Timestamp.now()
  });
};

// Fetch a single user by ID
export const getUserById = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? { id: userId, ...snapshot.data() } : null;
};

// Persist Comments in the Feed
export const addCommentToPost = async (postId, commentObj) => {
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    comments: arrayUnion(commentObj)
  });
};

