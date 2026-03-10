/**
 * Challenges Service
 * Firebase operations for time-limited group challenges
 * Ported from mobile/src/services/firebase/challenges.service.ts
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
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';

const CHALLENGES = 'challenges';
const PARTICIPANTS = 'challengeParticipants';
const CHECKINS = 'challengeCheckIns';

// ==========================================
// CHALLENGE CRUD
// ==========================================

export async function createChallenge(input) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const now = new Date();
  const startDate = new Date(input.startDate);
  const status = startDate > now ? 'upcoming' : 'active';

  const challengeData = {
    ownerId: user.uid,
    name: input.name,
    description: input.description || '',
    visibility: input.visibility,
    members: [user.uid],
    memberCount: 1,
    category: input.category || 'other',
    coverImage: null,
    type: 'challenge',
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

  const docRef = await addDoc(collection(db, CHALLENGES), challengeData);
  await _createParticipant(docRef.id, user.uid, user.displayName || 'Anonymous', user.photoURL);
  return docRef.id;
}

export async function fetchChallenges(filter = 'all', userId) {
  const auth = getAuth();
  const currentUserId = userId || auth.currentUser?.uid;

  if (filter === 'my') {
    if (!currentUserId) return [];
    const q = query(collection(db, CHALLENGES), where('members', 'array-contains', currentUserId), orderBy('startDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  if (filter === 'public') {
    const q = query(collection(db, CHALLENGES), where('visibility', '==', 'public'), orderBy('startDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  if (filter === 'active') {
    const q = query(collection(db, CHALLENGES), where('visibility', '==', 'public'), where('status', '==', 'active'), orderBy('startDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // 'all' — merge public + user's challenges
  const publicQ = query(collection(db, CHALLENGES), where('visibility', '==', 'public'), orderBy('startDate', 'desc'));
  const publicSnap = await getDocs(publicQ);
  const map = new Map();
  publicSnap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));

  if (currentUserId) {
    const myQ = query(collection(db, CHALLENGES), where('members', 'array-contains', currentUserId), orderBy('startDate', 'desc'));
    const mySnap = await getDocs(myQ);
    mySnap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  }

  return Array.from(map.values()).sort((a, b) => {
    const ad = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
    const bd = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
    return bd - ad;
  });
}

export async function fetchChallengeById(challengeId) {
  const snap = await getDoc(doc(db, CHALLENGES, challengeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateChallenge(challengeId, updates) {
  await updateDoc(doc(db, CHALLENGES, challengeId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteChallenge(challengeId) {
  const pSnap = await getDocs(query(collection(db, PARTICIPANTS), where('challengeId', '==', challengeId)));
  const cSnap = await getDocs(query(collection(db, CHECKINS), where('challengeId', '==', challengeId)));
  const batch = writeBatch(db);
  pSnap.docs.forEach((d) => batch.delete(d.ref));
  cSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, CHALLENGES, challengeId));
  await batch.commit();
}

// ==========================================
// PARTICIPANTS
// ==========================================

async function _createParticipant(challengeId, userId, displayName, avatar) {
  const data = {
    challengeId,
    userId,
    displayName,
    avatar: avatar || null,
    joinedAt: serverTimestamp(),
    checkInCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckInDate: null,
    completedTarget: false,
  };
  const ref = await addDoc(collection(db, PARTICIPANTS), data);
  return ref.id;
}

export async function joinChallenge(challengeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const challenge = await fetchChallengeById(challengeId);
  if (!challenge) throw new Error('Challenge not found');
  if (challenge.members.includes(user.uid)) throw new Error('Already a member');

  await updateDoc(doc(db, CHALLENGES, challengeId), {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await _createParticipant(challengeId, user.uid, user.displayName || 'Anonymous', user.photoURL);
}

export async function leaveChallenge(challengeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  await updateDoc(doc(db, CHALLENGES, challengeId), {
    members: arrayRemove(user.uid),
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  const q = query(collection(db, PARTICIPANTS), where('challengeId', '==', challengeId), where('userId', '==', user.uid));
  const snap = await getDocs(q);
  if (!snap.empty) await deleteDoc(snap.docs[0].ref);
}

export async function fetchChallengeLeaderboard(challengeId) {
  const q = query(collection(db, PARTICIPANTS), where('challengeId', '==', challengeId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchMyParticipation(challengeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  const q = query(collection(db, PARTICIPANTS), where('challengeId', '==', challengeId), where('userId', '==', user.uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ==========================================
// CHECK-INS
// ==========================================

export async function checkIn(challengeId, note, mood, proofImageUrl) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const today = new Date().toISOString().split('T')[0];
  const existing = await _fetchCheckInForDate(challengeId, user.uid, today);
  if (existing) throw new Error('Already checked in today');

  const data = {
    challengeId,
    userId: user.uid,
    date: today,
    note: note || null,
    mood: mood || null,
    proofImageUrl: proofImageUrl || null,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, CHECKINS), data);
  await _updateParticipantStats(challengeId, user.uid, today);
  await updateDoc(doc(db, CHALLENGES, challengeId), {
    totalCheckIns: increment(1),
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

async function _fetchCheckInForDate(challengeId, userId, date) {
  const q = query(collection(db, CHECKINS), where('challengeId', '==', challengeId), where('userId', '==', userId), where('date', '==', date));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function _updateParticipantStats(challengeId, userId, checkInDate) {
  const participation = await fetchMyParticipation(challengeId);
  if (!participation) return;
  const challenge = await fetchChallengeById(challengeId);
  if (!challenge) return;

  const lastDate = participation.lastCheckInDate;
  let newStreak = 1;
  if (lastDate) {
    const diff = Math.floor((new Date(checkInDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
    if (diff === 1) newStreak = participation.currentStreak + 1;
    else if (diff === 0) newStreak = participation.currentStreak;
  }

  const newCount = participation.checkInCount + 1;
  const q = query(collection(db, PARTICIPANTS), where('challengeId', '==', challengeId), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, {
      checkInCount: newCount,
      currentStreak: newStreak,
      longestStreak: Math.max(participation.longestStreak, newStreak),
      lastCheckInDate: checkInDate,
      completedTarget: newCount >= challenge.targetCount,
    });
  }
}

export async function fetchMyCheckIns(challengeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(collection(db, CHECKINS), where('challengeId', '==', challengeId), where('userId', '==', user.uid), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function hasCheckedInToday(challengeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];
  const checkIn = await _fetchCheckInForDate(challengeId, user.uid, today);
  return checkIn !== null;
}

// ==========================================
// UTILITIES
// ==========================================

export function getDaysRemaining(endDate) {
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getChallengeProgress(checkInCount, targetCount) {
  if (targetCount === 0) return 0;
  return Math.min(100, Math.round((checkInCount / targetCount) * 100));
}

export function formatChallengeDuration(startDate, endDate) {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (days <= 7) return `${days} day challenge`;
  if (days <= 31) return `${Math.round(days / 7)} week challenge`;
  return `${Math.round(days / 30)} month challenge`;
}

export function formatChallengePosition(startDate, endDate) {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const elapsed = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(Math.max(elapsed, 1), totalDays);

  if (totalDays <= 14) return `Day ${currentDay} of ${totalDays}`;
  const currentWeek = Math.ceil(currentDay / 7);
  const totalWeeks = Math.ceil(totalDays / 7);
  return `Week ${currentWeek} of ${totalWeeks}`;
}
