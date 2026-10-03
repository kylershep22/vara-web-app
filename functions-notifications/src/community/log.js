/**
 * Structured logging for the Community push sender.
 *
 * Every entry carries the same fixed set of keys: the event kind, the
 * triggering document's ID, the two user IDs, a reason code and, for Expo
 * errors, Expo's own error code. Nothing else is ever passed in, so message
 * text, display names and push tokens cannot reach the logs by accident.
 */

const logger = require("firebase-functions/logger");

const LEVELS = ["info", "warn", "error"];

/**
 * Write one Community push log entry.
 *
 * @param {string} level info | warn | error
 * @param {object} fields
 * @param {string} fields.kind direct_message | connection_request
 * @param {string} fields.eventId
 * @param {string=} fields.actorId
 * @param {string=} fields.recipientId
 * @param {string} fields.reason a fixed reason code
 * @param {string=} fields.code an Expo or Firestore error code
 */
function logCommunity(level, fields) {
  const write = LEVELS.includes(level) ? logger[level] : logger.error;
  write("community_push", {
    kind: fields.kind,
    eventId: fields.eventId,
    actorId: fields.actorId || null,
    recipientId: fields.recipientId || null,
    reason: fields.reason,
    code: fields.code === undefined ? null : String(fields.code),
  });
}

module.exports = {logCommunity};
