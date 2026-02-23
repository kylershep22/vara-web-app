/**
 * Challenges Service
 * Firebase operations for time-limited group challenges
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
  arrayRemove,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Challenge,
  ChallengeCheckIn,
  ChallengeParticipant,
  ChallengeStatus,
  ChallengeFrequency,
  GroupCategory,
} from '../../types/models';
import { getAuth } from 'firebase/auth';
import { createPost } from './community.service';

const CHALLENGES_COLLECTION = 'challenges';
const CHALLENGE_PARTICIPANTS_COLLECTION = 'challengeParticipants';
const CHALLENGE_CHECKINS_COLLECTION = 'challengeCheckIns';

// ==========================================
// CHALLENGE CRUD OPERATIONS
// ==========================================

export interface CreateChallengeInput {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  category?: GroupCategory;
  challengeGoal: string;
  startDate: Date;
  endDate: Date;
  frequency: ChallengeFrequency;
  targetCount: number;
  unit?: string;
  invitePermission?: 'owner_only' | 'all_members';
  sourceGroupId?: string;
}

/**
 * Create a new challenge
 */
export async function createChallenge(input: CreateChallengeInput): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const now = new Date();
  const startDate = new Date(input.startDate);
  const status: ChallengeStatus = startDate > now ? 'upcoming' : 'active';

  const challengeData = {
    ownerId: user.uid,
    name: input.name,
    description: input.description || '',
    visibility: input.visibility,
    members: [user.uid],
    memberCount: 1,
    category: input.category || 'other',
    coverImage: null,
    type: 'challenge' as const,
    challengeGoal: input.challengeGoal,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(new Date(input.endDate)),
    frequency: input.frequency,
    targetCount: input.targetCount,
    unit: input.unit || 'times',
    status,
    lastActivityAt: serverTimestamp(),
    postCount: 0,
    totalCheckIns: 0,
    invitePermission: input.invitePermission || 'owner_only',
    sourceGroupId: input.sourceGroupId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, CHALLENGES_COLLECTION), challengeData);

  // Create participant record for the owner
  await createParticipant(docRef.id, user.uid, user.displayName || 'Anonymous', user.photoURL ?? undefined);

  return docRef.id;
}

/**
 * Fetch all challenges (optionally filtered)
 * Note: Due to Firestore security rules, we can only fetch:
 * - Public challenges (visibility == 'public')
 * - Challenges where the user is a member
 * The 'all' filter fetches public challenges + user's challenges and merges them
 */
export async function fetchChallenges(
  filter: 'all' | 'my' | 'public' | 'active' = 'all',
  userId?: string
): Promise<Challenge[]> {
  const auth = getAuth();
  const currentUserId = userId || auth.currentUser?.uid;

  switch (filter) {
    case 'my':
      if (!currentUserId) return [];
      const myQuery = query(
        collection(db, CHALLENGES_COLLECTION),
        where('members', 'array-contains', currentUserId),
        orderBy('startDate', 'desc')
      );
      const mySnapshot = await getDocs(myQuery);
      return mySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Challenge[];

    case 'public':
      const publicQuery = query(
        collection(db, CHALLENGES_COLLECTION),
        where('visibility', '==', 'public'),
        orderBy('startDate', 'desc')
      );
      const publicSnapshot = await getDocs(publicQuery);
      return publicSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Challenge[];

    case 'active':
      // For active filter, we need to query public active challenges
      // since we can't query all challenges due to security rules
      const activeQuery = query(
        collection(db, CHALLENGES_COLLECTION),
        where('visibility', '==', 'public'),
        where('status', '==', 'active'),
        orderBy('startDate', 'desc')
      );
      const activeSnapshot = await getDocs(activeQuery);
      return activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Challenge[];

    case 'all':
    default:
      // Fetch both public challenges and user's challenges, then merge
      const publicAllQuery = query(
        collection(db, CHALLENGES_COLLECTION),
        where('visibility', '==', 'public'),
        orderBy('startDate', 'desc')
      );
      const publicAllSnapshot = await getDocs(publicAllQuery);
      const publicChallenges = publicAllSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Challenge[];

      // If user is logged in, also fetch their private challenges
      if (currentUserId) {
        const myChallengesQuery = query(
          collection(db, CHALLENGES_COLLECTION),
          where('members', 'array-contains', currentUserId),
          orderBy('startDate', 'desc')
        );
        const myChallengesSnapshot = await getDocs(myChallengesQuery);
        const myChallenges = myChallengesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Challenge[];

        // Merge and deduplicate (user's challenges might include public ones they joined)
        const challengeMap = new Map<string, Challenge>();
        publicChallenges.forEach((c) => challengeMap.set(c.id, c));
        myChallenges.forEach((c) => challengeMap.set(c.id, c));

        // Sort by startDate descending
        return Array.from(challengeMap.values()).sort((a, b) => {
          const aDate = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate as any);
          const bDate = b.startDate instanceof Timestamp ? b.startDate.toDate() : new Date(b.startDate as any);
          return bDate.getTime() - aDate.getTime();
        });
      }

      return publicChallenges;
  }
}

/**
 * Fetch a single challenge by ID
 */
export async function fetchChallengeById(challengeId: string): Promise<Challenge | null> {
  const docRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Challenge;
}

/**
 * Update challenge details
 */
export async function updateChallenge(
  challengeId: string,
  updates: Partial<Pick<Challenge, 'name' | 'description' | 'visibility' | 'category' | 'challengeGoal'>>
): Promise<void> {
  const docRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update challenge status (used by scheduled job or manual trigger)
 */
export async function updateChallengeStatus(challengeId: string, status: ChallengeStatus): Promise<void> {
  const docRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a challenge (owner only)
 */
export async function deleteChallenge(challengeId: string): Promise<void> {
  // Delete all participants
  const participantsQuery = query(
    collection(db, CHALLENGE_PARTICIPANTS_COLLECTION),
    where('challengeId', '==', challengeId)
  );
  const participantsSnap = await getDocs(participantsQuery);

  // Delete all check-ins
  const checkInsQuery = query(
    collection(db, CHALLENGE_CHECKINS_COLLECTION),
    where('challengeId', '==', challengeId)
  );
  const checkInsSnap = await getDocs(checkInsQuery);

  const batch = writeBatch(db);

  participantsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  checkInsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(doc(db, CHALLENGES_COLLECTION, challengeId));

  await batch.commit();
}

// ==========================================
// PARTICIPANT OPERATIONS
// ==========================================

/**
 * Create a participant record
 */
async function createParticipant(
  challengeId: string,
  userId: string,
  displayName: string,
  avatar?: string
): Promise<string> {
  const participantData: Omit<ChallengeParticipant, 'id'> = {
    challengeId,
    userId,
    displayName,
    avatar: avatar || null,
    joinedAt: serverTimestamp() as Timestamp,
    checkInCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckInDate: null,
    completedTarget: false,
  };

  const docRef = await addDoc(collection(db, CHALLENGE_PARTICIPANTS_COLLECTION), participantData);
  return docRef.id;
}

/**
 * Join a challenge
 */
export async function joinChallenge(challengeId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check if already a member
  const challenge = await fetchChallengeById(challengeId);
  if (!challenge) throw new Error('Challenge not found');

  if (challenge.members.includes(user.uid)) {
    throw new Error('Already a member of this challenge');
  }

  // Update challenge members
  const challengeRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  await updateDoc(challengeRef, {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  // Create participant record
  await createParticipant(challengeId, user.uid, user.displayName || 'Anonymous', user.photoURL || undefined);
}

/**
 * Leave a challenge
 */
export async function leaveChallenge(challengeId: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Update challenge members
  const challengeRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  await updateDoc(challengeRef, {
    members: arrayRemove(user.uid),
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  // Delete participant record
  const participantQuery = query(
    collection(db, CHALLENGE_PARTICIPANTS_COLLECTION),
    where('challengeId', '==', challengeId),
    where('userId', '==', user.uid)
  );
  const participantSnap = await getDocs(participantQuery);

  if (!participantSnap.empty) {
    await deleteDoc(participantSnap.docs[0].ref);
  }
}

/**
 * Fetch challenge participants (leaderboard)
 */
export async function fetchChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]> {
  const q = query(
    collection(db, CHALLENGE_PARTICIPANTS_COLLECTION),
    where('challengeId', '==', challengeId)
  );

  const snapshot = await getDocs(q);
  const participants = snapshot.docs.map((doc, index) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChallengeParticipant[];

  // Sort by checkInCount descending, then by streak
  participants.sort((a, b) => {
    if (b.checkInCount !== a.checkInCount) {
      return b.checkInCount - a.checkInCount;
    }
    return b.currentStreak - a.currentStreak;
  });

  // Assign ranks
  return participants.map((p, index) => ({
    ...p,
    rank: index + 1,
  }));
}

/**
 * Fetch current user's participant record for a challenge
 */
export async function fetchMyParticipation(challengeId: string): Promise<ChallengeParticipant | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  const q = query(
    collection(db, CHALLENGE_PARTICIPANTS_COLLECTION),
    where('challengeId', '==', challengeId),
    where('userId', '==', user.uid)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as ChallengeParticipant;
}

// ==========================================
// CHECK-IN OPERATIONS
// ==========================================

/**
 * Check in for today
 */
export async function checkIn(
  challengeId: string,
  note?: string,
  mood?: string,
  proofImageUrl?: string
): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if already checked in today
  const existingCheckIn = await fetchCheckInForDate(challengeId, user.uid, today);
  if (existingCheckIn) {
    throw new Error('Already checked in today');
  }

  // Create check-in
  const checkInData: Omit<ChallengeCheckIn, 'id'> = {
    challengeId,
    userId: user.uid,
    date: today,
    note: note || null,
    mood: mood || null,
    proofImageUrl: proofImageUrl || null,
    createdAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, CHALLENGE_CHECKINS_COLLECTION), checkInData);

  // Update participant stats
  await updateParticipantStats(challengeId, user.uid, today);

  // Update challenge total check-ins
  const challengeRef = doc(db, CHALLENGES_COLLECTION, challengeId);
  await updateDoc(challengeRef, {
    totalCheckIns: increment(1),
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create a feed post when a note is provided
  if (note) {
    try {
      const challenge = await fetchChallengeById(challengeId);
      await createPost({
        userId: user.uid,
        content: note,
        postType: 'update',
        challengeId,
        challengeName: challenge?.name || 'Challenge',
        groupId: challenge?.sourceGroupId || undefined,
      });
    } catch (postError) {
      // Non-critical: don't fail the check-in if the post creation fails
      console.error('Error creating check-in feed post:', postError);
    }
  }

  return docRef.id;
}

/**
 * Check if user already checked in for a specific date
 */
async function fetchCheckInForDate(
  challengeId: string,
  userId: string,
  date: string
): Promise<ChallengeCheckIn | null> {
  const q = query(
    collection(db, CHALLENGE_CHECKINS_COLLECTION),
    where('challengeId', '==', challengeId),
    where('userId', '==', userId),
    where('date', '==', date)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as ChallengeCheckIn;
}

/**
 * Update participant stats after check-in
 */
async function updateParticipantStats(
  challengeId: string,
  userId: string,
  checkInDate: string
): Promise<void> {
  const participation = await fetchMyParticipation(challengeId);
  if (!participation) return;

  const challenge = await fetchChallengeById(challengeId);
  if (!challenge) return;

  // Calculate streak
  const lastDate = participation.lastCheckInDate;
  let newStreak = 1;

  if (lastDate) {
    const lastCheckIn = new Date(lastDate);
    const today = new Date(checkInDate);
    const diffDays = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      newStreak = participation.currentStreak + 1;
    } else if (diffDays === 0) {
      // Same day (shouldn't happen but just in case)
      newStreak = participation.currentStreak;
    }
    // If diffDays > 1, streak resets to 1
  }

  const newCheckInCount = participation.checkInCount + 1;
  const newLongestStreak = Math.max(participation.longestStreak, newStreak);
  const completedTarget = newCheckInCount >= challenge.targetCount;

  // Find and update participant document
  const q = query(
    collection(db, CHALLENGE_PARTICIPANTS_COLLECTION),
    where('challengeId', '==', challengeId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const participantRef = snapshot.docs[0].ref;
    await updateDoc(participantRef, {
      checkInCount: newCheckInCount,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastCheckInDate: checkInDate,
      completedTarget,
    });
  }
}

/**
 * Fetch user's check-ins for a challenge
 */
export async function fetchMyCheckIns(challengeId: string): Promise<ChallengeCheckIn[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, CHALLENGE_CHECKINS_COLLECTION),
    where('challengeId', '==', challengeId),
    where('userId', '==', user.uid),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChallengeCheckIn[];
}

/**
 * Fetch all check-ins for a challenge (for activity feed)
 */
export async function fetchChallengeCheckIns(
  challengeId: string,
  limit: number = 20
): Promise<ChallengeCheckIn[]> {
  const q = query(
    collection(db, CHALLENGE_CHECKINS_COLLECTION),
    where('challengeId', '==', challengeId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChallengeCheckIn[];
}

/**
 * Check if user has checked in today
 */
export async function hasCheckedInToday(challengeId: string): Promise<boolean> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];
  const checkIn = await fetchCheckInForDate(challengeId, user.uid, today);
  return checkIn !== null;
}

/**
 * Fetch weekly check-in counts for all participants in a challenge
 * Returns a map of userId -> weekly check-in count
 */
export async function fetchWeeklyCheckInCounts(challengeId: string): Promise<Map<string, number>> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0]; // YYYY-MM-DD

  const q = query(
    collection(db, CHALLENGE_CHECKINS_COLLECTION),
    where('challengeId', '==', challengeId),
  );

  const snapshot = await getDocs(q);
  const weeklyCounts = new Map<string, number>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.date >= mondayStr) {
      const current = weeklyCounts.get(data.userId) || 0;
      weeklyCounts.set(data.userId, current + 1);
    }
  });

  return weeklyCounts;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate days remaining in challenge
 */
export function getDaysRemaining(endDate: Timestamp): number {
  const end = endDate.toDate();
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculate challenge progress percentage
 */
export function getChallengeProgress(checkInCount: number, targetCount: number): number {
  if (targetCount === 0) return 0;
  return Math.min(100, Math.round((checkInCount / targetCount) * 100));
}

/**
 * Format challenge duration
 */
export function formatChallengeDuration(startDate: Timestamp, endDate: Timestamp): string {
  const start = startDate.toDate();
  const end = endDate.toDate();
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return `${diffDays} day challenge`;
  if (diffDays <= 31) return `${Math.round(diffDays / 7)} week challenge`;
  return `${Math.round(diffDays / 30)} month challenge`;
}

/**
 * Format challenge position as "Day X of Y" or "Week X of Y"
 */
export function formatChallengePosition(startDate: any, endDate: any): string {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsed = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(Math.max(elapsed, 1), totalDays);

  if (totalDays <= 14) {
    return `Day ${currentDay} of ${totalDays}`;
  } else {
    const currentWeek = Math.ceil(currentDay / 7);
    const totalWeeks = Math.ceil(totalDays / 7);
    return `Week ${currentWeek} of ${totalWeeks}`;
  }
}

/**
 * Check if user is member of challenge
 */
export function isUserMemberOfChallenge(challenge: Challenge, userId?: string): boolean {
  const auth = getAuth();
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return false;
  return challenge.members.includes(uid);
}

/**
 * Fetch challenges created from a specific group
 * Uses existing indexed queries and filters client-side for sourceGroupId
 * to avoid requiring new composite indexes
 */
export async function fetchChallengesByGroup(groupId: string): Promise<Challenge[]> {
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  console.log('[fetchChallengesByGroup] Looking for challenges with sourceGroupId:', groupId);

  try {
    // Strategy: Query challenges the user can access, then filter by sourceGroupId
    // This avoids needing composite indexes on sourceGroupId

    const challengeMap = new Map<string, Challenge>();

    // Fetch public challenges (uses existing index)
    try {
      const publicQuery = query(
        collection(db, CHALLENGES_COLLECTION),
        where('visibility', '==', 'public'),
        orderBy('startDate', 'desc')
      );
      const publicSnapshot = await getDocs(publicQuery);
      console.log('[fetchChallengesByGroup] Total public challenges found:', publicSnapshot.docs.length);

      publicSnapshot.docs.forEach((doc) => {
        const challenge = { id: doc.id, ...doc.data() } as Challenge;
        console.log('[fetchChallengesByGroup] Public challenge:', challenge.name, '| sourceGroupId:', challenge.sourceGroupId);
        // Filter for this group's challenges
        if (challenge.sourceGroupId === groupId) {
          challengeMap.set(challenge.id, challenge);
        }
      });
    } catch (publicError) {
      console.error('[fetchChallengesByGroup] Error fetching public challenges:', publicError);
    }

    // If user is logged in, also fetch their challenges (uses existing index)
    if (currentUserId) {
      try {
        const myQuery = query(
          collection(db, CHALLENGES_COLLECTION),
          where('members', 'array-contains', currentUserId),
          orderBy('startDate', 'desc')
        );
        const mySnapshot = await getDocs(myQuery);
        console.log('[fetchChallengesByGroup] Total user challenges found:', mySnapshot.docs.length);

        mySnapshot.docs.forEach((doc) => {
          const challenge = { id: doc.id, ...doc.data() } as Challenge;
          console.log('[fetchChallengesByGroup] User challenge:', challenge.name, '| sourceGroupId:', challenge.sourceGroupId);
          // Filter for this group's challenges
          if (challenge.sourceGroupId === groupId) {
            challengeMap.set(challenge.id, challenge);
          }
        });
      } catch (myError) {
        console.error('[fetchChallengesByGroup] Error fetching user challenges:', myError);
      }
    }

    // Sort by startDate descending
    const challenges = Array.from(challengeMap.values());
    challenges.sort((a, b) => {
      const aDate = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate as any);
      const bDate = b.startDate instanceof Timestamp ? b.startDate.toDate() : new Date(b.startDate as any);
      return bDate.getTime() - aDate.getTime();
    });

    console.log('[fetchChallengesByGroup] Final matching challenges:', challenges.length);
    return challenges;
  } catch (error) {
    console.error('[fetchChallengesByGroup] Error:', error);
    return [];
  }
}
