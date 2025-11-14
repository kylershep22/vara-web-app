import { db } from "../../firebase";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

/** List Wheel of Life assessments for a user */
export async function listWheelAssessments(userId, opts = {}) {
  const {
    max = 12, // Default to last year (quarterly)
    order = ["assessmentDate", "desc"]
  } = opts;

  const col = collection(db, "wheelOfLife");
  const q = query(
    col,
    where("userId", "==", userId),
    orderBy(order[0], order[1]),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single Wheel of Life assessment by id */
export async function getWheelAssessment(id) {
  const ref = doc(db, "wheelOfLife", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get latest Wheel of Life assessment for a user */
export async function getLatestWheelAssessment(userId) {
  const assessments = await listWheelAssessments(userId, { max: 1 });
  return assessments.length > 0 ? assessments[0] : null;
}

/** Create a Wheel of Life assessment */
export async function createWheelAssessment(userId, payload) {
  const col = collection(db, "wheelOfLife");
  const docData = {
    userId,
    assessmentDate: serverTimestamp(),
    ratings: {
      careerPurpose: payload.ratings?.careerPurpose ?? 5,
      healthVitality: payload.ratings?.healthVitality ?? 5,
      relationshipsLove: payload.ratings?.relationshipsLove ?? 5,
      personalGrowth: payload.ratings?.personalGrowth ?? 5,
      financeSecurity: payload.ratings?.financeSecurity ?? 5,
      recreationJoy: payload.ratings?.recreationJoy ?? 5,
      environmentSpace: payload.ratings?.environmentSpace ?? 5,
      contributionLegacy: payload.ratings?.contributionLegacy ?? 5
    },
    notes: payload.notes ?? "",
    aiInsights: payload.aiInsights ?? null,
    createdAt: serverTimestamp()
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}

/** Update a Wheel of Life assessment */
export async function updateWheelAssessment(id, patch) {
  const ref = doc(db, "wheelOfLife", id);
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

/** Delete a Wheel of Life assessment */
export async function removeWheelAssessment(id) {
  const ref = doc(db, "wheelOfLife", id);
  await deleteDoc(ref);
  return { id, deleted: true };
}

/** Calculate average score across all categories */
export function calculateAverageScore(ratings) {
  const scores = Object.values(ratings);
  const sum = scores.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / scores.length) * 10) / 10; // Round to 1 decimal
}

/** Identify categories that need attention (score < 5) */
export function identifyLowScoreCategories(ratings) {
  const lowCategories = [];
  const categoryNames = {
    careerPurpose: "Career & Purpose",
    healthVitality: "Health & Vitality",
    relationshipsLove: "Relationships & Love",
    personalGrowth: "Personal Growth",
    financeSecurity: "Finance & Security",
    recreationJoy: "Recreation & Joy",
    environmentSpace: "Environment & Space",
    contributionLegacy: "Contribution & Legacy"
  };

  Object.entries(ratings).forEach(([key, value]) => {
    if (value < 5) {
      lowCategories.push({
        category: key,
        label: categoryNames[key],
        score: value
      });
    }
  });

  return lowCategories.sort((a, b) => a.score - b.score);
}

/** Compare two assessments and calculate change */
export function compareAssessments(current, previous) {
  if (!current || !previous) return null;

  const changes = {};
  Object.keys(current.ratings).forEach(key => {
    changes[key] = current.ratings[key] - previous.ratings[key];
  });

  const improved = Object.entries(changes).filter(([_, val]) => val > 0).length;
  const declined = Object.entries(changes).filter(([_, val]) => val < 0).length;
  const unchanged = Object.entries(changes).filter(([_, val]) => val === 0).length;

  return {
    changes,
    improved,
    declined,
    unchanged,
    overallTrend: improved > declined ? "improving" : declined > improved ? "declining" : "stable"
  };
}
