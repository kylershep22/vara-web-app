/**
 * validateEventCode Cloud Function
 * Validates event codes, updates user subscription to 'event' type,
 * and increments participant count on the event document.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const validateEventCode = onCall(
    {region: "us-central1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in");
      }

      const uid = request.auth.uid;
      const code = (request.data?.code || "").trim().toUpperCase();

      if (!code || code.length < 3 || code.length > 8) {
        throw new HttpsError("invalid-argument", "Invalid code format");
      }

      const db = admin.firestore();

      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      if (userData?.eventData) {
        throw new HttpsError(
            "already-exists",
            "You've already joined an event",
        );
      }

      // Most-privileged-wins: don't downgrade an active paid or lifetime tier.
      const currentType = userData?.subscription?.type;
      if (currentType === "premium" || currentType === "coaching") {
        throw new HttpsError(
            "already-subscribed",
            "You already have an active Vara subscription — event access isn't needed.",
        );
      }

      const eventsSnapshot = await db.collection("events")
          .where("code", "==", code)
          .where("isActive", "==", true)
          .limit(1)
          .get();

      if (eventsSnapshot.empty) {
        throw new HttpsError(
            "not-found",
            "That code doesn't look right. Double-check and try again.",
        );
      }

      const eventDoc = eventsSnapshot.docs[0];
      const eventData = eventDoc.data();

      const now = admin.firestore.Timestamp.now();
      if (eventData.expiresAt && eventData.expiresAt.toMillis() < now.toMillis()) {
        throw new HttpsError(
            "deadline-exceeded",
            "That code has expired. Reach out to us if you need help.",
        );
      }

      const freeAccessDays = eventData.freeAccessDays || 90;
      const eventAccessExpiresAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + freeAccessDays * 24 * 60 * 60 * 1000),
      );

      await db.collection("users").doc(uid).update({
        eventData: {
          eventId: eventDoc.id,
          eventCode: code,
          eventName: eventData.name,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        "subscription.type": "event",
        "subscription.eventAccessExpiresAt": eventAccessExpiresAt,
        "subscription.eventGrantedAt": admin.firestore.FieldValue.serverTimestamp(),
        subscriptionType: "event",
        hasActiveSubscription: true,
      });

      await eventDoc.ref.update({
        participantCount: admin.firestore.FieldValue.increment(1),
      });

      logger.info("Event code redeemed", {
        uid,
        code,
        eventId: eventDoc.id,
        eventName: eventData.name,
        freeAccessDays,
      });

      return {
        success: true,
        eventName: eventData.name,
        freeAccessDays,
      };
    },
);

module.exports = {validateEventCode};
