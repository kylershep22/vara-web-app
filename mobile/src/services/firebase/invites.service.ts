/**
 * Invites Service
 * Firebase operations for group and challenge invitations
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import {
  Group,
  Challenge,
  GroupInvite,
  ChallengeInvite,
  InviteStatus,
} from '../../types/models';

const GROUPS_COLLECTION = 'groups';
const CHALLENGES_COLLECTION = 'challenges';
const GROUP_INVITES_COLLECTION = 'groupInvites';
const CHALLENGE_INVITES_COLLECTION = 'challengeInvites';
const CHALLENGE_PARTICIPANTS_COLLECTION = 'challengeParticipants';
const USERS_COLLECTION = 'users';

// ==========================================
// PERMISSION CHECKS
// ==========================================

/**
 * Check if a user can invite others to a group
 */
export async function canUserInviteToGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) return false;

    const group = groupSnap.data() as Group;

    // Owner can always invite
    if (group.ownerId === userId) return true;

    // Check if user is a member and invitePermission allows all members to invite
    const isMember = group.members?.includes(userId);
    const invitePermission = group.invitePermission || 'owner_only';

    return isMember && invitePermission === 'all_members';
  } catch (error) {
    console.error('Error checking group invite permission:', error);
    return false;
  }
}

/**
 * Check if a user can invite others to a challenge
 */
export async function canUserInviteToChallenge(challengeId: string, userId: string): Promise<boolean> {
  try {
    const challengeRef = doc(db, CHALLENGES_COLLECTION, challengeId);
    const challengeSnap = await getDoc(challengeRef);

    if (!challengeSnap.exists()) return false;

    const challenge = challengeSnap.data() as Challenge;

    // Owner can always invite
    if (challenge.ownerId === userId) return true;

    // Check if user is a member and invitePermission allows all members to invite
    const isMember = challenge.members?.includes(userId);
    const invitePermission = challenge.invitePermission || 'owner_only';

    return isMember && invitePermission === 'all_members';
  } catch (error) {
    console.error('Error checking challenge invite permission:', error);
    return false;
  }
}

// ==========================================
// GROUP INVITE OPERATIONS
// ==========================================

/**
 * Send a group invite
 */
export async function sendGroupInvite(
  groupId: string,
  inviteeId: string
): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check permission
  const canInvite = await canUserInviteToGroup(groupId, user.uid);
  if (!canInvite) throw new Error('You do not have permission to invite members to this group');

  // Get group info for denormalized name
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Group not found');
  const group = groupSnap.data() as Group;

  // Check if invitee is already a member
  if (group.members?.includes(inviteeId)) {
    throw new Error('User is already a member of this group');
  }

  // Check for existing pending invite
  const existingInvite = await getExistingGroupInvite(groupId, inviteeId);
  if (existingInvite && existingInvite.status === 'pending') {
    throw new Error('An invite has already been sent to this user');
  }

  const inviteData: Omit<GroupInvite, 'id'> = {
    groupId,
    groupName: group.name,
    inviterId: user.uid,
    inviterName: user.displayName || 'Someone',
    inviteeId,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, GROUP_INVITES_COLLECTION), inviteData);
  return docRef.id;
}

/**
 * Send group invites to multiple users
 */
export async function sendGroupInvites(
  groupId: string,
  inviteeIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const inviteeId of inviteeIds) {
    try {
      await sendGroupInvite(groupId, inviteeId);
      results.success.push(inviteeId);
    } catch (error) {
      console.warn(`Failed to send invite to ${inviteeId}:`, error);
      results.failed.push(inviteeId);
    }
  }

  return results;
}

/**
 * Get existing invite for a user to a group (sent by current user)
 */
async function getExistingGroupInvite(
  groupId: string,
  inviteeId: string
): Promise<GroupInvite | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  // Query only for invites sent by the current user to satisfy security rules
  const q = query(
    collection(db, GROUP_INVITES_COLLECTION),
    where('groupId', '==', groupId),
    where('inviterId', '==', user.uid),
    where('inviteeId', '==', inviteeId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as GroupInvite;
}

/**
 * Accept a group invite
 */
export async function acceptGroupInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, GROUP_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as GroupInvite;

  if (invite.inviteeId !== user.uid) {
    throw new Error('This invite is not for you');
  }

  if (invite.status !== 'pending') {
    throw new Error('This invite has already been responded to');
  }

  // Use batch to update both invite and group atomically
  const batch = writeBatch(db);

  // Update invite status
  batch.update(inviteRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  // Add user to group members
  const groupRef = doc(db, GROUPS_COLLECTION, invite.groupId);
  batch.update(groupRef, {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Decline a group invite
 */
export async function declineGroupInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, GROUP_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as GroupInvite;

  if (invite.inviteeId !== user.uid) {
    throw new Error('This invite is not for you');
  }

  if (invite.status !== 'pending') {
    throw new Error('This invite has already been responded to');
  }

  await updateDoc(inviteRef, {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get pending group invites for the current user
 */
export async function getPendingGroupInvites(): Promise<GroupInvite[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, GROUP_INVITES_COLLECTION),
    where('inviteeId', '==', user.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GroupInvite[];
}

/**
 * Get invites sent for a specific group
 */
export async function getGroupInvitesSent(groupId: string): Promise<GroupInvite[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, GROUP_INVITES_COLLECTION),
    where('groupId', '==', groupId),
    where('inviterId', '==', user.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GroupInvite[];
}

/**
 * Cancel a sent group invite
 */
export async function cancelGroupInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, GROUP_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as GroupInvite;

  if (invite.inviterId !== user.uid) {
    throw new Error('You can only cancel invites you sent');
  }

  await deleteDoc(inviteRef);
}

// ==========================================
// CHALLENGE INVITE OPERATIONS
// ==========================================

/**
 * Send a challenge invite
 */
export async function sendChallengeInvite(
  challengeId: string,
  inviteeId: string
): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check permission
  const canInvite = await canUserInviteToChallenge(challengeId, user.uid);
  if (!canInvite) throw new Error('You do not have permission to invite members to this challenge');

  // Get challenge info for denormalized name
  const challengeRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  const challengeSnap = await getDoc(challengeRef);
  if (!challengeSnap.exists()) throw new Error('Challenge not found');
  const challenge = challengeSnap.data() as Challenge;

  // Check if invitee is already a member
  if (challenge.members?.includes(inviteeId)) {
    throw new Error('User is already a member of this challenge');
  }

  // Check for existing pending invite
  const existingInvite = await getExistingChallengeInvite(challengeId, inviteeId);
  if (existingInvite && existingInvite.status === 'pending') {
    throw new Error('An invite has already been sent to this user');
  }

  const inviteData: Omit<ChallengeInvite, 'id'> = {
    challengeId,
    challengeName: challenge.name,
    inviterId: user.uid,
    inviterName: user.displayName || 'Someone',
    inviteeId,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, CHALLENGE_INVITES_COLLECTION), inviteData);
  return docRef.id;
}

/**
 * Send challenge invites to multiple users
 */
export async function sendChallengeInvites(
  challengeId: string,
  inviteeIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const inviteeId of inviteeIds) {
    try {
      await sendChallengeInvite(challengeId, inviteeId);
      results.success.push(inviteeId);
    } catch (error) {
      console.warn(`Failed to send invite to ${inviteeId}:`, error);
      results.failed.push(inviteeId);
    }
  }

  return results;
}

/**
 * Get existing invite for a user to a challenge
 */
async function getExistingChallengeInvite(
  challengeId: string,
  inviteeId: string
): Promise<ChallengeInvite | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  // Query only for invites sent by the current user to satisfy security rules
  const q = query(
    collection(db, CHALLENGE_INVITES_COLLECTION),
    where('challengeId', '==', challengeId),
    where('inviterId', '==', user.uid),
    where('inviteeId', '==', inviteeId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as ChallengeInvite;
}

/**
 * Accept a challenge invite
 */
export async function acceptChallengeInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, CHALLENGE_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as ChallengeInvite;

  if (invite.inviteeId !== user.uid) {
    throw new Error('This invite is not for you');
  }

  if (invite.status !== 'pending') {
    throw new Error('This invite has already been responded to');
  }

  // Use batch to update invite, challenge, and create participant
  const batch = writeBatch(db);

  // Update invite status
  batch.update(inviteRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  // Add user to challenge members
  const challengeRef = doc(db, CHALLENGES_COLLECTION, invite.challengeId);
  batch.update(challengeRef, {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  // Create participant record (can't be in batch due to addDoc)
  const participantData = {
    challengeId: invite.challengeId,
    userId: user.uid,
    displayName: user.displayName || 'Anonymous',
    avatar: user.photoURL || null,
    joinedAt: serverTimestamp(),
    checkInCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckInDate: null,
    completedTarget: false,
  };

  await addDoc(collection(db, CHALLENGE_PARTICIPANTS_COLLECTION), participantData);
}

/**
 * Decline a challenge invite
 */
export async function declineChallengeInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, CHALLENGE_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as ChallengeInvite;

  if (invite.inviteeId !== user.uid) {
    throw new Error('This invite is not for you');
  }

  if (invite.status !== 'pending') {
    throw new Error('This invite has already been responded to');
  }

  await updateDoc(inviteRef, {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get pending challenge invites for the current user
 */
export async function getPendingChallengeInvites(): Promise<ChallengeInvite[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, CHALLENGE_INVITES_COLLECTION),
    where('inviteeId', '==', user.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChallengeInvite[];
}

/**
 * Get invites sent for a specific challenge
 */
export async function getChallengeInvitesSent(challengeId: string): Promise<ChallengeInvite[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, CHALLENGE_INVITES_COLLECTION),
    where('challengeId', '==', challengeId),
    where('inviterId', '==', user.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChallengeInvite[];
}

/**
 * Cancel a sent challenge invite
 */
export async function cancelChallengeInvite(inviteId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const inviteRef = doc(db, CHALLENGE_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found');

  const invite = inviteSnap.data() as ChallengeInvite;

  if (invite.inviterId !== user.uid) {
    throw new Error('You can only cancel invites you sent');
  }

  await deleteDoc(inviteRef);
}

// ==========================================
// ALL PENDING INVITES
// ==========================================

/**
 * Get all pending invites (groups + challenges) for the current user
 */
export async function getAllPendingInvites(): Promise<{
  groups: GroupInvite[];
  challenges: ChallengeInvite[];
  total: number;
}> {
  const [groups, challenges] = await Promise.all([
    getPendingGroupInvites(),
    getPendingChallengeInvites(),
  ]);

  return {
    groups,
    challenges,
    total: groups.length + challenges.length,
  };
}

// ==========================================
// CREATE CHALLENGE FROM GROUP
// ==========================================

export interface CreateChallengeFromGroupInput {
  groupId: string;
  name: string;
  description?: string;
  challengeGoal: string;
  startDate: Date;
  endDate: Date;
  frequency: 'daily' | 'weekly' | 'total';
  targetCount: number;
  unit?: string;
  autoInviteMembers: boolean;
  invitePermission: 'owner_only' | 'all_members';
}

/**
 * Create a challenge from a group, optionally inviting all group members
 */
export async function createChallengeFromGroup(
  input: CreateChallengeFromGroupInput
): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Get group info
  const groupRef = doc(db, GROUPS_COLLECTION, input.groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Group not found');
  const group = groupSnap.data() as Group;

  // Verify user is the group owner or a member
  const isMember = group.members?.includes(user.uid);
  if (!isMember) throw new Error('You must be a member of this group to create a challenge');

  const now = new Date();
  const startDate = new Date(input.startDate);
  const status = startDate > now ? 'upcoming' : 'active';

  // Create challenge
  const challengeData = {
    ownerId: user.uid,
    name: input.name,
    description: input.description || '',
    visibility: group.visibility, // Inherit visibility from group
    members: [user.uid],
    memberCount: 1,
    category: group.category || 'other',
    coverImage: null,
    type: 'challenge' as const,
    challengeGoal: input.challengeGoal,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(new Date(input.endDate)),
    frequency: input.frequency,
    targetCount: input.targetCount,
    unit: input.unit || 'times',
    invitePermission: input.invitePermission,
    sourceGroupId: input.groupId,
    status,
    lastActivityAt: serverTimestamp(),
    postCount: 0,
    totalCheckIns: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const challengeDocRef = await addDoc(collection(db, CHALLENGES_COLLECTION), challengeData);
  const challengeId = challengeDocRef.id;

  // Create participant record for the owner
  await addDoc(collection(db, CHALLENGE_PARTICIPANTS_COLLECTION), {
    challengeId,
    userId: user.uid,
    displayName: user.displayName || 'Anonymous',
    avatar: user.photoURL || null,
    joinedAt: serverTimestamp(),
    checkInCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckInDate: null,
    completedTarget: false,
  });

  // Auto-invite group members if enabled
  if (input.autoInviteMembers) {
    const membersToInvite = group.members.filter((memberId) => memberId !== user.uid);

    // Send invites in batches (Firestore has limits)
    for (const inviteeId of membersToInvite) {
      try {
        const inviteData: Omit<ChallengeInvite, 'id'> = {
          challengeId,
          challengeName: input.name,
          inviterId: user.uid,
          inviterName: user.displayName || 'Someone',
          inviteeId,
          status: 'pending',
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };

        await addDoc(collection(db, CHALLENGE_INVITES_COLLECTION), inviteData);
      } catch (error) {
        console.warn(`Failed to send challenge invite to ${inviteeId}:`, error);
      }
    }
  }

  return challengeId;
}

// ==========================================
// HELPER: GET USER INFO FOR DISPLAY
// ==========================================

/**
 * Get basic user info for invite display
 */
export async function getUserDisplayInfo(userId: string): Promise<{
  id: string;
  displayName: string;
  avatar?: string;
} | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      id: userId,
      displayName: data.displayName || 'Unknown User',
      avatar: data.avatar || data.avatarUrl,
    };
  } catch (error) {
    console.error('Error getting user display info:', error);
    return null;
  }
}
