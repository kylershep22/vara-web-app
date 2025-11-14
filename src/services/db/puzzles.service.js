import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

/** Get today's puzzles */
export async function getTodaysPuzzles(date) {
  const col = collection(db, "puzzles");
  const q = query(
    col,
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a specific puzzle by ID */
export async function getPuzzle(id) {
  const ref = doc(db, "puzzles", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get puzzles by type and difficulty */
export async function getPuzzlesByType(type, difficulty = null, max = 10) {
  const col = collection(db, "puzzles");
  let q;

  if (difficulty) {
    q = query(
      col,
      where("type", "==", type),
      where("difficulty", "==", difficulty),
      orderBy("date", "desc"),
      limit(max)
    );
  } else {
    q = query(
      col,
      where("type", "==", type),
      orderBy("date", "desc"),
      limit(max)
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** List puzzle completions for a user */
export async function listPuzzleCompletions(userId, opts = {}) {
  const {
    max = 50,
    order = ["completedAt", "desc"]
  } = opts;

  const col = collection(db, "puzzleCompletions");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy(order[0], order[1]),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get completion for a specific puzzle */
export async function getPuzzleCompletion(userId, puzzleId) {
  const col = collection(db, "puzzleCompletions");
  const q = query(
    col,
    where("userId", "==", userId),
    where("puzzleId", "==", puzzleId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/** Create a puzzle completion */
export async function createPuzzleCompletion(userId, payload) {
  const col = collection(db, "puzzleCompletions");
  const docData = {
    userId,
    puzzleId: payload.puzzleId,
    completed: payload.completed ?? true,
    timeSpent: payload.timeSpent ?? 0, // seconds
    score: payload.score ?? 0,
    hints: payload.hints ?? 0,
    completedAt: serverTimestamp()
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

/** Update a puzzle completion */
export async function updatePuzzleCompletion(id, patch) {
  const ref = doc(db, "puzzleCompletions", id);
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Calculate user's puzzle streak */
export async function calculatePuzzleStreak(userId) {
  const completions = await listPuzzleCompletions(userId, { max: 365, order: ["completedAt", "desc"] });

  if (completions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = new Set();
  completions.forEach(c => {
    if (c.completedAt && c.completedAt.toDate) {
      const date = c.completedAt.toDate();
      date.setHours(0, 0, 0, 0);
      dates.add(date.getTime());
    }
  });

  const sortedDates = Array.from(dates).sort((a, b) => b - a);

  // Check if streak is current (includes today or yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!sortedDates.includes(today.getTime()) && !sortedDates.includes(yesterday.getTime())) {
    return 0;
  }

  // Count consecutive days
  let checkDate = new Date(sortedDates[0]);
  for (const dateTime of sortedDates) {
    if (dateTime === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
