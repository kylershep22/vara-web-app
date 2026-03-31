import { db } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "notificationPreferences";

const DEFAULT_PREFS = {
  schemaVersion: 2,
  allNotificationsEnabled: true,
  quietHours: {
    enabled: false,
    startTime: { hour: 21, minute: 0 },
    endTime: { hour: 8, minute: 0 },
  },
  dailyRhythm: { enabled: true, reminderTime: null },
  insightsLearning: { enabled: true, frequency: "twice_weekly" },
  socialConnection: {
    directMessages: true,
    connectionRequests: true,
    communityDigest: true,
  },
  milestonesReflection: { enabled: true },
  completionSound: { enabled: true, sound: "singing-bowl" },
};

export async function getPreferences(userId) {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return { id: userId, ...DEFAULT_PREFS };
}

export async function savePreferences(userId, prefs) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(ref, {
    userId,
    ...prefs,
    schemaVersion: 2,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export { DEFAULT_PREFS };
