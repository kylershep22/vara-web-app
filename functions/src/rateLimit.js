/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/**
 * Rate limiting for the paid AI surface.
 *
 * EXTRACTED FROM index.js UNCHANGED (slice 1 of the userPrivate migration).
 * The move exists so the fail-closed contract below is unit-testable — it was
 * previously a module-private function with no export and therefore no test.
 * Behaviour is byte-identical to the version that shipped in f94cc9d; if this
 * file ever diverges in behaviour, that is a bug, not an improvement.
 *
 * `logger` and `admin` are injected via setRateLimitDeps() rather than
 * required at module load, so tests can drive the error path (a throwing
 * Firestore) without an emulator. index.js wires the real ones at startup.
 */

const {HttpsError} = require("firebase-functions/v2/https");

// Injected by index.js at startup; overridden by tests. Null by default so a
// missing wiring call fails loudly at first use rather than silently no-opping.
let logger = null;
let admin = null;

/**
 * Wire the module's runtime dependencies.
 *
 * @param {object} deps Object with {logger, admin}.
 * @return {void}
 */
function setRateLimitDeps(deps) {
  logger = deps.logger;
  admin = deps.admin;
}

/*
 * Rate limiting configuration per endpoint
 * Format: { endpoint: { maxRequests, windowMs, dailyMax? } }
 * When dailyMax is set, the endpoint is also capped to that many requests per 24h.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Every key here fronts a paid OpenAI call. checkRateLimit FAILS CLOSED on a
// missing key, so adding a paid endpoint without adding it here breaks that
// endpoint rather than uncapping it. That is the intended trade.
//
// Router paths are registered under both the bare and the /api/-prefixed form
// because exports.api dispatches on either (see the route table below).
// Standalone exports use a "fn:" pseudo-path so their counter never shares a
// Firestore document with the router twin — the two are separate entry points
// and a user hitting both should be charged against both.
const RATE_LIMITS = {
  // --- existing tiers, unchanged ---
  "/journal-summary": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
  "/ai-chat": {maxRequests: 20, windowMs: HOUR_MS, dailyMax: 100},
  "/openai": {maxRequests: 30, windowMs: HOUR_MS, dailyMax: 150},
  "/api/journal-summary": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
  "/api/ai-chat": {maxRequests: 20, windowMs: HOUR_MS, dailyMax: 100},
  "/api/openai": {maxRequests: 30, windowMs: HOUR_MS, dailyMax: 150},

  // --- added: previously unmetered router paths (P1-2) ---
  // Cheapest call of the three (400 max_tokens) and user-initiated repeatedly
  // within one journalling session, so it gets the mid tier.
  "/journal-prompt": {maxRequests: 20, windowMs: HOUR_MS, dailyMax: 100},
  "/api/journal-prompt": {maxRequests: 20, windowMs: HOUR_MS, dailyMax: 100},
  // Most expensive route in the app at 1500 max_tokens. Most conservative
  // existing tier, per slice decision.
  "/generate-daily-plan": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
  "/api/generate-daily-plan": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
  // Weekly-cadence feature. A handful of calls a week is the real usage, so
  // the conservative tier is already far above need.
  "/week-recap-suggestions": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
  "/api/week-recap-suggestions": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},

  // --- added: standalone exports that never reached the limiter at all ---
  // Mirrors /journal-prompt; same handler shape, same cost.
  "fn:journalPrompt": {maxRequests: 20, windowMs: HOUR_MS, dailyMax: 100},
  // No router twin. Matches /openai, the suggestion-generation tier it
  // duplicates in purpose.
  "fn:generateHabitSuggestions": {maxRequests: 30, windowMs: HOUR_MS, dailyMax: 150},
  // Mirrors /generate-daily-plan.
  "fn:generateDailyPlan": {maxRequests: 10, windowMs: HOUR_MS, dailyMax: 20},
};

// Paths exports.api dispatches to. Kept in lockstep with the route table at the
// bottom of exports.api: a path here with no handler 404s at dispatch, a
// handler whose path is missing here is unreachable. Both halves must also have
// a RATE_LIMITS entry above or the request is refused before dispatch.
const ROUTED_PATHS = new Set([
  "/journal-summary", "/api/journal-summary",
  "/ai-chat", "/api/ai-chat",
  "/openai", "/api/openai",
  "/journal-prompt", "/api/journal-prompt",
  "/generate-daily-plan", "/api/generate-daily-plan",
  "/week-recap-suggestions", "/api/week-recap-suggestions",
]);

/**
 * Check rate limit for a user/endpoint combination
 * Returns { allowed: boolean, remaining: number, resetAt: number, reason?: string }
 *
 * FAIL-CLOSED CONTRACT. Every path that cannot positively establish the caller
 * is under their limit returns allowed:false. That includes a missing uid, an
 * endpoint with no RATE_LIMITS entry, and any thrown error from Firestore.
 *
 * This is deliberate and load-bearing: every caller of this function fronts a
 * paid OpenAI call. The previous behaviour allowed the request in all three of
 * those cases, which meant a new endpoint added to the router silently shipped
 * with NO rate limit at all — exactly how /journal-prompt,
 * /generate-daily-plan and /week-recap-suggestions came to be unmetered.
 *
 * Adding a new paid endpoint therefore REQUIRES adding a RATE_LIMITS entry.
 * Forgetting now breaks the endpoint loudly instead of uncapping the bill.
 *
 * @param {string} userId Verified caller uid.
 * @param {string} endpoint RATE_LIMITS key (router path or "fn:" pseudo-path).
 * @return {Promise<object>} {allowed, remaining, resetAt, reason?}
 */
async function checkRateLimit(userId, endpoint) {
  if (!userId) {
    // No verified caller — refuse rather than assume. Reaching this means an
    // auth check upstream was skipped or reordered.
    logger.error("Rate limit check called without userId", {endpoint});
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now(),
      reason: "unidentified",
    };
  }

  const limit = RATE_LIMITS[endpoint];
  if (!limit) {
    // Unconfigured endpoint. Refuse: an unmetered paid route is the failure
    // mode this whole function exists to prevent.
    logger.error("Rate limit refused: no RATE_LIMITS entry for endpoint", {
      userId, endpoint,
    });
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now(),
      reason: "unconfigured",
    };
  }

  const now = Date.now();
  const hourlyWindowStart = now - limit.windowMs;
  const dailyWindowStart = now - DAY_MS;
  // Retain timestamps for the wider of the two windows so both checks stay correct.
  const retentionStart = limit.dailyMax ? dailyWindowStart : hourlyWindowStart;

  // Firestore path: rateLimits/{userId}/requests/{endpoint}
  // Sanitize endpoint for use as Firestore doc ID (no forward slashes)
  const db = admin.firestore();
  const safeEndpoint = endpoint.replace(/\//g, "_");
  const docRef = db.collection("rateLimits").doc(userId).collection("requests").doc(safeEndpoint);

  try {
    const doc = await docRef.get();
    const data = doc.exists ? doc.data() : null;

    // Keep all timestamps within the retention window (24h when daily cap is set).
    const requests = (data?.requests || []).filter((ts) => ts > retentionStart);

    const hourlyCount = requests.filter((ts) => ts > hourlyWindowStart).length;
    const dailyCount = requests.length;

    if (hourlyCount >= limit.maxRequests) {
      const oldestInHour = Math.min(...requests.filter((ts) => ts > hourlyWindowStart));
      logger.warn("Rate limit exceeded (hourly)", {
        userId, endpoint, count: hourlyCount, limit: limit.maxRequests,
      });
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestInHour + limit.windowMs,
        reason: "hourly",
      };
    }

    if (limit.dailyMax && dailyCount >= limit.dailyMax) {
      const oldestInDay = Math.min(...requests);
      logger.warn("Rate limit exceeded (daily)", {
        userId, endpoint, count: dailyCount, limit: limit.dailyMax,
      });
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestInDay + DAY_MS,
        reason: "daily",
      };
    }

    // Add current request timestamp and persist
    requests.push(now);
    await docRef.set({
      requests,
      lastRequest: now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const hourlyRemaining = limit.maxRequests - (hourlyCount + 1);
    const dailyRemaining = limit.dailyMax ? limit.dailyMax - (dailyCount + 1) : Infinity;
    return {
      allowed: true,
      remaining: Math.min(hourlyRemaining, dailyRemaining),
      resetAt: now + limit.windowMs,
    };
  } catch (err) {
    // FAIL CLOSED. If the counter cannot be read or written we cannot know
    // whether this caller is over their limit, so we refuse. A brief outage on
    // an AI feature is recoverable; an uncapped OpenAI bill is not.
    logger.error("Rate limit check failed — refusing request (fail closed)", {
      userId, endpoint, error: err.message,
    });
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now(),
      reason: "unavailable",
    };
  }
}

/**
 * Send the HTTP rejection for a failed checkRateLimit, for onRequest handlers.
 *
 * Two distinct classes, deliberately given different status codes:
 *
 *   429 — the caller genuinely exhausted their quota ("hourly" / "daily").
 *         Retryable by the user, later. Carries Retry-After.
 *   503 — the server could not EVALUATE the limit ("unconfigured",
 *         "unavailable", "unidentified"). Not the caller's fault, and telling
 *         them they hit a daily limit would be a false statement. No paid call
 *         was made either way.
 *
 * Both deny. The split exists so the user-facing message stays factual and so
 * a misconfigured endpoint is distinguishable from an abusive one in logs.
 *
 * @param {object} res Express response object.
 * @param {object} rateLimit Result returned by checkRateLimit.
 * @param {object} ctx Log context, e.g. {userId, path}.
 * @return {object} The Express response, already sent.
 */
function rejectRateLimited(res, rateLimit, ctx) {
  const reason = rateLimit.reason;

  if (reason === "hourly" || reason === "daily") {
    logger.warn("Request blocked by rate limit", {...ctx, reason});
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    const isDaily = reason === "daily";
    res.set("Retry-After", retryAfter.toString());
    return res.status(429).json({
      error: "Too many requests",
      code: isDaily ? "daily_limit_exceeded" : "hourly_limit_exceeded",
      message: isDaily ?
        "You've reached today's limit for this feature. Try again tomorrow." :
        "You've exceeded the rate limit. Please try again later.",
      retryAfter,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });
  }

  // Server-side inability to evaluate the limit. Already logged at error level
  // inside checkRateLimit with the endpoint path.
  return res.status(503).json({
    error: "Service unavailable",
    code: "rate_limit_unavailable",
    reason: reason || "unknown",
    message: "This feature is temporarily unavailable. Please try again later.",
  });
}

/**
 * Callable-function equivalent of rejectRateLimited. Throws rather than returns.
 *
 * @param {object} rateLimit Result returned by checkRateLimit.
 * @param {object} ctx Log context, e.g. {userId, fn}.
 * @return {void} Never returns normally; always throws HttpsError.
 */
function throwRateLimited(rateLimit, ctx) {
  const reason = rateLimit.reason;

  if (reason === "hourly" || reason === "daily") {
    logger.warn("Callable blocked by rate limit", {...ctx, reason});
    throw new HttpsError(
        "resource-exhausted",
        reason === "daily" ?
          "You've reached today's limit for this feature. Try again tomorrow." :
          "You've exceeded the rate limit. Please try again later.",
        {
          code: reason === "daily" ? "daily_limit_exceeded" : "hourly_limit_exceeded",
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
    );
  }

  throw new HttpsError(
      "unavailable",
      "This feature is temporarily unavailable. Please try again later.",
      {code: "rate_limit_unavailable", reason: reason || "unknown"},
  );
}


module.exports = {
  setRateLimitDeps,
  checkRateLimit,
  rejectRateLimited,
  throwRateLimited,
  RATE_LIMITS,
  ROUTED_PATHS,
  // Exported for tests only.
  DAY_MS,
  HOUR_MS,
};
