import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/** Fetch moderation queue with pagination and filters */
export async function getModerationQueue({
  status = "pending",
  source = null,
  pageSize = 25,
  lastDoc = null,
} = {}) {
  const queueRef = collection(db, "moderationQueue");
  const constraints = [
    where("status", "==", status),
    orderBy("severity", "desc"),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  if (source) {
    constraints.splice(1, 0, where("source", "==", source));
  }
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(queueRef, ...constraints);
  const snap = await getDocs(q);

  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

/** Take a moderation action from the queue (updates queue item + creates audit entry) */
export async function takeQueueModerationAction({
  queueItemId,
  adminId,
  targetUserId,
  action,
  reason,
  duration = null,
}) {
  const queueRef = doc(db, "moderationQueue", queueItemId);
  await updateDoc(queueRef, {
    status: "reviewed",
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    action,
  });

  await addDoc(collection(db, "moderationActions"), {
    adminId,
    targetUserId,
    action,
    reason,
    duration,
    queueItemId,
    timestamp: serverTimestamp(),
  });
}

/** Take a direct moderation action on a user (no queue item involved) */
export async function takeDirectModerationAction({
  adminId,
  targetUserId,
  action,
  reason,
  duration = null,
}) {
  await addDoc(collection(db, "moderationActions"), {
    adminId,
    targetUserId,
    action,
    reason,
    duration,
    queueItemId: null,
    timestamp: serverTimestamp(),
  });
}

/** Get moderation stats for overview (uses count aggregation) */
export async function getModerationStats() {
  const pendingQuery = query(
    collection(db, "moderationQueue"),
    where("status", "==", "pending")
  );
  const urgentQuery = query(
    collection(db, "moderationQueue"),
    where("status", "==", "pending"),
    where("severity", "==", "high")
  );

  const [pendingSnap, urgentSnap] = await Promise.all([
    getCountFromServer(pendingQuery),
    getCountFromServer(urgentQuery),
  ]);

  return {
    pendingCount: pendingSnap.data().count,
    urgentCount: urgentSnap.data().count,
  };
}
