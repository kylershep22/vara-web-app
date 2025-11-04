// src/lib/ai.js
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; // your existing Firebase init

// --- auth header helper (only needed for fetch-based calls) ---
async function authHeader() {
  const user = getAuth(app).currentUser;
  if (!user) throw new Error("Please sign in to use AI features.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// --- HTTPS onRequest: journalPrompt ---
export async function generateJournalText(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("prompt (string) is required");
  }
  // Because of the Hosting rewrite, we can call the pretty path:
  const res = await fetch("/journalPrompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // If you later enforce Auth inside the function, add:
      // ...(await authHeader())
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Journal failed (${res.status})`);
  }
  return data.text;
}

// --- Callable: generateHabitSuggestions ---
export async function generateHabits(goal) {
  const fn = httpsCallable(getFunctions(app, "us-central1"), "generateHabitSuggestions");
  const { data } = await fn({ goal });
  return data?.suggestions ?? [];
}

// --- Callable: generateDailyPlan ---
export async function generateDailyPlan(input) {
  const fn = httpsCallable(getFunctions(app, "us-central1"), "generateDailyPlan");
  const { data } = await fn(input);
  return data?.plan ?? "";
}
