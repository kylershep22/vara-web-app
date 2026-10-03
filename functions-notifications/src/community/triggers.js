/**
 * Community push handlers: one per event, both through the same eligibility
 * check and the same marker-then-send path.
 *
 * Every invocation writes exactly one "received" line at the start and
 * exactly one outcome line at the end (src/community/log.js), which is the
 * server evidence the walk reads (Kyle's ruling S3-4).
 *
 * The direct-message handler writes no notifications document and sends no
 * email (K4, K15). Neither handler reads allNotificationsEnabled, quiet hours
 * or serverPushEnabled.
 */

const admin = require("firebase-admin");
const {checkDeliveryEligibility} = require("./eligibility");
const {markAndSend} = require("./send");
const {logReceived, logOutcome} = require("./log");
const {readExpoAccessToken} = require("./secrets");

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
    logReceived(kind, eventId);

    let result;
    try {
      const data = snap ? snap.data() : undefined;
      const db = admin.firestore();
      const eligible = await checkDeliveryEligibility(db, {kind, data});
      if (!eligible.ok) {
        result = {
          outcome: "ineligible",
          level: eligible.level,
          actorId: eligible.actorId,
          recipientId: eligible.recipientId,
          reason: eligible.reason,
          code: eligible.code,
        };
      } else {
        result = await markAndSend(
            db, kind, eventId, eligible, readExpoAccessToken());
      }
    } catch (err) {
      // Nothing above is expected to throw. If something does, the
      // invocation still ends with exactly one outcome line, and the event
      // is not retried (ruling 3).
      result = {outcome: "send_failed", level: "error",
        reason: "unexpected_error", code: err && err.code};
    }
    logOutcome(kind, eventId, result);
  };
}

module.exports = {
  handleDirectMessageCreated: communityHandler("direct_message", "messageId"),
  handleConnectionRequestCreated:
    communityHandler("connection_request", "connectionId"),
};
