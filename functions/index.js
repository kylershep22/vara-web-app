// functions/index.js
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Secret defined via: firebase functions:secrets:set OPENAI_API_KEY
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// Construct OpenAI client from the secret at runtime (dynamic import works in CJS)
async function makeOpenAI() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey });
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")   // strip file extension
    .replace(/[_\s]+/g, "-")    // spaces/underscores -> hyphens
    .replace(/[^a-z0-9-]/g, "") // safe chars only
    .slice(0, 80);
}

/* ======================================================================
 * AI Callables / HTTP
 * ====================================================================*/

/**
 * Callable: generateHabitSuggestions
 * Input: { goal: string }
 * Output: { suggestions: string[] }
 */
exports.generateHabitSuggestions = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const { goal } = request.data || {};

    if (typeof goal !== "string" || !goal.trim()) {
      throw new HttpsError("invalid-argument", "Goal must be a string.");
    }

    try {
      const openai = await makeOpenAI();

      const prompt = [
        `A user has the wellness goal: "${goal}".`,
        "Suggest 5 simple daily or weekly habits that will help.",
        "Be specific and encouraging. Return as a JSON array of short strings.",
      ].join(" ");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content ?? "";

      let habits;
      try {
        habits = JSON.parse(text);
      } catch (e) {
        logger.error("OpenAI response was not valid JSON:", text);
        throw new Error("Invalid response format from OpenAI.");
      }

      if (!Array.isArray(habits)) {
        throw new Error("Expected an array of habits.");
      }

      return { suggestions: habits };
    } catch (err) {
      logger.error("generateHabitSuggestions error:", err);
      throw new HttpsError("internal", "Failed to generate suggestions.");
    }
  }
);

/**
 * Callable: generateDailyPlan
 * Input: { name, preferences, mood, goals, modifier }
 * Output: { plan: string } (bullet list)
 */
exports.generateDailyPlan = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const { name, preferences, mood, goals, modifier } = request.data || {};

    if (!Array.isArray(goals)) {
      throw new HttpsError("invalid-argument", "`goals` must be an array.");
    }

    const tone = preferences?.tone || "gentle";
    const intensity = preferences?.intensity || "standard";
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

    const readableGoals = goals
      .map((g) => `${g.title}: ${g.progress}/${g.target} ${g.unit}`)
      .join("\n");

    const moodDescription = mood
      ? `${mood.emoji ?? ""} (${mood.label ?? "Unknown"})${mood.note ? " - " + mood.note : ""}`
      : "No mood check-in yet.";

    const modifierText = modifier ? `User added instruction: ${modifier}` : "";

    const userPrompt = `You are a compassionate and encouraging wellness coach named Vara.
Generate a personalized daily wellness plan for a user based on their goals, mood, and preferences.

User: ${name ?? "Anonymous"}
Tone: ${tone}
Intensity: ${intensity}
Time of Day: ${timeOfDay}
Mood: ${moodDescription}
Goals:
${readableGoals}
${modifierText}

Provide 3–5 short, motivating tasks for the day. Keep tone ${tone}. Format as a bullet list.`;

    try {
      const openai = await makeOpenAI();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a supportive, empathetic wellness coach." },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      });

      const plan = completion.choices?.[0]?.message?.content || "";
      return { plan };
    } catch (err) {
      logger.error("generateDailyPlan error:", err);
      throw new HttpsError("internal", "Failed to generate daily plan.");
    }
  }
);

/**
 * HTTPS: journalPrompt
 * POST body: { prompt: string }
 * Response: { text, usage }
 */
exports.journalPrompt = onRequest(
  {
    cors: true,
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { prompt } = req.body || {};
      if (typeof prompt !== "string" || !prompt.trim()) {
        res.status(400).json({ error: "prompt (string) is required" });
        return;
      }

      const openai = await makeOpenAI();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a thoughtful journaling assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content || "";
      res.json({ text, usage: completion.usage ?? null });
    } catch (err) {
      logger.error("journalPrompt error:", err);
      res.status(500).json({ error: "AI prompt failed" });
    }
  }
);

/* ======================================================================
 * Storage Triggers: sleep-audio -> wellnessLibrary
 * ====================================================================*/

/**
 * Create or update a wellnessLibrary doc whenever a file is uploaded/overwritten
 * under sleep-audio/.
 */
exports.ingestSleepAudio = onObjectFinalized(async (event) => {
  const path = event.data.name || ""; // e.g., "sleep-audio/DeltaWaves.mp3"
  if (!path.startsWith("sleep-audio/")) return;

  const contentType = event.data.contentType || "";
  if (contentType && !contentType.startsWith("audio/")) {
    // Only ingest audio content types (safety check)
    logger.info("Skipping non-audio object:", { path, contentType });
    return;
  }

  const fileName = path.split("/").pop() || "untitled";
  const title = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const docId = slugify(title);
  const ref = admin.firestore().collection("wellnessLibrary").doc(docId);
  const snap = await ref.get();

  const now = admin.firestore.FieldValue.serverTimestamp();

  const base = {
    title,                  // "Delta Waves"
    description: "",        // fill later via an admin UI
    category: "sleep",      // queried by Sleep & Recovery
    type: "audio",          // audio | video | article | tool
    subtype: "sound",       // can change to "story" | "meditation"
    tags: ["sleep"],
    storagePath: path,      // clients resolve to URL with getDownloadURL(storagePath)
    duration: null,         // minutes; fill later
    popularity: 0,
    published: true,        // default to visible so it shows up immediately
    createdAt: now,
    updatedAt: now,
  };

  if (!snap.exists) {
    await ref.set(base);
    logger.info("Created wellnessLibrary doc from upload", { docId, path });
  } else {
    await ref.set({ storagePath: path, updatedAt: now }, { merge: true });
    logger.info("Updated wellnessLibrary doc for upload", { docId, path });
  }
});

/**
 * Remove the wellnessLibrary doc if a file under sleep-audio/ is deleted.
 */
exports.pruneSleepAudioDoc = onObjectDeleted(async (event) => {
  const path = event.data.name || "";
  if (!path.startsWith("sleep-audio/")) return;

  const fileName = path.split("/").pop() || "untitled";
  const docId = slugify(fileName);

  await admin.firestore().collection("wellnessLibrary").doc(docId).delete().catch((err) => {
    // Ignore not-found; log others
    if (err && err.code !== 5) {
      logger.error("Failed to delete wellnessLibrary doc on prune", { docId, path, err });
    }
  });

  logger.info("Pruned wellnessLibrary doc after delete", { docId, path });
});





