import { db } from "../../firebase";
import {
  doc, getDoc, updateDoc, collection, query, where,
  getDocs, orderBy, limit, startAfter, serverTimestamp
} from "firebase/firestore";

/** Check if a user has admin role */
export async function checkIsAdmin(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data().role === "admin";
}

/** Grant admin role to a user */
export async function grantAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "admin", updatedAt: serverTimestamp() });
}

/** Revoke admin role from a user */
export async function revokeAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "user", updatedAt: serverTimestamp() });
}

/** Search users by display name or email (case-insensitive client-side filter) */
export async function searchUsers(searchTerm, pageSize = 25) {
  const usersRef = collection(db, "users");
  const term = searchTerm.trim().toLowerCase();

  // Fetch users ordered by displayName, filter client-side for case-insensitive match
  const q = query(usersRef, orderBy("displayName"), limit(200));
  const snap = await getDocs(q);

  const users = snap.docs
    .filter(d => {
      const name = (d.data().displayName || "").toLowerCase();
      const email = (d.data().email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    })
    .slice(0, pageSize)
    .map(d => ({
      id: d.id,
      displayName: d.data().displayName,
      email: d.data().email,
      role: d.data().role || "user",
      moderationStatus: d.data().moderationStatus || "active",
      subscriptionType: d.data().subscription?.type || "unknown",
      createdAt: d.data().createdAt,
    }));

  return { users, lastDoc: null };
}

/** Get user detail for admin view (aggregated stats, no private content) */
export async function getAdminUserDetail(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();

  const [goalsSnap, habitsSnap, journalSnap, postsSnap, tasksSnap] = await Promise.all([
    getDocs(query(collection(db, "goals"), where("userId", "==", userId))),
    getDocs(query(collection(db, "habits"), where("userId", "==", userId))),
    getDocs(query(collection(db, "journalEntries"), where("userId", "==", userId))),
    getDocs(query(collection(db, "posts"), where("userId", "==", userId))),
    getDocs(query(collection(db, "tasks"), where("userId", "==", userId))),
  ]);

  const modHistorySnap = await getDocs(
    query(
      collection(db, "users", userId, "moderationHistory"),
      orderBy("timestamp", "desc")
    )
  );

  return {
    id: userId,
    displayName: userData.displayName,
    email: userData.email,
    avatar: userData.avatar || userData.photoURL,
    bio: userData.bio,
    role: userData.role || "user",
    moderationStatus: userData.moderationStatus || "active",
    suspendedUntil: userData.suspendedUntil,
    subscription: {
      type: userData.subscription?.type || "unknown",
      trialStartedAt: userData.subscription?.trialStartedAt,
      trialExpiresAt: userData.subscription?.trialExpiresAt,
      premiumStartedAt: userData.subscription?.premiumStartedAt,
      billingPeriod: userData.subscription?.billingPeriod,
    },
    createdAt: userData.createdAt,
    activityStats: {
      goals: goalsSnap.size,
      habits: habitsSnap.size,
      journalEntries: journalSnap.size,
      posts: postsSnap.size,
      tasks: tasksSnap.size,
    },
    moderationHistory: modHistorySnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })),
  };
}

/** Read a single analytics document */
export async function getAnalyticsDoc(docId) {
  const ref = doc(db, "adminAnalytics", docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
