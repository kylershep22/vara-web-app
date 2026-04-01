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

// Notification Cloud Functions (4 categories)
const notifications = require("./src/notifications");
exports.sendDailyRhythm = notifications.sendDailyRhythm;
exports.sendInsights = notifications.sendInsights;
exports.onNewDirectMessage = notifications.onNewDirectMessage;
exports.onNewConnection = notifications.onNewConnection;
exports.sendMilestones = notifications.sendMilestones;
exports.sendHabitReminders = notifications.sendHabitReminders;

// Admin & Moderation Cloud Functions
const adminFunctions = require("./src/admin");
exports.onPostCreate_moderateContent = adminFunctions.onPostCreate_moderateContent;
exports.onPostReport_createQueueItem = adminFunctions.onPostReport_createQueueItem;
exports.onModerationAction = adminFunctions.onModerationAction;
exports.aggregateAnalytics = adminFunctions.aggregateAnalytics;
exports.aggregateAnalyticsFull = adminFunctions.aggregateAnalyticsFull;
exports.triggerAggregation = adminFunctions.triggerAggregation;
exports.cleanupExpiredSuspensions = adminFunctions.cleanupExpiredSuspensions;
exports.updateModerationBlocklist = adminFunctions.updateModerationBlocklist;

// Event Code Functions
const eventFunctions = require("./src/events");
exports.validateEventCode = eventFunctions.validateEventCode;

// Secret defined via: firebase functions:secrets:set OPENAI_API_KEY
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// Construct OpenAI client from the secret at runtime (dynamic import works in CJS)
async function makeOpenAI() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const {default: OpenAI} = await import("openai");
  return new OpenAI({apiKey});
}

/**
 * Sanitize user input for safe interpolation into prompts.
 * Strips HTML, trims, and limits length.
 */
function sanitizeInput(str, maxLength = 2000) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}

/**
 * Strip markdown formatting from AI responses.
 */
function stripMarkdown(text) {
  if (typeof text !== "string") return "";
  return text
      .replace(/#{1,6}\s?/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
      .replace(/^\s*[-*+]\s/gm, "")
      .replace(/^\s*\d+\.\s/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/—/g, ", ")
      .trim();
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
  "/api/journal-summary": {maxRequests: 10, windowMs: 60 * 60 * 1000}, // 10 per hour
  "/api/ai-chat": {maxRequests: 20, windowMs: 60 * 60 * 1000}, // 20 per hour
  "/api/openai": {maxRequests: 30, windowMs: 60 * 60 * 1000}, // 30 per hour
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
  // Sanitize endpoint for use as Firestore doc ID (no forward slashes)
  const db = admin.firestore();
  const safeEndpoint = endpoint.replace(/\//g, "_");
  const docRef = db.collection("rateLimits").doc(userId).collection("requests").doc(safeEndpoint);

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
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
      }
      const {goal} = request.data || {};

      if (typeof goal !== "string" || !goal.trim()) {
        throw new HttpsError("invalid-argument", "Goal must be a string.");
      }

      const sanitizedGoal = sanitizeInput(goal, 500);

      try {
        const openai = await makeOpenAI();

        const prompt = [
          `A user has the wellness goal: "${sanitizedGoal}".`,
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
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
      }
      const {name, preferences, mood, goals, modifier} = request.data || {};

      if (!Array.isArray(goals)) {
        throw new HttpsError("invalid-argument", "`goals` must be an array.");
      }

      const safeName = sanitizeInput(name || "Anonymous", 100);
      const validTones = ["gentle", "motivating", "direct", "playful"];
      const validIntensities = ["light", "standard", "intense"];
      const tone = validTones.includes(preferences?.tone) ? preferences.tone : "gentle";
      const intensity = validIntensities.includes(preferences?.intensity) ? preferences.intensity : "standard";
      const safeModifier = modifier ? sanitizeInput(modifier, 500) : "";
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

      const readableGoals = goals
          .slice(0, 20)
          .map((g) => `${sanitizeInput(g.title || "", 200)}: ${g.progress}/${g.target} ${sanitizeInput(g.unit || "", 50)}`)
          .join("\n");

      const moodDescription = mood ?
      `${sanitizeInput(mood.emoji ?? "", 10)} (${sanitizeInput(mood.label ?? "Unknown", 50)})${mood.note ? " - " + sanitizeInput(mood.note, 200) : ""}` :
      "No mood check-in yet.";

      const modifierText = safeModifier ? `User added instruction: ${safeModifier}` : "";

      const userPrompt = `You are a compassionate and encouraging wellness coach named Vara.
Generate a personalized daily wellness plan for a user based on their goals, mood, and preferences.

User: ${safeName}
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
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 120,
    },
    async (req, res) => {
      // ---- CORS: restrict to known origins ----
      const allowedOrigins = [
        "https://vara-4a99f.web.app",
        "https://vara-4a99f.firebaseapp.com",
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      } else if (!origin) {
        // Allow requests with no origin (mobile apps)
        res.set("Access-Control-Allow-Origin", "*");
      }
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      try {
        if (req.method !== "POST") {
          res.status(405).send("Method Not Allowed");
          return;
        }

        // ---- Auth: verify Firebase ID token ----
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({error: "Missing or invalid Authorization header"});
        }
        const idToken = authHeader.split("Bearer ")[1];
        try {
          await admin.auth().verifyIdToken(idToken);
        } catch (authErr) {
          logger.warn("journalPrompt auth failed", {error: authErr.message});
          return res.status(401).json({error: "Invalid or expired token"});
        }

        const {prompt} = req.body || {};
        if (typeof prompt !== "string" || !prompt.trim()) {
          res.status(400).json({error: "prompt (string) is required"});
          return;
        }

        // Sanitize: truncate and filter prompt injection
        const sanitizedPrompt = prompt
            .slice(0, 5000)
            .trim()
            .replace(/ignore\s+(previous|all|above)\s+instructions?/gi, "[filtered]")
            .replace(/you\s+are\s+now\s+/gi, "[filtered]")
            .replace(/system\s*:\s*/gi, "[filtered]");

        const openai = await makeOpenAI();

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {role: "system", content: "You are a thoughtful journaling assistant."},
            {role: "user", content: sanitizedPrompt},
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
      cors: ["https://vara-4a99f.web.app", "https://vara-4a99f.firebaseapp.com"],
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 120,
    },
    async (req, res) => {
    // Set CORS headers — restrict to known origins
      const allowedOrigins = [
        "https://vara-4a99f.web.app",
        "https://vara-4a99f.firebaseapp.com",
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      } else if (!origin) {
        // Allow requests with no origin (mobile apps, server-to-server)
        res.set("Access-Control-Allow-Origin", "*");
      }
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      // Handle preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      const path = req.path; // e.g., "/journal-summary", "/ai-chat"

      // Health check endpoint does not require auth
      if (path === "/" || path === "/api" || path === "/api/") {
        return res.status(200).send("Wellness AI backend is running ✅");
      }

      try {
      // Verify Firebase ID token from Authorization header
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({error: "Missing or invalid Authorization header"});
        }
        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (authErr) {
          logger.warn("Auth verification failed", {error: authErr.message, path});
          return res.status(401).json({error: "Invalid or expired token"});
        }
        const userId = decodedToken.uid; // Use verified UID, not body-supplied
        req.authenticatedUid = userId; // Make available to all handler functions

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
        if (path === "/api/journal-summary" || path === "/journal-summary") {
          return await handleJournalSummary(req, res);
        } else if (path === "/api/ai-chat" || path === "/ai-chat") {
          return await handleAIChat(req, res);
        } else if (path === "/api/openai" || path === "/openai") {
          return await handleOpenAISuggestions(req, res);
        } else if (path === "/api/journal-prompt" || path === "/journal-prompt") {
          return await handleJournalPrompt(req, res);
        } else if (path === "/api/generate-daily-plan" || path === "/generate-daily-plan") {
          return await handleGenerateDailyPlan(req, res);
        } else if (path === "/api/week-recap-suggestions" || path === "/week-recap-suggestions") {
          return await handleWeekRecapSuggestions(req, res);
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

  const rawEntries = req.body?.entries;
  const instruction = sanitizeInput(req.body?.instruction || "", 500);

  const entries = typeof rawEntries === "string"
    ? sanitizeInput(rawEntries, 10000)
    : Array.isArray(rawEntries)
      ? rawEntries.map((e) => sanitizeInput(String(e), 2000)).join("\n")
      : "";

  if (!entries || entries.trim().length === 0) {
    return res.status(400).json({error: "No journal entries provided."});
  }

  try {
    const openai = await makeOpenAI();

    const basePrompt = `Here are my journal entries from the past week:

${entries}

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
    const {page, userSummary, brainMetrics} = context || {};

    const sanitizedMessages = messages.slice(-20).map((m) => ({
      role: ["user", "assistant"].includes(m.role) ? m.role : "user",
      content: sanitizeInput(m.content, 4000),
    }));

    const goalsText = (userSummary?.goals || [])
        .map(
            (g) =>
              `${g.title || "Untitled goal"}${g.category ? ` [${g.category}]` : ""}${
            typeof g.progress === "number" ? ` (${g.progress}% done)` : ""
              }`,
        )
        .slice(0, 5)
        .join("; ") || "None on file";

    const habitsText = (userSummary?.habits || [])
        .map(
            (h) =>
              `${h.title || "Untitled habit"}${h.cadence ? ` [${h.cadence}]` : ""}${
            typeof h.streak === "number" ? ` (streak ${h.streak})` : ""
              }`,
        )
        .slice(0, 8)
        .join("; ") || "None on file";

    const systemPrompt = `
You are Vara Coach — a calm, knowledgeable brain-health guide. You help users build sustainable habits, routines, and focus through 5 pillars:

1. Neuroplasticity (growth through challenge and novelty)
2. Neuroenergy (sleep, movement, nutrition as brain fuel)
3. Neurofocus (attention, concentration, reducing cognitive load)
4. Neuroresilience (stress tolerance, recovery, regulation)
5. Neurosocial (connection, belonging, social brain health)

VOICE: Calm, intelligent, supportive, clear. Use conditional language ("can help," "may support," "many people find"). Never use urgency, shame, guilt, streak pressure, or hype. Frame missed days as normal. Keep responses to 2-3 short paragraphs, 1-3 options max. Ask one clarifying question if needed.

AMCC challenges and neuroplasticity activities: frame as invitations, never prescriptions. Do not specify durations, temperatures, or protocols for physical challenges.

=== TOPIC ROUTING ===

TIER 1 — HARD DECLINE (say these are outside your scope, warmly):
Financial advice (stocks, crypto, investing, tax, insurance), medical advice (diagnoses, medications, dosages, supplements with dosing), legal advice, clinical mental health (CBT, trauma processing, diagnostic screening, medication management), political opinions, advice about other people's mental health.

Do not reframe these through brain health — no "well, financial stress affects your brain..." bridges. Acknowledge warmly, state it's outside your lane, optionally suggest the right resource.

Example: "Should I buy ETFs?" → "That's outside what I'm built for — I'm focused on your brain health and routines. A financial advisor would be the right person for that one."

TIER 2 — GENUINE BRIDGE (engage through brain-health lens, stay in your lane):
Sleep, exercise/movement, general nutrition patterns, screen time, work-life balance, decision fatigue, stress from work/life, social connection, mindfulness/breathwork, caffeine/alcohol effects on cognition.

Engage with the brain-health connection. Don't become a nutritionist, trainer, or life coach. If the question goes deeper than your domain, acknowledge the limit.

Example: "I'm stressed about money" → Engage with the stress and its cognitive effects. Do not give financial advice.

TIER 3 — CONVERSATIONAL PASS (brief, human, no brain-health bridge):
Cars, movies, sports, weather, trivia, jokes, anything casual with no liability and no real brain-health connection.

Be briefly warm (1-2 sentences), don't force a brain-health angle, offer to help with brain-health topics. If user stays off-topic for 3+ exchanges, gently redirect.

=== CRISIS RESPONSE ===

If a user expresses self-harm, suicidal thoughts, or acute crisis: respond warmly without judgment, do not coach or diagnose, and say:
"I hear you, and I'm glad you shared that. This is beyond what I can support — but you can reach the 988 Suicide & Crisis Lifeline anytime by calling or texting 988."

Remain available afterward without processing the crisis.

=== NEVER ===

Make medical claims or diagnoses. Prescribe medications or supplement dosages. Provide therapy. Use urgency or shame language. Promise specific outcomes. Say "rewire your brain," "unlock your potential," "no excuses," or "push through."

=== CONTEXT ===

- Current page: ${page?.label || "Unknown"} (path: ${page?.path || "/"})
${brainHealthContext}
- User summary:
  - Goals: ${goalsText}
  - Habits: ${habitsText}

Use the user's actual data (goals, habits, brain state) to personalize responses. Tailor to readiness score when available (low readiness = lighter suggestions). Suggest neuroplasticity activities when user hasn't tried anything new recently. Recommend regulation tools when user seems stressed. If user asks for a plan, give time-boxed steps (e.g., "10 minutes today").
    `.trim();

    const history = [
      {role: "system", content: systemPrompt},
      ...sanitizedMessages,
    ];

    const openai = await makeOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: history,
    });

    const raw =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't find the right words, try again?";
    const reply = stripMarkdown(raw);

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

  const type = sanitizeInput(req.body?.type || "", 50);
  const context = sanitizeInput(req.body?.context || "", 1000);
  const modifier = sanitizeInput(req.body?.modifier || "", 500);

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

/**
 * Handler: /api/journal-prompt
 * Generates AI journal prompts with brain health focus
 */
async function handleJournalPrompt(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const prompt = sanitizeInput(req.body?.prompt || "", 1000);
  const brainFocused = !!req.body?.brainFocused;

  try {
    const openai = await makeOpenAI();

    const systemContent = "You are Vara, a warm wellness journaling companion. Return exactly 3 journal prompts, one per line. Rules: Each prompt must be a single question under 12 words. No em dashes. No markdown, no bold, no asterisks, no quotes, no headers, no bullet points, no numbering. No preamble or labels. Just 3 plain short questions, one per line.";

    const userContent = prompt || "Give me 3 reflective journal prompts for today.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: systemContent},
        {role: "user", content: userContent},
      ],
      temperature: 0.7,
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const text = stripMarkdown(raw);
    return res.status(200).json({text});
  } catch (err) {
    logger.error("Journal prompt error:", err);
    return res.status(500).json({error: "Failed to generate journal prompt"});
  }
}

/**
 * Handler: /api/generate-daily-plan
 * Generates personalized daily plans
 */
async function handleGenerateDailyPlan(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const goals = Array.isArray(req.body?.goals)
    ? req.body.goals.map((g) => sanitizeInput(String(g), 500))
    : [];
  const habits = Array.isArray(req.body?.habits)
    ? req.body.habits.map((h) => sanitizeInput(String(h), 500))
    : [];
  const tasks = Array.isArray(req.body?.tasks)
    ? req.body.tasks.map((t) => sanitizeInput(String(t), 500))
    : [];
  const rawPrefs = req.body?.preferences || {};
  const preferences = {
    tone: sanitizeInput(String(rawPrefs.tone || "gentle"), 50),
    intensity: sanitizeInput(String(rawPrefs.intensity || "standard"), 50),
  };

  try {
    const openai = await makeOpenAI();

    const systemPrompt = `You are Vara, a supportive wellness coach creating personalized daily plans.
Focus on realistic, achievable steps that align with the user's goals and habits.
Keep suggestions practical and time-bound.`;

    const userPrompt = `Create a daily plan for me based on:
- Goals: ${goals.slice(0, 20).join(", ") || "None"}
- Habits: ${habits.slice(0, 20).join(", ") || "None"}
- Tasks: ${tasks.slice(0, 20).join(", ") || "None"}
- Tone: ${preferences.tone}, Intensity: ${preferences.intensity}

Provide a structured plan with morning, afternoon, and evening suggestions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt},
      ],
      temperature: 0.7,
    });

    const plan = response.choices?.[0]?.message?.content || "";
    return res.status(200).json({plan});
  } catch (err) {
    logger.error("Daily plan error:", err);
    return res.status(500).json({error: "Failed to generate daily plan"});
  }
}

/**
 * Handler: /api/week-recap-suggestions
 * Generates AI suggestions for week recap (4-3-2-1 format)
 */
async function handleWeekRecapSuggestions(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const userId = req.authenticatedUid; // Use verified UID from auth check
  const {weekData, currentRecap} = req.body || {};

  if (!weekData) {
    return res.status(400).json({error: "Missing required field: weekData"});
  }

  try {
    const openai = await makeOpenAI();
    const rawWeekData = weekData || {};
    const goals = Array.isArray(rawWeekData.goals)
      ? rawWeekData.goals.map((g) => sanitizeInput(String(g), 500))
      : [];
    const habits = Array.isArray(rawWeekData.habits)
      ? rawWeekData.habits.map((h) => ({
        name: sanitizeInput(String(h.name || "Habit"), 200),
        streak: typeof h.streak === "number" ? h.streak : 0,
      }))
      : [];
    const recentJournals = Array.isArray(rawWeekData.recentJournals)
      ? rawWeekData.recentJournals.map((j) => sanitizeInput(String(j), 1000))
      : [];

    const systemPrompt = `You are Vara, an empathetic wellness coach helping users reflect on their week.
Based on the user's goals, habits, and recent journal entries, suggest thoughtful responses for their 4-3-2-1 week recap:
- 4 moments of joy
- 3 ways they fueled their mind or body

Be specific and personalized based on their actual activities. Keep suggestions concise and positive.
Return only a JSON object with "momentsOfJoy" (array of 4 strings) and "mindBodyFuel" (array of 3 strings).`;

    const userPrompt = `User's Week Context:
- Goals: ${goals.join(", ") || "None"}
- Habits: ${habits.map((h) => `${h.name} (${h.streak} day streak)`).join(", ") || "None"}
- Recent Journal Entries: ${recentJournals.join(" | ") || "None"}

Current Recap (if any):
${sanitizeInput(JSON.stringify(currentRecap || {}), 2000)}

Based on this information, suggest:
1. 4 moments of joy they might have experienced
2. 3 ways they likely fueled their mind or body

Return as JSON: {"momentsOfJoy": [...], "mindBodyFuel": [...]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt},
      ],
      temperature: 0.7,
      response_format: {type: "json_object"},
    });

    let suggestions;
    try {
      suggestions = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    } catch (parseErr) {
      logger.error("Week recap JSON parse failed");
      return res.status(500).json({error: "Invalid response format"});
    }
    return res.status(200).json(suggestions);
  } catch (err) {
    logger.error("Week recap suggestions error:", err);
    return res.status(500).json({error: "Failed to generate suggestions"});
  }
}

/* ======================================================================
 * Account Deletion (GDPR / Privacy compliance)
 * ====================================================================*/

/**
 * Callable function to delete a user's account and all associated data.
 * Requires authentication. Deletes data from all personal collections,
 * removes user from groups, and finally deletes the Firebase Auth account.
 */
exports.deleteAccount = onCall(
    {
      timeoutSeconds: 120,
      memory: "512MiB",
    },
    async (request) => {
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError("unauthenticated", "Must be logged in to delete account");
      }

      const db = admin.firestore();

      /**
       * Delete all docs matching a query in batches of 500.
       * Loops until no more matching documents remain.
       */
      async function deleteQueryBatched(query) {
        let total = 0;
        let snapshot = await query.limit(500).get();
        while (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          total += snapshot.size;
          if (snapshot.size < 500) break; // last batch
          snapshot = await query.limit(500).get();
        }
        return total;
      }

      // Collections where documents have a userId field
      const personalCollections = [
        "goals", "habits", "tasks", "journalEntries", "journal_entries",
        "habitCompletions", "joyMoments", "fourThreeTwoOne",
        "dailyWellnessScores", "morningCheckIns", "brainMetrics",
        "neuroplasticitySignals", "nervousSystemSessions", "amccChallenges",
        "sleepLogs", "sleepRoutineRuns", "puzzleCompletions", "focusSessions",
        "routines", "weeklyRecaps", "wheelOfLife", "reflections",
        "masterclassProgress", "audioListens", "audioFavorites",
        "socialConnections", "natureExposure", "energyCheckins",
        "gratitudeEntries", "bedtimeRoutines", "emotionalCheckins",
        "cognitiveReframes", "digitalWellbeing", "brainHealthScores",
        "notifications", "challengeParticipants", "challengeCheckIns",
      ];

      try {
        // Delete personal data in batches (loops until all docs are deleted)
        for (const col of personalCollections) {
          await deleteQueryBatched(
              db.collection(col).where("userId", "==", uid),
          );
        }

        // Delete user's posts
        await deleteQueryBatched(
            db.collection("posts").where("userId", "==", uid),
        );

        // Delete user's DMs and conversations
        await deleteQueryBatched(
            db.collection("conversations").where("participants", "array-contains", uid),
        );
        await deleteQueryBatched(
            db.collection("directMessages").where("senderId", "==", uid),
        );

        // Delete sleep routine (keyed by userId)
        const sleepRoutineRef = db.collection("sleepRoutines").doc(uid);
        const sleepRoutineSnap = await sleepRoutineRef.get();
        if (sleepRoutineSnap.exists) {
          await sleepRoutineRef.delete();
        }

        // Delete user's sub-collections (moods, daily plans)
        const userRef = db.collection("users").doc(uid);
        await deleteQueryBatched(userRef.collection("moods"));

        // Delete user profile
        await userRef.delete();

        // Delete connections involving this user
        await deleteQueryBatched(
            db.collection("connections").where("participants", "array-contains", uid),
        );

        // Remove user from group member lists
        const groupsSnap = await db.collection("groups")
            .where("members", "array-contains", uid)
            .get();
        for (const groupDoc of groupsSnap.docs) {
          const members = groupDoc.data().members || [];
          await groupDoc.ref.update({
            members: members.filter((m) => m !== uid),
          });
        }

        // Delete rate limit tracking data
        const rateLimitsRef = db.collection("rateLimits").doc(uid);
        const rateLimitsSnap = await rateLimitsRef.get();
        if (rateLimitsSnap.exists) {
          await rateLimitsRef.delete();
        }

        // Delete Firebase Auth account (must be last)
        await admin.auth().deleteUser(uid);

        logger.info("Account deleted successfully", {uid});
        return {success: true};
      } catch (err) {
        logger.error("Account deletion failed", {uid, error: err.message});
        throw new HttpsError("internal", "Failed to delete account. Please contact support.");
      }
    },
);
