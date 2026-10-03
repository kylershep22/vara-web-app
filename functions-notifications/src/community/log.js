/**
 * Structured logging for the Community push sender: the walk's server
 * evidence (Kyle's ruling S3-4).
 *
 * EVERY INVOCATION WRITES EXACTLY TWO LINES, both with the message
 * "community_push":
 *   1. received - at the start: {stage, kind, eventId}
 *   2. outcome  - at the end, exactly one of these outcome values:
 *        sent: {stage, outcome, kind, eventId, recipientId, ticketId}
 *        ineligible, duplicate, config_missing, send_failed:
 *          {stage, outcome, kind, eventId, actorId, recipientId, reason,
 *           code}
 *
 * "sent" is written only after Expo accepted the push request, and carries
 * Expo's ticket ID. It names only the recipient: the sent line carries no
 * other user ID. Every field is a fixed key filled from an ID, a reason code
 * or an error code, so message text, display names, push tokens and the
 * access token cannot reach a log line by accident.
 */

const logger = require("firebase-functions/logger");

const MESSAGE = "community_push";

/** The only outcome values an outcome line can carry. */
const OUTCOMES = ["sent", "ineligible", "duplicate", "config_missing",
  "send_failed"];

/**
 * The first line of every invocation.
 * @param {string} kind direct_message | connection_request
 * @param {string} eventId the triggering document's ID
 */
function logReceived(kind, eventId) {
  logger.info(MESSAGE, {stage: "received", kind, eventId});
}

/**
 * The last line of every invocation.
 * @param {string} kind
 * @param {string} eventId
 * @param {object} result
 * @param {string} result.outcome one of OUTCOMES
 * @param {string=} result.level info | error
 * @param {string=} result.actorId
 * @param {string=} result.recipientId
 * @param {string=} result.reason a fixed reason code
 * @param {*=} result.code an Expo or Firestore error code
 * @param {string=} result.ticketId Expo's ticket ID (sent only)
 */
function logOutcome(kind, eventId, result) {
  const outcome = OUTCOMES.includes(result.outcome) ?
    result.outcome : "send_failed";
  if (outcome === "sent") {
    logger.info(MESSAGE, {
      stage: "outcome",
      outcome,
      kind,
      eventId,
      recipientId: result.recipientId || null,
      ticketId: result.ticketId === undefined ? null : String(result.ticketId),
    });
    return;
  }
  const level = result.level === "info" ? "info" : "error";
  logger[level](MESSAGE, {
    stage: "outcome",
    outcome,
    kind,
    eventId,
    actorId: result.actorId || null,
    recipientId: result.recipientId || null,
    reason: result.reason || outcome,
    code: result.code === undefined || result.code === null ?
      null : String(result.code),
  });
}

module.exports = {logReceived, logOutcome, OUTCOMES};
