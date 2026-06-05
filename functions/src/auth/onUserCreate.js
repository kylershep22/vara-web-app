/**
 * onUserCreate Cloud Function
 * Triggered when a new Firebase Auth account is created (any provider).
 * Bootstraps the never-subscribed (type:'none') state so the client never
 * writes subscription state. Under Model A there is no app-side trial — the
 * real trial is the StoreKit intro offer, recorded by the RC webhook.
 *
 * Idempotent: if users/{uid}.subscription.type is already set, this trigger
 * logs and exits without overwriting. This protects any future server-side
 * flow that pre-provisions a subscription (e.g. coaching invites) before the
 * Auth account fires onCreate.
 */

const functionsV1 = require("firebase-functions/v1");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const onUserCreate = functionsV1
    .region("us-central1")
    .auth.user()
    .onCreate(async (user) => {
      const uid = user.uid;
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);

      const snap = await userRef.get();
      if (snap.exists && snap.data()?.subscription?.type) {
        logger.info("Subscription already provisioned, skipping bootstrap", {
          uid,
          existingType: snap.data().subscription.type,
        });
        return;
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      await userRef.set(
          {
            subscription: {
              type: "none",
              // Retained for analytics cohort use (see admin/analytics.js).
              // Effectively a signup timestamp post-Model-A.
              trialStartedAt: now,
            },
            subscriptionType: "none",
          },
          {merge: true},
      );

      logger.info("Subscription state bootstrapped", {uid});
    });

module.exports = {onUserCreate};
