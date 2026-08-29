/**
 * RevenueCat Webhook Handler
 *
 * Server-to-server endpoint. Sole authorized writer of paid subscription
 * state on /users/{uid} under the locked-down firestore.rules.
 *
 * Why v2 onRequest (not onCall):
 *   RevenueCat invokes this via HTTP POST with a static Authorization header
 *   — it does not speak Firebase's callable protocol.
 *
 * Schema parity with reader (mobile/src/utils/subscription.ts):
 *   The reader determines active/expired by comparing `premiumExpiresAt` and
 *   `gracePeriodExpiresAt` to now (via `isPast()`), not by `type` alone. So
 *   this writer always sets accurate timestamps and lets the reader compute
 *   state. EXPIRATION explicitly writes `type='expired'` as the unambiguous
 *   revocation signal.
 *
 * Idempotency: every branch produces an absolute-state patch — no increments
 * — so RevenueCat retries are safe.
 *
 * Anonymous app_user_id ($RCAnonymousID:*) and unmappable UIDs return 200
 * without writing so RevenueCat does not retry.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

const REVENUECAT_WEBHOOK_AUTH_TOKEN = defineSecret("REVENUECAT_WEBHOOK_AUTH_TOKEN");

// Product IDs → billing period.
// Keep in sync with App Store Connect / Play Console / RevenueCat products.
const PRODUCT_BILLING_PERIOD = {
  "com.vara.wellness.monthly": "monthly",
  "com.vara.wellness.annual": "annual",
};

/**
 * Constant-time equality for the shared secret.
 * Prevents timing oracles even though the secret is high entropy.
 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * RevenueCat lets the operator configure the EXACT Authorization header value
 * in its dashboard. The most common conventions are "Bearer <token>" or a
 * raw "<token>". Support both: strip a leading "Bearer " if present.
 */
function extractAuthToken(header) {
  if (typeof header !== "string") return "";
  const trimmed = header.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

/**
 * Guard against writing to a phantom user doc (account deleted, RC event
 * arrives late). Returns true only if a Firebase Auth user exists.
 */
async function authUserExists(uid) {
  try {
    await admin.auth().getUser(uid);
    return true;
  } catch (err) {
    if (err && err.code === "auth/user-not-found") return false;
    logger.warn("revenueCatWebhook: unexpected auth.getUser error", {
      uid,
      code: err && err.code,
      message: err && err.message,
    });
    return false;
  }
}

const revenueCatWebhook = onRequest(
    {
      secrets: [REVENUECAT_WEBHOOK_AUTH_TOKEN],
      timeoutSeconds: 30,
    },
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const expected = REVENUECAT_WEBHOOK_AUTH_TOKEN.value() || "";
      if (!expected) {
        logger.error("revenueCatWebhook: REVENUECAT_WEBHOOK_AUTH_TOKEN secret is empty");
        res.status(500).json({error: "Server misconfigured"});
        return;
      }
      const provided = extractAuthToken(req.headers.authorization);
      if (!safeEqual(provided, expected)) {
        logger.warn("revenueCatWebhook: auth mismatch");
        res.status(401).json({error: "Unauthorized"});
        return;
      }

      const event = req.body && req.body.event;
      if (!event || typeof event !== "object") {
        logger.warn("revenueCatWebhook: missing or invalid event in body");
        res.status(400).json({error: "Invalid payload: missing event"});
        return;
      }

      // Defensive extraction — every field is optional in some event types.
      const eventType = event.type || "";
      const eventId = event.id || null;
      const appUserId = event.app_user_id || "";
      const productId = event.product_id || "";
      const expirationAtMs = typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : null;
      const originalTransactionId = event.original_transaction_id || null;
      const periodType = event.period_type || null;
      const store = event.store || null;
      const environment = event.environment || null;
      // BILLING_ISSUE-only field name per RevenueCat webhook docs; if RC ever
      // renames it the BILLING_ISSUE branch falls back to expirationAtMs.
      const gracePeriodExpirationAtMs = typeof event.grace_period_expiration_at_ms === "number"
        ? event.grace_period_expiration_at_ms
        : null;

      if (!appUserId || appUserId.startsWith("$RCAnonymousID:")) {
        logger.info("revenueCatWebhook: skipping anonymous app_user_id", {
          eventType, eventId, appUserId,
        });
        res.status(200).json({ok: true, skipped: "anonymous_app_user_id"});
        return;
      }

      const exists = await authUserExists(appUserId);
      if (!exists) {
        logger.info("revenueCatWebhook: skipping; no Firebase user for app_user_id", {
          eventType, eventId, appUserId,
        });
        res.status(200).json({ok: true, skipped: "no_firebase_user"});
        return;
      }

      const db = admin.firestore();
      const userRef = db.collection("users").doc(appUserId);
      const billingPeriod = PRODUCT_BILLING_PERIOD[productId] || null;
      const expiresAtTs = expirationAtMs
        ? admin.firestore.Timestamp.fromMillis(expirationAtMs)
        : null;
      const graceExpiresAtTs = gracePeriodExpirationAtMs
        ? admin.firestore.Timestamp.fromMillis(gracePeriodExpirationAtMs)
        : null;
      const nowFv = admin.firestore.FieldValue.serverTimestamp();
      const delFv = admin.firestore.FieldValue.delete();

      let patch = null;
      let logState = {};

      switch (eventType) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "UNCANCELLATION": {
          patch = {
            subscription: {
              type: "premium",
              premiumStartedAt: nowFv,
              premiumExpiresAt: expiresAtTs,
              billingPeriod: billingPeriod,
              originalTransactionId: originalTransactionId,
              periodType: periodType,
              willRenew: true,
              isInGracePeriod: false,
              gracePeriodExpiresAt: delFv,
              store: store,
              environment: environment,
              lastEventType: eventType,
              lastEventId: eventId,
              lastEventAt: nowFv,
            },
            subscriptionType: "premium",
            hasActiveSubscription: true,
          };
          logState = {type: "premium", expiresAtMs: expirationAtMs, billingPeriod};
          break;
        }

        case "CANCELLATION": {
          // Auto-renew turned off; user keeps access until premiumExpiresAt.
          // Reader will flip to 'expired' automatically once that timestamp
          // passes — do NOT downgrade type or hasActiveSubscription here.
          const subPatch = {
            willRenew: false,
            lastEventType: eventType,
            lastEventId: eventId,
            lastEventAt: nowFv,
          };
          if (expiresAtTs) subPatch.premiumExpiresAt = expiresAtTs;
          patch = {subscription: subPatch};
          logState = {type: "premium (cancelled, access until expiry)", expiresAtMs: expirationAtMs};
          break;
        }

        case "EXPIRATION": {
          patch = {
            subscription: {
              type: "expired",
              expiredAt: nowFv,
              isInGracePeriod: false,
              gracePeriodExpiresAt: delFv,
              willRenew: false,
              lastEventType: eventType,
              lastEventId: eventId,
              lastEventAt: nowFv,
            },
            subscriptionType: "expired",
            hasActiveSubscription: false,
          };
          logState = {type: "expired"};
          break;
        }

        case "BILLING_ISSUE": {
          // Apple grants access during grace; reader's grace branch handles it.
          patch = {
            subscription: {
              type: "premium",
              isInGracePeriod: true,
              gracePeriodExpiresAt: graceExpiresAtTs || expiresAtTs,
              billingPeriod: billingPeriod,
              lastEventType: eventType,
              lastEventId: eventId,
              lastEventAt: nowFv,
            },
            subscriptionType: "premium",
            hasActiveSubscription: true,
          };
          logState = {
            type: "premium (grace period)",
            gracePeriodExpiresAtMs: gracePeriodExpirationAtMs || expirationAtMs,
          };
          break;
        }

        default: {
          // PRODUCT_CHANGE, NON_RENEWING_PURCHASE, SUBSCRIPTION_PAUSED,
          // TEMPORARY_ENTITLEMENT_GRANT, TEST, TRANSFER, REFUND, etc.
          // No-op; 200 so RevenueCat does not retry.
          logger.info("revenueCatWebhook: unhandled event type", {
            eventType, eventId, appUserId,
          });
          res.status(200).json({ok: true, skipped: "unhandled_event_type", eventType});
          return;
        }
      }

      try {
        // MIGRATION_FALLBACK — DUAL-WRITE, slice 2 of the userPrivate migration.
        //
        // Subscription state is read by useSubscription on users/{uid} in every
        // build already in the field, and on web. Writing it only to
        // userPrivate would strip access from anyone who has not updated. So it
        // lands on BOTH until slice 4 flips the readers, in ONE batch — a
        // half-applied entitlement is the worst outcome this webhook has.
        //
        // The private half uses set(merge) because the document may not exist
        // yet. FieldValue.delete() sentinels inside `patch` mirror correctly
        // through both writes.
        const batch = db.batch();
        batch.set(userRef, patch, {merge: true});
        batch.set(
            db.collection("userPrivate").doc(appUserId),
            {...patch, uid: appUserId, updatedAt: nowFv},
            {merge: true},
        );
        await batch.commit();
        logger.info("revenueCatWebhook: applied", {
          eventType,
          eventId,
          uid: appUserId,
          productId,
          ...logState,
        });
        res.status(200).json({ok: true, eventType, uid: appUserId});
      } catch (err) {
        logger.error("revenueCatWebhook: write failed", {
          eventType,
          eventId,
          uid: appUserId,
          error: err && err.message,
        });
        res.status(500).json({error: "Failed to apply subscription update"});
      }
    },
);

module.exports = {revenueCatWebhook};
