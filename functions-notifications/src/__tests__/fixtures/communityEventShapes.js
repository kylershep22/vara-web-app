/**
 * The two Community event documents, in the exact shape the mobile app
 * writes them. One definition, used by the sender's test world
 * (helpers/world.js) and by the NPM-3a-ii walk helper
 * (scripts/walk/community-push/communityPushHelper.js), so the walk writes
 * what the tests prove the sender handles.
 *
 * Copied from the mobile writers, not invented:
 * - directMessages: mobile/src/services/firebase/messaging.service.ts
 *   sendDirectMessage {conversationId, senderId, receiverId, text, read,
 *   createdAt}
 * - connections: mobile/src/services/firebase/community.service.ts
 *   sendConnectionRequest {requesterId, addresseeId, participants, status,
 *   createdAt}
 */

/**
 * A direct message from senderId to receiverId in an existing conversation.
 * @param {object} fields
 * @param {string} fields.conversationId
 * @param {string} fields.senderId
 * @param {string} fields.receiverId
 * @param {string} fields.text
 * @param {*} fields.createdAt a server timestamp, or a test stand-in
 * @return {object} the directMessages document
 */
function directMessageDoc(fields) {
  return {
    conversationId: fields.conversationId,
    senderId: fields.senderId,
    receiverId: fields.receiverId,
    text: fields.text,
    read: false,
    createdAt: fields.createdAt,
  };
}

/**
 * A pending connection request from requesterId to addresseeId.
 * @param {object} fields
 * @param {string} fields.requesterId
 * @param {string} fields.addresseeId
 * @param {*} fields.createdAt a server timestamp, or a test stand-in
 * @return {object} the connections document
 */
function connectionRequestDoc(fields) {
  return {
    requesterId: fields.requesterId,
    addresseeId: fields.addresseeId,
    participants: [fields.requesterId, fields.addresseeId],
    status: "pending",
    createdAt: fields.createdAt,
  };
}

module.exports = {directMessageDoc, connectionRequestDoc};
