/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/**
 * Unit tests for the fail-closed rate limiter.
 *
 * WHY THESE EXIST: the limiter fronts every paid OpenAI call. Before f94cc9d it
 * returned allowed:true on three separate paths — no uid, no RATE_LIMITS entry,
 * and any Firestore error — which is how /journal-prompt,
 * /generate-daily-plan and /week-recap-suggestions shipped unmetered. Those
 * three paths are the ones asserted here. If any of them ever returns
 * allowed:true again, an endpoint is silently uncapped and these go red.
 *
 * No emulator required. rateLimit.js takes `logger` and `admin` through
 * setRateLimitDeps(), so the Firestore error path is driven by injecting a
 * throwing stub rather than by breaking a real emulator connection.
 */

const rateLimit = require("../rateLimit");

const {
  setRateLimitDeps,
  checkRateLimit,
  RATE_LIMITS,
} = rateLimit;

/**
 * A logger that records instead of printing, so tests can assert on it.
 *
 * @return {object} Logger with a `calls` record of every level.
 */
function makeLogger() {
  const calls = {error: [], warn: [], info: []};
  return {
    calls,
    error: (...a) => calls.error.push(a),
    warn: (...a) => calls.warn.push(a),
    info: (...a) => calls.info.push(a),
  };
}

/**
 * Minimal Firestore stub. `onGet` decides what a document read does, which is
 * the only behaviour these tests need to vary.
 *
 * @param {Function} onGet Stands in for docRef.get().
 * @param {Function} onSet Stands in for docRef.set().
 * @return {object} An admin-shaped object exposing firestore().
 */
function makeAdmin(onGet, onSet = async () => {}) {
  const firestore = () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({get: onGet, set: onSet}),
        }),
      }),
    }),
  });
  // The persist path calls admin.firestore.FieldValue.serverTimestamp(), which
  // hangs off the FUNCTION, not off its return value. Omitting it makes the
  // happy path throw inside the try and report reason:'unavailable' — a stub
  // defect that reads exactly like a limiter failure, so it is spelled out here.
  firestore.FieldValue = {serverTimestamp: () => "SERVER_TIMESTAMP"};
  return {firestore};
}

// A real configured endpoint, so "unconfigured" is never the reason by accident.
const CONFIGURED = "/ai-chat";

describe("checkRateLimit — fail-closed contract", () => {
  let logger;

  beforeEach(() => {
    logger = makeLogger();
    setRateLimitDeps({
      logger,
      admin: makeAdmin(async () => ({exists: false, data: () => null})),
    });
  });

  // ---- The three paths that used to fail OPEN ----

  test("falsy userId is REFUSED, not allowed", async () => {
    const result = await checkRateLimit(null, CONFIGURED);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unidentified");
    expect(result.remaining).toBe(0);
  });

  test("falsy userId logs at error level with the endpoint path", async () => {
    await checkRateLimit(undefined, CONFIGURED);

    expect(logger.calls.error).toHaveLength(1);
    expect(logger.calls.error[0][1]).toEqual({endpoint: CONFIGURED});
  });

  test("endpoint with no RATE_LIMITS entry is REFUSED, not skipped", async () => {
    // The exact shape of the original bug: a paid route added to the router
    // without a config entry. It must break, not run uncapped.
    expect(RATE_LIMITS["/not-a-configured-endpoint"]).toBeUndefined();

    const result = await checkRateLimit("alice", "/not-a-configured-endpoint");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unconfigured");
    expect(result.remaining).toBe(0);
  });

  test("unconfigured endpoint logs at error level naming uid and endpoint", async () => {
    await checkRateLimit("alice", "/not-a-configured-endpoint");

    expect(logger.calls.error).toHaveLength(1);
    expect(logger.calls.error[0][1]).toEqual({
      userId: "alice",
      endpoint: "/not-a-configured-endpoint",
    });
  });

  test("a thrown Firestore read is REFUSED, not allowed", async () => {
    setRateLimitDeps({
      logger,
      admin: makeAdmin(async () => {
        throw new Error("emulator unreachable");
      }),
    });

    const result = await checkRateLimit("alice", CONFIGURED);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unavailable");
    expect(result.remaining).toBe(0);
  });

  test("a thrown Firestore read logs at error level with endpoint and message", async () => {
    setRateLimitDeps({
      logger,
      admin: makeAdmin(async () => {
        throw new Error("emulator unreachable");
      }),
    });

    await checkRateLimit("alice", CONFIGURED);

    expect(logger.calls.error).toHaveLength(1);
    expect(logger.calls.error[0][1]).toMatchObject({
      userId: "alice",
      endpoint: CONFIGURED,
      error: "emulator unreachable",
    });
  });

  test("a thrown Firestore WRITE is also refused", async () => {
    // The read can succeed and the persist still fail. Both are inside the try,
    // and both must deny — otherwise the request proceeds uncounted.
    setRateLimitDeps({
      logger,
      admin: makeAdmin(
          async () => ({exists: false, data: () => null}),
          async () => {
            throw new Error("write failed");
          },
      ),
    });

    const result = await checkRateLimit("alice", CONFIGURED);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unavailable");
  });

  // ---- Regression: the happy path must still work ----

  test("a configured endpoint under its limit is ALLOWED and records the request", async () => {
    let written = null;
    setRateLimitDeps({
      logger,
      admin: makeAdmin(
          async () => ({exists: false, data: () => null}),
          async (payload) => {
            written = payload;
          },
      ),
    });

    const result = await checkRateLimit("alice", CONFIGURED);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(written.requests).toHaveLength(1);
    // 20/hr for /ai-chat, one consumed.
    expect(result.remaining).toBe(RATE_LIMITS[CONFIGURED].maxRequests - 1);
  });

  test("an endpoint at its hourly cap is refused with reason 'hourly'", async () => {
    const now = Date.now();
    const atCap = new Array(RATE_LIMITS[CONFIGURED].maxRequests).fill(now - 1000);
    setRateLimitDeps({
      logger,
      admin: makeAdmin(async () => ({exists: true, data: () => ({requests: atCap})})),
    });

    const result = await checkRateLimit("alice", CONFIGURED);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("hourly");
  });

  test("every routed path has a RATE_LIMITS entry", async () => {
    // Guards the invariant the fail-closed design depends on: a path the router
    // dispatches but the config does not know about is refused at runtime, so
    // this catches it at test time instead.
    const missing = [...rateLimit.ROUTED_PATHS].filter((p) => !RATE_LIMITS[p]);
    expect(missing).toEqual([]);
  });
});
