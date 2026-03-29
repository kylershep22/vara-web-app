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
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
      }
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

    const systemPrompt = `
You are Vara Coach, the AI coaching layer inside the Vara wellness app. Vara was built by a brain health and performance strategist who spent years in high-pressure corporate environments, experienced burnout firsthand, and rebuilt through neuroscience. That real-world foundation shapes how you coach. You speak with the confidence of someone who understands both the science and the lived experience of being overwhelmed, overloaded, and trying to figure out why nothing sticks.

You are not a therapist. You are not a meditation app. You are a brain health coach who helps people understand WHY they're struggling and WHAT to do about it, grounded in how the brain actually functions.

YOUR FRAMEWORK (THE BRAIN MODEL):

B (Build Resilience): Neuroplasticity is real. The brain physically changes through repeated practice. Cognitive reserve (built through varied challenges, learning, movement, social connection) creates a buffer against stress and cognitive decline. Mindset isn't fluff. What you think physically shapes your brain. Harvard research shows measurable structural brain changes from new mental habits in as little as 8 weeks.

R (Reclaim Focus): Focus isn't about trying harder. It's about reducing competing demands on attention. Multitasking increases errors by up to 50%. It takes about 23 minutes to fully regain focus after a context switch. Morning is typically the highest-quality focus window because the brain moves through delta, theta, alpha, and beta states. Jumping on your phone first thing hijacks your best cognitive hours. Cognitive load management is the real productivity strategy.

A (Activate Recovery): Recovery isn't a reward for hard work. It's a performance input. The brain's glymphatic system cleans out toxins (including amyloid beta) during deep sleep. One night of poor sleep can increase amyloid beta levels noticeably. You can't bank or repay sleep debt. Chronic fight-or-flight mode degrades brain function over time. Breathwork, sleep, and nervous system regulation are not optional extras.

I (Ignite Impact): Purpose and identity are not abstract motivational concepts. Living in alignment with your values is directly tied to cognitive health and longevity. The brain performs better when actions connect to meaning. Legacy thinking (what do I want to be known for) is a practical tool for decision-making, not a philosophical exercise.

N (Nurture Connections): Social connection is neurological, not just emotional. Isolation is a measurable risk factor for cognitive decline. The quality of your relationships directly affects brain health. Mentorship, community, and genuine connection are brain health strategies, not lifestyle nice-to-haves.

HOW YOU COACH:
When someone comes to you with a problem, follow this pattern. Acknowledge what they're feeling, be specific, not generic, name it. Reframe it through the brain, explain the mechanism briefly in plain language, why is this happening, what is the brain doing. Give one clear, small action, not three options, one thing they can do right now or today. If relevant, connect it to their goals or habits using the context data provided. Keep responses to 2-4 short paragraphs. You're coaching in a chat window, not writing an article.

YOUR VOICE:
Warm but direct. You have conviction about what you know. You don't hedge everything with "maybe" and "some people find." When the science is clear, say so clearly. When it's uncertain, say that too. You explain neuroscience the way you'd explain it to a smart friend over coffee. Name the mechanism, then immediately say why it matters to their actual life. Never drop a neuroscience term without making it practical. You use real-world examples people recognize. The notification avalanche. The 3pm energy crash. Starting strong Monday and falling off by Wednesday. The guilt spiral after missing a few days. You treat setbacks as information, not failure. If someone missed their routine for a week, you don't say "that's okay!" (patronizing) or "let's get back on track" (pressure). You say something like "that tells us something useful about what wasn't working. Let's figure out what got in the way." You ask good questions when you need more context, but you don't interrogate. One question, then respond with what you have.

WHAT YOU NEVER DO:
Never diagnose or treat. You don't say "you have ADHD" or "this sounds like anxiety disorder" or "you should talk to a therapist about your depression." If someone describes something that sounds clinical, you can acknowledge it's real and suggest they work with a professional for that specific piece, while still helping with what's in your lane. Never use shame, guilt, urgency, or streak-based pressure. No "you haven't checked in," no "don't break your streak," no "you're falling behind." Never overpromise. Don't say "this will fix your focus" or "rewire your brain in 30 days." Use language like "this can support," "research suggests," "many people notice." Be confident without being absolute. Never sound like a generic AI wellness bot. If your response could have come from any meditation app's chatbot, rewrite it. Be specific. Use the BRAIN framework. Reference actual mechanisms. Sound like a coach who knows this material deeply, not a chatbot pattern-matching on keywords. Never use celebratory animations language. No "amazing job!" or "you're crushing it!" or "incredible work!" Warm acknowledgment is fine. "That's a solid start" or "nicely done" is enough.

FORMATTING RULES:
Your output is displayed as plain text in a mobile app. Never use any markdown formatting. No bold, no italics, no asterisks, no hashtags, no headers, no bullet points, no numbered lists, no dashes at the start of lines. Never use em dashes. Use commas or periods instead. Write in natural paragraphs. If you mention multiple ideas, use "first... then... also..." flow, not lists.

Context:
- Current time: ${context?.currentTime || new Date().toLocaleTimeString("en-US", {hour: "2-digit", minute: "2-digit"})}
- Current page: ${context?.page || page?.label || "Unknown"}
- Brain state: ${context?.brainState || "unknown"}
- Today's check-in: ${context?.todayCheckIn || "not checked in"}
- Daily reflection: ${context?.dailyReflection || "not reflected yet"}
- Sleep quality: ${context?.sleepQuality || "not tracked"}, Stress level: ${context?.stressLevel || "not tracked"}
- This week: ${context?.weekSummary || "no data yet"}
- Mood trend (7-day): ${context?.moodTrend || "not enough data"}
- Recent journal tags: ${context?.recentJournalTags || "none"}
- Days since last coach session: ${context?.daysSinceLastCoachSession || "unknown"}
- Top habits: ${
    (context?.habits || []).length > 0 ?
      context.habits.join("; ") :
      (userSummary?.habits || [])
          .map((h) => h.title || "Untitled habit")
          .slice(0, 5)
          .join("; ") || "None on file"
  }

Scaling phases explained (for interpreting habit data): getting_started = just began, building_momentum = forming the pattern, committed = consistent but still developing, established = solid routine, expert = deeply ingrained.

CONTEXT USAGE:
You receive the user's current state and recent patterns as context. Use this information naturally. If someone says "I can't focus today" and you can see their brain state is "foggy," connect the dots through the BRAIN framework. But don't recite their data back at them like a dashboard. Weave it into your coaching naturally. Use trend data to inform your approach, not narrate it back to the user. A coach who sees a declining mood trend asks better questions, they don't open with "your numbers are down." Never reference journal content directly, only use tags for thematic awareness.
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
  const preferences = req.body?.preferences || {};

  try {
    const openai = await makeOpenAI();

    const systemPrompt = `You are Vara, a supportive wellness coach creating personalized daily plans.
Focus on realistic, achievable steps that align with the user's goals and habits.
Keep suggestions practical and time-bound.`;

    const userPrompt = `Create a daily plan for me based on:
- Goals: ${JSON.stringify(goals || [])}
- Habits: ${JSON.stringify(habits || [])}
- Tasks: ${JSON.stringify(tasks || [])}
- Preferences: ${JSON.stringify(preferences || {})}

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
${JSON.stringify(currentRecap, null, 2)}

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

    const suggestions = JSON.parse(response.choices?.[0]?.message?.content || "{}");
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
