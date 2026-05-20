/**
 * onUserCreate Cloud Function
 * Triggered when a new Firebase Auth account is created (any provider).
 * Owns trial-subscription bootstrap so the client never writes subscription state.
 *
 * Idempotent: if users/{uid}.subscription.type is already set, this trigger
 * logs and exits without overwriting. This protects any future server-side
 * flow that pre-provisions a subscription (e.g. coaching invites) before the
 * Auth account fires onCreate.
 */

const functionsV1 = require("firebase-functions/v1");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const TRIAL_DURATION_DAYS = 7;

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
      const trialExpiresAt = admin.firestore.Timestamp.fromMillis(
          Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
      );

      await userRef.set(
          {
            subscription: {
              type: "trial",
              trialStartedAt: now,
              trialExpiresAt,
            },
            hasActiveSubscription: true,
            subscriptionType: "trial",
          },
          {merge: true},
      );

      logger.info("Trial subscription bootstrapped", {uid});
    });

module.exports = {onUserCreate};
