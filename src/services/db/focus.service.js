import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp, Timestamp
} from "firebase/firestore";

/** List focus sessions for a user */
export async function listFocusSessions(userId, opts = {}) {
  const {
    max = 50,
    order = ["startedAt", "desc"]
  } = opts;

  const col = collection(db, "focusSessions");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy(order[0], order[1]),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single focus session by id */
export async function getFocusSession(id) {
  const ref = doc(db, "focusSessions", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Create a focus session */
export async function createFocusSession(userId, payload) {
  const col = collection(db, "focusSessions");
  const docData = {
    userId,
    duration: payload.duration ?? 25, // minutes
    type: payload.type ?? "pomodoro", // pomodoro, short-break, long-break
    completed: payload.completed ?? false,
    interrupted: payload.interrupted ?? false,
    tags: payload.tags ?? [],
    startedAt: serverTimestamp(),
    endedAt: payload.endedAt ?? null
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

/** Update a focus session (e.g., mark as completed) */
export async function updateFocusSession(id, patch) {
  const ref = doc(db, "focusSessions", id);
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Complete a focus session */
export async function completeFocusSession(id, interrupted = false) {
  const ref = doc(db, "focusSessions", id);
  await updateDoc(ref, {
    completed: !interrupted,
    interrupted: interrupted,
    endedAt: serverTimestamp()
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Get focus sessions for a date range */
export async function getFocusSessionsByDateRange(userId, startDate, endDate) {
  const col = collection(db, "focusSessions");
  const q = query(
    col,
    where("userId", "==", userId),
    where("startedAt", ">=", Timestamp.fromDate(startDate)),
    where("startedAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("startedAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Calculate total focus time for a user (in minutes) */
export async function calculateTotalFocusTime(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await getFocusSessionsByDateRange(userId, startDate, new Date());

  const totalMinutes = sessions
    .filter(s => s.completed && !s.interrupted)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  return totalMinutes;
}

/** Get focus statistics */
export async function getFocusStatistics(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await getFocusSessionsByDateRange(userId, startDate, new Date());

  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length,
    interruptedSessions: sessions.filter(s => s.interrupted).length,
    totalMinutes: sessions.filter(s => s.completed).reduce((sum, s) => sum + (s.duration || 0), 0),
    averageSessionLength: 0,
    pomodoroCount: sessions.filter(s => s.type === "pomodoro").length,
    breakCount: sessions.filter(s => s.type !== "pomodoro").length
  };

  if (stats.completedSessions > 0) {
    stats.averageSessionLength = Math.round(stats.totalMinutes / stats.completedSessions);
  }

  return stats;
}
