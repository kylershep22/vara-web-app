/**
 * Shared fixtures: two users and the documents the mobile app writes.
 *
 * The shapes are copied from the mobile writers, not invented:
 * - directMessages: mobile/src/services/firebase/messaging.service.ts
 *   sendDirectMessage {conversationId, senderId, receiverId, text, read,
 *   createdAt}
 * - connections: mobile/src/services/firebase/community.service.ts
 *   sendConnectionRequest {requesterId, addresseeId, participants, status,
 *   createdAt}
 * - userPrivate/{uid}.expoPushToken: mobile savePushTokenToUser
 *
 * NPM-3a-ii: the two event shapes come from fixtures/communityEventShapes.js,
 * which the walk helper also writes with.
 */

const {
  directMessageDoc,
  connectionRequestDoc,
} = require("../fixtures/communityEventShapes");

const SENDER = "uid-sender-S";
const RECIPIENT = "uid-recipient-R";
const SENDER_NAME = "Sam Sender";
const RECIPIENT_TOKEN = "ExponentPushToken[recipient-R-token]";
const MESSAGE_TEXT = "the secret words of this message";

/**
 * Seed a world in which a direct message from SENDER to RECIPIENT is
 * deliverable under every rule NPM-3a-i ships: an active sender with a name,
 * an accepted connection, no preference document (defaults on), and a valid
 * Expo token for the recipient.
 * @param {object} env from fakeEnv.install()
 */
function seedDeliverable(env) {
  env.seed(`users/${SENDER}`, {displayName: SENDER_NAME});
  env.seed(`users/${RECIPIENT}`, {displayName: "Riley Recipient"});
  env.seed(`userPrivate/${RECIPIENT}`, {expoPushToken: RECIPIENT_TOKEN});
  env.seed("connections/conn-accepted", {
    requesterId: SENDER,
    addresseeId: RECIPIENT,
    participants: [SENDER, RECIPIENT],
    status: "accepted",
    createdAt: {seconds: 1},
  });
  env.seed("conversations/conv-1", {participants: [RECIPIENT, SENDER].sort()});
}

/**
 * Seed the direct message document and return its event.
 * @param {object} env
 * @param {string=} id
 * @param {object=} overrides
 * @return {object} the event for the trigger
 */
function dmEvent(env, id, overrides) {
  const messageId = id || "msg-1";
  env.seed(`directMessages/${messageId}`, Object.assign(directMessageDoc({
    conversationId: "conv-1",
    senderId: SENDER,
    receiverId: RECIPIENT,
    text: MESSAGE_TEXT,
    createdAt: {seconds: 2},
  }), overrides || {}));
  return env.event(`directMessages/${messageId}`, {messageId});
}

/**
 * Seed a pending connection request in the mobile shape and return its event.
 * @param {object} env
 * @param {string=} id
 * @param {object=} overrides
 * @return {object}
 */
function requestEvent(env, id, overrides) {
  const connectionId = id || "conn-request-1";
  env.seed(`connections/${connectionId}`, Object.assign(connectionRequestDoc({
    requesterId: SENDER,
    addresseeId: RECIPIENT,
    createdAt: {seconds: 3},
  }), overrides || {}));
  return env.event(`connections/${connectionId}`, {connectionId});
}

module.exports = {
  SENDER,
  RECIPIENT,
  SENDER_NAME,
  RECIPIENT_TOKEN,
  MESSAGE_TEXT,
  seedDeliverable,
  dmEvent,
  requestEvent,
};
