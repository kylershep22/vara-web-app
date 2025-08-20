import admin from "firebase-admin";
import fs from "fs";

// Load your service account key (keep this file OUT of git)
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Helper to make safe slugs
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .trim();

// ----------- STARTER TAGS ------------- //
// Feel free to edit/expand. Add emojis/synonyms to boost matching.

const interestLabels = [
  { label: "Yoga", emoji: "🧘", synonyms: ["vinyasa", "hatha"] },
  { label: "Meditation", emoji: "🧠", synonyms: ["mindfulness", "zen"] },
  { label: "Breathwork", emoji: "🌬️", synonyms: ["pranayama"] },
  { label: "Mobility", emoji: "🦴", synonyms: ["stretching"] },
  { label: "Pilates", emoji: "🤸" },
  { label: "Strength Training", emoji: "🏋️", synonyms: ["lifting", "barbell"] },
  { label: "Calisthenics", emoji: "🤸‍♂️", synonyms: ["bodyweight"] },
  { label: "HIIT", emoji: "⚡", synonyms: ["interval training"] },
  { label: "Running", emoji: "🏃", synonyms: ["jogging"] },
  { label: "Walking", emoji: "🚶" },
  { label: "Hiking", emoji: "🥾" },
  { label: "Cycling", emoji: "🚴" },
  { label: "Swimming", emoji: "🏊" },
  { label: "Rock Climbing", emoji: "🧗" },
  { label: "Pickleball", emoji: "🥒", synonyms: ["paddle"] },
  { label: "Basketball", emoji: "🏀" },
  { label: "Soccer", emoji: "⚽" },
  { label: "Martial Arts", emoji: "🥋", synonyms: ["bjj", "karate", "muay thai"] },
  { label: "Tai Chi", emoji: "🌿" },
  { label: "Cold Plunge", emoji: "🧊", synonyms: ["ice bath"] },
  { label: "Sauna", emoji: "🔥" },
  { label: "Journaling", emoji: "📓" },
  { label: "Nutrition", emoji: "🥗" },
  { label: "Cooking", emoji: "🍳", synonyms: ["meal prep"] },
  { label: "Plant-based", emoji: "🌱", synonyms: ["vegan", "vegetarian"] },
  { label: "Keto", emoji: "🥩", synonyms: ["low carb"] },
  { label: "Intermittent Fasting", emoji: "⏱️", synonyms: ["IF", "time-restricted eating"] },
  { label: "CrossFit", emoji: "🏋️‍♂️", synonyms: ["functional fitness"] },
  { label: "Powerlifting", emoji: "🏋️‍♀️", synonyms: ["squat", "deadlift", "bench"] },
  { label: "Rowing", emoji: "🚣" },
  { label: "Dance", emoji: "💃", synonyms: ["zumba", "dance fitness"] },
  { label: "Barre", emoji: "🩰" },
  { label: "Trail Running", emoji: "🏞️", synonyms: ["ultra"] },
  { label: "Boxing", emoji: "🥊" },
  { label: "Paddleboarding", emoji: "🏄‍♂️", synonyms: ["SUP"] },
  { label: "Skiing", emoji: "🎿" },
  { label: "Snowboarding", emoji: "🏂" },
];

const focusLabels = [
  { label: "Sleep", emoji: "😴", synonyms: ["insomnia", "sleep hygiene"] },
  { label: "Stress", emoji: "🌊" },
  { label: "Anxiety", emoji: "💭" },
  { label: "Depression", emoji: "☁️" },
  { label: "Weight Loss", emoji: "⚖️" },
  { label: "Muscle Gain", emoji: "💪" },
  { label: "Energy", emoji: "🔋" },
  { label: "Burnout", emoji: "🕯️" },
  { label: "Recovery", emoji: "🛠️" },
  { label: "Chronic Pain", emoji: "🧩" },
  { label: "Back Pain", emoji: "🦴" },
  { label: "Posture", emoji: "🧍" },
  { label: "Flexibility", emoji: "🧘‍♂️" },
  { label: "Gut Health", emoji: "🧫" },
  { label: "Heart Health", emoji: "❤️" },
  { label: "Metabolic Health", emoji: "🧪" },
  { label: "Longevity", emoji: "🌤️" },
  { label: "Mental Clarity", emoji: "✨", synonyms: ["focus", "brain fog"] },
  { label: "Resilience", emoji: "🛡️" },
  { label: "Confidence", emoji: "🌟" },
  { label: "Habits", emoji: "📆", synonyms: ["behavior change"] },
  { label: "Productivity", emoji: "📈" },
  { label: "Immune Health", emoji: "🧬" },
  { label: "Blood Sugar", emoji: "🩸", synonyms: ["glucose", "insulin sensitivity"] },
  { label: "Hypertension", emoji: "🩺", synonyms: ["high blood pressure"] },
  { label: "Cholesterol", emoji: "🩺", synonyms: ["lipids"] },
  { label: "Joint Health", emoji: "🦵", synonyms: ["joint pain", "arthritis"] },
  { label: "Bone Health", emoji: "🦴", synonyms: ["osteoporosis"] },
  { label: "Prenatal & Postnatal", emoji: "👶", synonyms: ["pregnancy", "postpartum"] },
  { label: "Menopause", emoji: "🌺", synonyms: ["perimenopause"] },
  { label: "ADHD & Focus", emoji: "🎯", synonyms: ["attention"] },
  { label: "Addiction Recovery", emoji: "🌅", synonyms: ["sobriety"] },
  { label: "Skin Health", emoji: "🧴", synonyms: ["acne", "eczema"] },
];

const build = (arr, category) =>
  arr.map(({ label, emoji, synonyms }) => ({
    slug: slugify(label),
    label,
    category, // "interest" | "focus"
    emoji: emoji || "🏷️",
    synonyms: Array.isArray(synonyms) ? synonyms : [],
    active: true,
  }));

const tags = [...build(interestLabels, "interest"), ...build(focusLabels, "focus")];

// ----------- WRITE (idempotent) ------------- //
async function seed() {
  console.log(`Seeding ${tags.length} tags…`);
  const batch = db.batch();
  tags.forEach((t) => {
    const ref = db.collection("tags").doc(t.slug); // doc id = slug (stable)
    batch.set(ref, t, { merge: true }); // safe to re-run
  });
  await batch.commit();
  console.log("✅ Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
