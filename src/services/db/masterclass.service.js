import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

/** List all available masterclasses */
export async function listMasterclasses(opts = {}) {
  const {
    max = 50,
    topic = null,
    difficulty = null
  } = opts;

  const col = collection(db, "masterclasses");
  let q;

  if (topic && difficulty) {
    q = query(
      col,
      where("topics", "array-contains", topic),
      where("difficulty", "==", difficulty),
      orderBy("publishedAt", "desc"),
      limit(max)
    );
  } else if (topic) {
    q = query(
      col,
      where("topics", "array-contains", topic),
      orderBy("publishedAt", "desc"),
      limit(max)
    );
  } else if (difficulty) {
    q = query(
      col,
      where("difficulty", "==", difficulty),
      orderBy("publishedAt", "desc"),
      limit(max)
    );
  } else {
    q = query(
      col,
      orderBy("publishedAt", "desc"),
      limit(max)
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single masterclass by id */
export async function getMasterclass(id) {
  const ref = doc(db, "masterclasses", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** List user's masterclass progress */
export async function listMasterclassProgress(userId, opts = {}) {
  const {
    max = 50,
    order = ["lastWatchedAt", "desc"],
    completedOnly = false
  } = opts;

  const col = collection(db, "masterclassProgress");
  let q;

  if (completedOnly) {
    q = query(
      col,
      where("userId", "==", userId),
      where("completed", "==", true),
      orderBy(order[0], order[1]),
      limit(max)
    );
  } else {
    q = query(
      col,
      where("userId", "==", userId),
      orderBy(order[0], order[1]),
      limit(max)
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get user's progress for a specific masterclass */
export async function getMasterclassProgress(userId, masterclassId) {
  const col = collection(db, "masterclassProgress");
  const q = query(
    col,
    where("userId", "==", userId),
    where("masterclassId", "==", masterclassId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/** Create or update masterclass progress */
export async function upsertMasterclassProgress(userId, masterclassId, payload) {
  const existing = await getMasterclassProgress(userId, masterclassId);

  if (existing) {
    // Update existing progress
    const ref = doc(db, "masterclassProgress", existing.id);
    await updateDoc(ref, {
      ...payload,
      lastWatchedAt: serverTimestamp()
    });
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
  } else {
    // Create new progress
    const col = collection(db, "masterclassProgress");
    const docData = {
      userId,
      masterclassId,
      started: true,
      completed: payload.completed ?? false,
      progress: payload.progress ?? 0,
      currentModule: payload.currentModule ?? 0,
      watchTime: payload.watchTime ?? 0,
      notes: payload.notes ?? "",
      bookmarks: payload.bookmarks ?? [],
      lastWatchedAt: serverTimestamp(),
      completedAt: payload.completed ? serverTimestamp() : null
    };
    const res = await addDoc(col, docData);
    return { id: res.id, ...docData };
  }
}

/** Mark masterclass as completed */
export async function completeMasterclass(userId, masterclassId) {
  const existing = await getMasterclassProgress(userId, masterclassId);

  if (existing) {
    const ref = doc(db, "masterclassProgress", existing.id);
    await updateDoc(ref, {
      completed: true,
      progress: 1.0,
      completedAt: serverTimestamp(),
      lastWatchedAt: serverTimestamp()
    });
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
  } else {
    return upsertMasterclassProgress(userId, masterclassId, {
      completed: true,
      progress: 1.0
    });
  }
}

/** Add bookmark to masterclass */
export async function addBookmark(userId, masterclassId, bookmark) {
  const existing = await getMasterclassProgress(userId, masterclassId);

  if (existing) {
    const updatedBookmarks = [...(existing.bookmarks || []), bookmark];
    const ref = doc(db, "masterclassProgress", existing.id);
    await updateDoc(ref, {
      bookmarks: updatedBookmarks
    });
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
  } else {
    return upsertMasterclassProgress(userId, masterclassId, {
      bookmarks: [bookmark]
    });
  }
}

/** Get learning statistics for user */
export async function getLearningStatistics(userId) {
  const allProgress = await listMasterclassProgress(userId, { max: 1000 });

  const stats = {
    coursesStarted: allProgress.filter(p => p.started).length,
    coursesCompleted: allProgress.filter(p => p.completed).length,
    totalWatchTime: allProgress.reduce((sum, p) => sum + (p.watchTime || 0), 0), // seconds
    averageProgress: 0,
    currentStreak: 0 // TODO: Calculate based on daily learning
  };

  if (stats.coursesStarted > 0) {
    const totalProgress = allProgress.reduce((sum, p) => sum + (p.progress || 0), 0);
    stats.averageProgress = Math.round((totalProgress / stats.coursesStarted) * 100);
  }

  return stats;
}
