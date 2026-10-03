/**
 * Notification Functions (codebase: notifications)
 *
 * The single Community push sender (NPM-3a-i, Kyle's K2), through Expo:
 *   notifyOnDirectMessageCreated      directMessages/{messageId}
 *   notifyOnConnectionRequestCreated  connections/{connectionId}
 * Both go through src/community: one shared eligibility check, then a
 * duplicate marker, then one push.
 *
 * And, unchanged:
 *   notifyOnInviteCreated             connectionInvites/{inviteId}
 * which is dormant legacy web infrastructure (K3); see src/legacy.
 */

const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

setGlobalOptions({maxInstances: 10});

// Initialize Admin SDK once, before any module that reads Firestore loads.
if (!admin.apps.length) {
  admin.initializeApp();
}

const {
  handleDirectMessageCreated,
  handleConnectionRequestCreated,
} = require("./src/community/triggers");
const {handleInviteCreated} = require("./src/legacy/inviteCreated");

exports.notifyOnDirectMessageCreated = onDocumentCreated(
    "directMessages/{messageId}",
    handleDirectMessageCreated,
);

exports.notifyOnConnectionRequestCreated = onDocumentCreated(
    "connections/{connectionId}",
    handleConnectionRequestCreated,
);

exports.notifyOnInviteCreated = onDocumentCreated(
    "connectionInvites/{inviteId}",
    handleInviteCreated,
);
