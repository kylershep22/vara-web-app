/**
 * Admin Challenges Service
 * Firebase operations for creating and managing global challenges
 */

import { db } from "../../firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const CHALLENGES = "challenges";
const PARTICIPANTS = "challengeParticipants";
const CHECKINS = "challengeCheckIns";

/** Create a global challenge */
export async function createGlobalChallenge(adminId, payload) {
  const data = {
    ...payload,
    ownerId: adminId,
    isGlobal: true,
    createdByAdmin: true,
    featured: payload.featured || false,
    members: [adminId],
    memberCount: 1,
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CHALLENGES), data);
  return ref.id;
}

/** Update a global challenge */
export async function updateGlobalChallenge(challengeId, patch) {
  const ref = doc(db, CHALLENGES, challengeId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

/** End a challenge early */
export async function endChallenge(challengeId) {
  const ref = doc(db, CHALLENGES, challengeId);
  await updateDoc(ref, {
    status: "ended",
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** List all global challenges */
export async function listGlobalChallenges() {
  const q = query(
    collection(db, CHALLENGES),
    where("isGlobal", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get participation stats for a challenge */
export async function getChallengeStats(challengeId) {
  const participantsSnap = await getDocs(
    query(
      collection(db, PARTICIPANTS),
      where("challengeId", "==", challengeId)
    )
  );
  const checkInsSnap = await getDocs(
    query(collection(db, CHECKINS), where("challengeId", "==", challengeId))
  );

  const participants = participantsSnap.docs.map((d) => d.data());
  const activeCount = participants.filter((p) => p.currentStreak > 0).length;

  return {
    totalParticipants: participantsSnap.size,
    activeParticipants: activeCount,
    totalCheckIns: checkInsSnap.size,
  };
}
