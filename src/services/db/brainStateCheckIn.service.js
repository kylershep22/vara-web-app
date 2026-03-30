import { db } from "../../firebase";
import {
  doc, getDoc, setDoc, updateDoc, query, collection,
  where, orderBy, limit, getDocs, serverTimestamp
} from "firebase/firestore";
import { getProtocolForState } from "../../constants/brainStateProtocols";

const COLLECTION = "brainStateCheckIns";

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getTodayCheckIn(userId) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

export async function saveCheckIn(userId, brainState) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  const protocol = getProtocolForState(brainState);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    const stateChanged = existing.data().brainState !== brainState;
    await updateDoc(ref, {
      brainState,
      protocolId: protocol.id,
      ...(stateChanged && { protocolCompleted: false }),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      date: todayDate,
      brainState,
      protocolId: protocol.id,
      protocolCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function markProtocolCompleted(userId) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  await updateDoc(ref, {
    protocolCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function getHistory(userId, days = 7) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(days)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
