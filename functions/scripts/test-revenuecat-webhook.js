#!/usr/bin/env node
/**
 * test-revenuecat-webhook.js
 *
 * POSTs representative RevenueCat webhook payloads to the
 * `revenueCatWebhook` HTTP function so you can verify handler logic
 * against the Functions Emulator or a deployed URL.
 *
 * This script does NOT auto-discover deployed URLs. Pass the target URL
 * via TARGET_URL env var or --url flag. Defaults to the local emulator.
 *
 * Usage:
 *   # Against the local emulator (firebase emulators:start --only functions):
 *   UID=<firebase-uid> AUTH_TOKEN=<the-token> \
 *     node functions/scripts/test-revenuecat-webhook.js initial_purchase
 *
 *   # Against a deployed function:
 *   TARGET_URL=https://us-central1-vara-4a99f.cloudfunctions.net/revenueCatWebhook \
 *     UID=<firebase-uid> AUTH_TOKEN=<the-token> \
 *     node functions/scripts/test-revenuecat-webhook.js renewal
 *
 *   # Run all events in sequence:
 *   UID=<firebase-uid> AUTH_TOKEN=<the-token> \
 *     node functions/scripts/test-revenuecat-webhook.js all
 *
 * Events: initial_purchase | renewal | cancellation | expiration | billing_issue | all
 *
 * Requirements:
 *   - Node 18+ (uses built-in fetch).
 *   - The target user must exist in Firebase Auth (the handler's
 *     authUserExists guard rejects unknown UIDs).
 *   - REVENUECAT_WEBHOOK_AUTH_TOKEN must be set on the deployed function
 *     (or in the emulator env) to match AUTH_TOKEN passed here.
 */

const PROJECT_ID = process.env.PROJECT_ID || "vara-4a99f";
const REGION = process.env.REGION || "us-central1";
const DEFAULT_EMULATOR_URL = `http://localhost:5001/${PROJECT_ID}/${REGION}/revenueCatWebhook`;

const args = process.argv.slice(2);
const urlFlagIdx = args.indexOf("--url");
const urlFromFlag = urlFlagIdx >= 0 ? args[urlFlagIdx + 1] : null;
const positional = args.filter((a, i) => a !== "--url" && (i === 0 || args[i - 1] !== "--url"));
const eventName = (positional[0] || "all").toLowerCase();

const TARGET_URL = urlFromFlag || process.env.TARGET_URL || DEFAULT_EMULATOR_URL;
const UID = process.env.UID || "";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";
const PRODUCT_ID = process.env.PRODUCT_ID || "com.vara.wellness.monthly";

if (!UID) {
  console.error("ERROR: UID env var is required (the Firebase UID to update).");
  process.exit(1);
}
if (!AUTH_TOKEN) {
  console.error("ERROR: AUTH_TOKEN env var is required.");
  process.exit(1);
}

const baseEvent = {
  app_user_id: UID,
  product_id: PRODUCT_ID,
  original_transaction_id: "1000000000000001",
  period_type: "NORMAL",
  store: "APP_STORE",
  environment: "SANDBOX",
};

const now = Date.now();
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SIXTEEN_DAYS_MS = 16 * 24 * 60 * 60 * 1000;

const PAYLOADS = {
  initial_purchase: {
    event: {
      ...baseEvent,
      type: "INITIAL_PURCHASE",
      id: `evt_initial_${now}`,
      event_timestamp_ms: now,
      purchased_at_ms: now,
      expiration_at_ms: now + ONE_YEAR_MS,
    },
  },
  renewal: {
    event: {
      ...baseEvent,
      type: "RENEWAL",
      id: `evt_renewal_${now}`,
      event_timestamp_ms: now,
      purchased_at_ms: now,
      expiration_at_ms: now + ONE_YEAR_MS,
    },
  },
  cancellation: {
    event: {
      ...baseEvent,
      type: "CANCELLATION",
      id: `evt_cancel_${now}`,
      event_timestamp_ms: now,
      expiration_at_ms: now + ONE_YEAR_MS,
    },
  },
  expiration: {
    event: {
      ...baseEvent,
      type: "EXPIRATION",
      id: `evt_expire_${now}`,
      event_timestamp_ms: now,
      expiration_at_ms: now,
    },
  },
  billing_issue: {
    event: {
      ...baseEvent,
      type: "BILLING_ISSUE",
      id: `evt_billing_${now}`,
      event_timestamp_ms: now,
      expiration_at_ms: now,
      grace_period_expiration_at_ms: now + SIXTEEN_DAYS_MS,
    },
  },
};

async function postPayload(name, payload) {
  console.log(`\n--- ${name.toUpperCase()} ---`);
  console.log("POST", TARGET_URL);
  console.log("Body:", JSON.stringify(payload, null, 2));
  try {
    const resp = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    console.log(`Status: ${resp.status}`);
    console.log(`Body:   ${text}`);
    return resp.ok;
  } catch (err) {
    console.error(`Request failed: ${err && err.message}`);
    return false;
  }
}

(async () => {
  const events = eventName === "all"
    ? ["initial_purchase", "renewal", "cancellation", "expiration", "billing_issue"]
    : [eventName];

  for (const evt of events) {
    const payload = PAYLOADS[evt];
    if (!payload) {
      console.error(`Unknown event: ${evt}`);
      console.error(`Choose from: ${Object.keys(PAYLOADS).join(", ")} | all`);
      process.exit(1);
    }
    await postPayload(evt, payload);
  }

  console.log("\nDone. Inspect Firestore /users/" + UID + ".subscription to verify.");
})();
