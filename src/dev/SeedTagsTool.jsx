// src/dev/SeedTagsTool.jsx
import React, { useState } from "react";
import SidebarLayout from "../components/layout/SidebarLayout";
import { db } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";

// Minimal starter lists — tweak as you like.
const INTERESTS = [
  ["yoga","Yoga","🧘"],["meditation","Meditation","🧠"],["journaling","Journaling","📓"],
  ["breathwork","Breathwork","🌬️"],["running","Running","🏃"],["walking","Walking","🚶"],
  ["cycling","Cycling","🚴"],["strength-training","Strength Training","🏋️"],
  ["mobility","Mobility","🤸"],["pilates","Pilates","🧎"],["hiking","Hiking","🥾"],
  ["mindfulness","Mindfulness","🪷"],["nutrition","Nutrition","🥗"],["cooking","Cooking","🍳"],
  ["weight-loss","Weight Loss","⚖️"],["bodybuilding","Bodybuilding","💪"],
  ["cross-training","Cross Training","🔁"],["hiit","HIIT","⏱️"],["swimming","Swimming","🏊"],
  ["dance","Dance","💃"],["pickleball","Pickleball","🏓"]
];

const FOCUS = [
  ["sleep","Sleep","😴"],["stress","Stress","😌"],["anxiety","Anxiety","🫨"],
  ["burnout","Burnout","🕯️"],["depression","Depression","🌧️"],
  ["chronic-pain","Chronic Pain","🩹"],["energy","Energy","⚡"],
  ["recovery","Recovery","🛏️"],["longevity","Longevity","🌿"],
  ["heart-health","Heart Health","❤️"],["metabolic-health","Metabolic Health","🩸"],
  ["posture","Posture","🧍"],["flexibility","Flexibility","🧘‍♂️"],
  ["focus-attention","Focus & Attention","🎯"],["habit-building","Habit Building","📈"]
];

async function upsertTag(slug, label, category, emoji, synonyms = []) {
  const ref = doc(collection(db, "tags"), slug);
  await setDoc(ref, {
    slug, label, category, emoji, synonyms, active: true
  }, { merge: true });
}

export default function SeedTagsTool() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const seedAll = async () => {
    setBusy(true);
    try {
      for (const [slug, label, emoji] of INTERESTS) {
        await upsertTag(slug, label, "interest", emoji);
      }
      for (const [slug, label, emoji] of FOCUS) {
        await upsertTag(slug, label, "focus", emoji);
      }
      setDone(true);
      alert("✅ Tags seeded.");
    } catch (e) {
      console.error(e);
      alert("Seeding failed. Check console.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-xl font-semibold text-soft-charcoal mb-3">Seed Tags</h1>
        <p className="text-sm text-muted-sage-gray mb-6">
          Click once to write starter Interests & Focus Areas to <code>tags</code>.
          You can safely run this again; it upserts by slug.
        </p>
        <button
          onClick={seedAll}
          disabled={busy || done}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-evergreen-teal to-silver-sage text-white disabled:opacity-60"
        >
          {busy ? "Seeding…" : done ? "Seeded ✅" : "Seed starter tags"}
        </button>
      </div>
    </SidebarLayout>
  );
}
