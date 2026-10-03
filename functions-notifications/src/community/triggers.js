/**
 * Community push handlers: one per event, both through the same eligibility
 * check and the same marker-then-send path.
 *
 * The direct-message handler writes no notifications document and sends no
 * email (K4, K15). Neither handler reads allNotificationsEnabled, quiet hours
 * or serverPushEnabled.
 */

const admin = require("firebase-admin");
const {checkDeliveryEligibility} = require("./eligibility");
const {markAndSend} = require("./send");
const {logCommunity} = require("./log");

/**
 * @param {string} kind direct_message | connection_request
 * @param {string} paramName the route param holding the document ID
 * @return {function(object): Promise<void>} an onDocumentCreated handler
 */
function communityHandler(kind, paramName) {
  return async (event) => {
    const snap = event.data;
    const eventId = (event.params && event.params[paramName]) ||
      (snap && snap.id);
    const data = snap ? snap.data() : undefined;
    const db = admin.firestore();

    const eligible = await checkDeliveryEligibility(db, {kind, data});
    if (!eligible.ok) {
      logCommunity(eligible.level, {
        kind,
        eventId,
        actorId: eligible.actorId,
        recipientId: eligible.recipientId,
        reason: eligible.reason,
        code: eligible.code,
      });
      return;
    }

    await markAndSend(db, kind, eventId, eligible);
  };
}

module.exports = {
  handleDirectMessageCreated: communityHandler("direct_message", "messageId"),
  handleConnectionRequestCreated:
    communityHandler("connection_request", "connectionId"),
};
