/**
 * Moderation Action Handler Cloud Function
 * Processes admin moderation actions (suspend, ban, warn, etc.)
 * and dispatches notifications to affected users.
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Note: db and serverTimestamp are resolved inside the function body
// because admin.initializeApp() is called in the main index.js before
// this module's exports are invoked at runtime.

// ---------------------------------------------------------------------------
// Notification templates
// ---------------------------------------------------------------------------
const NOTIFICATION_TITLES = {
  warn: "Community Standards Notice",
  suspend: "Account Suspended",
  ban: "Account Banned",
  remove_warn: "Community Standards Notice",
};

function buildNotificationBody(action, reason, duration) {
  switch (action) {
    case "warn":
      return `Your recent activity was flagged for review. Reason: ${reason}`;
    case "suspend":
      return `Your account has been suspended for ${duration || 7} days. Reason: ${reason}`;
    case "ban":
      return `Your account has been permanently banned. Reason: ${reason}`;
    case "remove_warn":
      return `Content was removed and you have received a warning. Reason: ${reason}`;
    default:
      return reason || "A moderation action was taken on your account.";
  }
}

// ===========================================================================
// Cloud Function: onModerationAction
// Triggered when a new moderation action document is created.
// Processes suspend, ban, unsuspend, unban, remove_post, remove_warn,
// warn, and dismiss actions.
// ===========================================================================
const onModerationAction = onDocumentCreated(
  {
    document: "moderationActions/{actionId}",
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data) return;

    const db = admin.firestore();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const actionId = event.params.actionId;
    const {adminId, targetUserId, action, reason, duration, queueItemId} = data;

    if (!targetUserId || !action) {
      logger.warn("Moderation action missing required fields", {actionId});
      return;
    }

    const batch = db.batch();
    const userRef = db.doc(`users/${targetUserId}`);
    const now = new Date();

    // ------------------------------------------------------------------
    // Handle each action type
    // ------------------------------------------------------------------
    switch (action) {
      case "suspend": {
        const days = duration || 7;
        const suspendedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        batch.update(userRef, {
          moderationStatus: "suspended",
          suspendedUntil: admin.firestore.Timestamp.fromDate(suspendedUntil),
          updatedAt: serverTimestamp,
        });
        break;
      }

      case "ban": {
        batch.update(userRef, {
          moderationStatus: "banned",
          updatedAt: serverTimestamp,
        });
        break;
      }

      case "unsuspend":
      case "unban": {
        batch.update(userRef, {
          moderationStatus: "active",
          suspendedUntil: null,
          updatedAt: serverTimestamp,
        });
        break;
      }

      case "remove_post": {
        if (queueItemId) {
          const queueSnap = await db.doc(`moderationQueue/${queueItemId}`).get();
          if (queueSnap.exists) {
            const queueData = queueSnap.data();
            if (queueData.postId) {
              const postRef = db.doc(`posts/${queueData.postId}`);
              batch.update(postRef, {
                hidden: true,
                hiddenReason: "admin_removed",
              });
            }
          }
        }
        break;
      }

      case "remove_warn": {
        if (queueItemId) {
          const queueSnap = await db.doc(`moderationQueue/${queueItemId}`).get();
          if (queueSnap.exists) {
            const queueData = queueSnap.data();
            if (queueData.postId) {
              const postRef = db.doc(`posts/${queueData.postId}`);
              batch.update(postRef, {
                hidden: true,
                hiddenReason: "admin_removed",
              });
            }
          }
        }
        break;
      }

      case "warn": {
        // No user doc changes needed
        break;
      }

      case "dismiss": {
        // No side effects
        break;
      }

      default: {
        logger.warn("Unknown moderation action type", {actionId, action});
        break;
      }
    }

    // ------------------------------------------------------------------
    // Write to moderation history subcollection (all action types)
    // ------------------------------------------------------------------
    const historyRef = db.collection(`users/${targetUserId}/moderationHistory`).doc();
    batch.set(historyRef, {
      action,
      reason: reason || null,
      adminId: adminId || null,
      duration: duration || null,
      timestamp: serverTimestamp,
    });

    // ------------------------------------------------------------------
    // Create notification for warn, suspend, ban, remove_warn
    // ------------------------------------------------------------------
    const notifyActions = ["warn", "suspend", "ban", "remove_warn"];
    if (notifyActions.includes(action)) {
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: targetUserId,
        type: "moderation",
        title: NOTIFICATION_TITLES[action],
        body: buildNotificationBody(action, reason || "No reason provided", duration),
        read: false,
        createdAt: serverTimestamp,
      });
    }

    // ------------------------------------------------------------------
    // Commit the batch
    // ------------------------------------------------------------------
    await batch.commit();

    // ------------------------------------------------------------------
    // Post-batch: Auth operations for ban/unban (cannot be batched)
    // ------------------------------------------------------------------
    if (action === "ban") {
      try {
        await admin.auth().updateUser(targetUserId, {disabled: true});
        await admin.auth().revokeRefreshTokens(targetUserId);
        logger.info("Disabled and revoked tokens for banned user", {targetUserId});
      } catch (err) {
        logger.error("Failed to disable banned user in Auth", {
          targetUserId,
          error: err.message,
        });
      }
    }

    if (action === "unban") {
      try {
        await admin.auth().updateUser(targetUserId, {disabled: false});
        logger.info("Re-enabled unbanned user in Auth", {targetUserId});
      } catch (err) {
        logger.error("Failed to re-enable unbanned user in Auth", {
          targetUserId,
          error: err.message,
        });
      }
    }

    logger.info("Moderation action processed", {
      actionId,
      action,
      targetUserId,
      adminId,
    });
  },
);

module.exports = {
  onModerationAction,
};
