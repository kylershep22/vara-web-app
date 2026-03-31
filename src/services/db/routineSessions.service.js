import { db } from "../../firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "focusSessions";

/**
 * Start a routine session. Returns the session doc ID.
 */
export async function startSession(userId, routine) {
  const ref = await addDoc(collection(db, COLLECTION), {
    userId,
    routineId: routine.id,
    routineName: routine.name,
    routineType: routine.type,
    totalActivities: routine.activities.length,
    activitiesCompleted: 0,
    completed: false,
    startedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

/**
 * Mark a session as complete.
 */
export async function completeSession(sessionId, activitiesCompleted) {
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    completed: true,
    activitiesCompleted,
    completedAt: serverTimestamp(),
  });
}
