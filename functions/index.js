// functions/index.js
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */

const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const {defineSecret} = require("firebase-functions/params");
const {onObjectFinalized, onObjectDeleted} = require("firebase-functions/v2/storage");
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
  const {default: OpenAI} = await import("openai");
  return new OpenAI({apiKey});
}

/* ======================================================================
 * Rate Limiting Middleware
 * ====================================================================*/

/**
 * Rate limiting configuration per endpoint
 * Format: { endpoint: { maxRequests: number, windowMs: number } }
 */
const RATE_LIMITS = {
  "/journal-summary": {maxRequests: 10, windowMs: 60 * 60 * 1000}, // 10 per hour
  "/ai-chat": {maxRequests: 20, windowMs: 60 * 60 * 1000}, // 20 per hour
  "/openai": {maxRequests: 30, windowMs: 60 * 60 * 1000}, // 30 per hour
};

/**
 * Check rate limit for a user/endpoint combination
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
async function checkRateLimit(userId, endpoint) {
  if (!userId) {
    // If no userId (shouldn't happen), allow but log
    logger.warn("Rate limit check called without userId");
    return {allowed: true, remaining: 999, resetAt: Date.now()};
  }

  const limit = RATE_LIMITS[endpoint];
  if (!limit) {
    // No rate limit configured for this endpoint
    return {allowed: true, remaining: 999, resetAt: Date.now()};
  }

  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Firestore path: rateLimits/{userId}/requests/{endpoint}
  const db = admin.firestore();
  const docRef = db.collection("rateLimits").doc(userId).collection("requests").doc(endpoint);

  try {
    const doc = await docRef.get();
    const data = doc.exists ? doc.data() : null;

    // Clean up old requests outside the time window
    let requests = data?.requests || [];
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (requests.length >= limit.maxRequests) {
      const oldestRequest = Math.min(...requests);
      const resetAt = oldestRequest + limit.windowMs;

      logger.warn("Rate limit exceeded", {
        userId,
        endpoint,
        count: requests.length,
        limit: limit.maxRequests,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request timestamp
    requests.push(now);

    // Update Firestore
    await docRef.set({
      requests,
      lastRequest: now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      allowed: true,
      remaining: limit.maxRequests - requests.length,
      resetAt: now + limit.windowMs,
    };
  } catch (err) {
    logger.error("Rate limit check failed", {userId, endpoint, error: err.message});
    // On error, allow the request (fail open)
    return {allowed: true, remaining: 999, resetAt: Date.now()};
  }
}

/* ======================================================================
 * Helper Functions
 * ====================================================================*/

function slugify(s) {
  return String(s)
      .toLowerCase()
      .replace(/\.[^/.]+$/, "") // strip file extension
      .replace(/[_\s]+/g, "-") // spaces/underscores -> hyphens
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
    {secrets: [OPENAI_API_KEY]},
    async (request) => {
      const {goal} = request.data || {};

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
          messages: [{role: "user", content: prompt}],
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

        return {suggestions: habits};
      } catch (err) {
        logger.error("generateHabitSuggestions error:", err);
        throw new HttpsError("internal", "Failed to generate suggestions.");
      }
    },
);

/**
 * Callable: generateDailyPlan
 * Input: { name, preferences, mood, goals, modifier }
 * Output: { plan: string } (bullet list)
 */
exports.generateDailyPlan = onCall(
    {secrets: [OPENAI_API_KEY]},
    async (request) => {
      const {name, preferences, mood, goals, modifier} = request.data || {};

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

      const moodDescription = mood ?
      `${mood.emoji ?? ""} (${mood.label ?? "Unknown"})${mood.note ? " - " + mood.note : ""}` :
      "No mood check-in yet.";

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
            {role: "system", content: "You are a supportive, empathetic wellness coach."},
            {role: "user", content: userPrompt},
          ],
          temperature: 0.7,
        });

        const plan = completion.choices?.[0]?.message?.content || "";
        return {plan};
      } catch (err) {
        logger.error("generateDailyPlan error:", err);
        throw new HttpsError("internal", "Failed to generate daily plan.");
      }
    },
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

        const {prompt} = req.body || {};
        if (typeof prompt !== "string" || !prompt.trim()) {
          res.status(400).json({error: "prompt (string) is required"});
          return;
        }

        const openai = await makeOpenAI();

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {role: "system", content: "You are a thoughtful journaling assistant."},
            {role: "user", content: prompt},
          ],
          temperature: 0.7,
        });

        const text = completion.choices?.[0]?.message?.content || "";
        res.json({text, usage: completion.usage ?? null});
      } catch (err) {
        logger.error("journalPrompt error:", err);
        res.status(500).json({error: "AI prompt failed"});
      }
    },
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
    logger.info("Skipping non-audio object:", {path, contentType});
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
    title, // "Delta Waves"
    description: "", // fill later via an admin UI
    category: "sleep", // queried by Sleep & Recovery
    type: "audio", // audio | video | article | tool
    subtype: "sound", // can change to "story" | "meditation"
    tags: ["sleep"],
    storagePath: path, // clients resolve to URL with getDownloadURL(storagePath)
    duration: null, // minutes; fill later
    popularity: 0,
    published: true, // default to visible so it shows up immediately
    createdAt: now,
    updatedAt: now,
  };

  if (!snap.exists) {
    await ref.set(base);
    logger.info("Created wellnessLibrary doc from upload", {docId, path});
  } else {
    await ref.set({storagePath: path, updatedAt: now}, {merge: true});
    logger.info("Updated wellnessLibrary doc for upload", {docId, path});
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
      logger.error("Failed to delete wellnessLibrary doc on prune", {docId, path, err});
    }
  });

  logger.info("Pruned wellnessLibrary doc after delete", {docId, path});
});

/* ======================================================================
 * Unified API Handler (for Express-style routes)
 * Routes: /journal-summary, /ai-chat, /openai
 * ====================================================================*/

/**
 * Unified API endpoint that routes to different handlers based on path
 * Accessible at: app.varawellness.co/api/*
 */
exports.api = onRequest(
    {
      cors: true,
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 120,
    },
    async (req, res) => {
    // Set CORS headers for mobile apps
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      // Handle preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      const path = req.path; // e.g., "/journal-summary", "/ai-chat"

      try {
      // Extract userId from request body (all AI endpoints send userId)
        const userId = req.body?.userId;

        // Check rate limit if userId is present
        if (userId && RATE_LIMITS[path]) {
          const rateLimit = await checkRateLimit(userId, path);

          // Add rate limit headers
          res.set("X-RateLimit-Limit", RATE_LIMITS[path].maxRequests.toString());
          res.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          res.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());

          if (!rateLimit.allowed) {
            logger.warn("Request blocked by rate limit", {userId, path});
            return res.status(429).json({
              error: "Too many requests",
              message: "You've exceeded the rate limit. Please try again later.",
              retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000), // seconds
              resetAt: new Date(rateLimit.resetAt).toISOString(),
            });
          }
        }

        // Route to appropriate handler
        if (path === "/journal-summary") {
          return await handleJournalSummary(req, res);
        } else if (path === "/ai-chat") {
          return await handleAIChat(req, res);
        } else if (path === "/openai") {
          return await handleOpenAISuggestions(req, res);
        } else {
          return res.status(404).json({error: `Route not found: ${path}`});
        }
      } catch (err) {
        logger.error("API error:", {path, error: err.message});
        return res.status(500).json({error: "Internal server error"});
      }
    },
);

/**
 * Handler: /api/journal-summary
 * Generates weekly AI summary of journal entries
 */
async function handleJournalSummary(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {entries, type, guardrails, instruction} = req.body || {};

  if (!entries || (typeof entries === "string" && entries.trim().length === 0)) {
    return res.status(400).json({error: "No journal entries provided."});
  }

  try {
    const openai = await makeOpenAI();

    const basePrompt = `Here are my journal entries from the past week:

${typeof entries === "string" ? entries : JSON.stringify(entries, null, 2)}

Please summarize the main themes, emotions, and any meaningful insights or patterns you notice.`;

    const finalPrompt = instruction ?
      `${basePrompt}\n\nAdditional instructions: ${instruction}` :
      `${basePrompt}\n\nKeep it encouraging and brief (4–6 sentences max), with 1–3 actionable nudges for next week.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a wellness journal assistant that summarizes weekly reflections.",
        },
        {role: "user", content: finalPrompt},
      ],
      temperature: 0.7,
    });

    const text = response.choices?.[0]?.message?.content || "";
    return res.status(200).json({text});
  } catch (err) {
    logger.error("Journal summary error:", err);
    return res.status(500).json({error: "Failed to generate journal summary"});
  }
}

/**
 * Handler: /api/ai-chat
 * AI companion chat (non-streaming)
 */
async function handleAIChat(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {messages = [], context = {}} = req.body || {};
    const {page, userSummary} = context || {};

    const systemPrompt = `
You are Vara, an empathetic, strengths-based wellness coach.
Be concise, encouraging, and specific. Offer practical next steps users can do today.
Avoid medical claims or diagnoses.

Context:
- Current page: ${page?.label || "Unknown"} (path: ${page?.path || "/"})
- User summary (short):
  - Goals: ${
  (userSummary?.goals || [])
      .map(
          (g) =>
            `${g.title || "Untitled goal"}${g.category ? ` [${g.category}]` : ""}${
          typeof g.progress === "number" ? ` (${g.progress}% done)` : ""
            }`,
      )
      .slice(0, 5)
      .join("; ") || "None on file"
}
  - Habits: ${
  (userSummary?.habits || [])
      .map(
          (h) =>
            `${h.title || "Untitled habit"}${h.cadence ? ` [${h.cadence}]` : ""}${
          typeof h.streak === "number" ? ` (streak ${h.streak})` : ""
            }`,
      )
      .slice(0, 8)
      .join("; ") || "None on file"
}

Guidelines:
- Prefer small, achievable steps over long lectures.
- Offer at most 1–3 options.
- If user asks for a plan, give time-boxed steps (e.g., "10 minutes today").
- If a query is missing info, ask a single clarifying question.
    `.trim();

    const history = [
      {role: "system", content: systemPrompt},
      ...messages.map((m) => ({role: m.role, content: m.content})),
    ];

    const openai = await makeOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: history,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't find the right words — try again?";

    return res.status(200).json({reply});
  } catch (err) {
    logger.error("ai-chat error:", err);
    return res.status(500).json({error: "AI chat failed"});
  }
}

/**
 * Handler: /api/openai
 * General AI suggestions for goals, habits, or tasks
 */
async function handleOpenAISuggestions(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {type, context, modifier = ""} = req.body || {};

  if (!type || !context) {
    return res.status(400).json({error: "Missing required fields: type and context"});
  }

  try {
    const openai = await makeOpenAI();

    // Build prompt based on type
    let prompt;
    if (type === "goal") {
      prompt = `Suggest 3-5 specific, measurable wellness goals related to: ${context}. ${modifier}`;
    } else if (type === "habit") {
      prompt = `Suggest 3-5 daily or weekly habits to help with: ${context}. ${modifier}`;
    } else if (type === "task") {
      prompt = `Suggest 3-5 actionable tasks for: ${context}. ${modifier}`;
    } else {
      prompt = `Provide wellness suggestions for: ${context}. ${modifier}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a supportive wellness coach providing practical suggestions.",
        },
        {role: "user", content: prompt},
      ],
      temperature: 0.7,
    });

    const text = response.choices?.[0]?.message?.content || "";
    return res.status(200).json({text});
  } catch (err) {
    logger.error("OpenAI suggestion error:", err);
    return res.status(500).json({error: "Failed to generate AI suggestions"});
  }
}


