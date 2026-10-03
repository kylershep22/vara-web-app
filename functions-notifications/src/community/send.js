/**
 * Community push: the duplicate marker, the message and the Expo send.
 *
 * AT MOST ONCE (Kyle's ruling 4). The event-specific marker
 * notificationLog/{recipientUid}/community/{eventId} is created with
 * create(), which fails when it already exists, and only after it is written
 * is the push sent. A redelivered event finds the marker and sends nothing.
 * A crash between the marker and the send loses that one push, which is the
 * accepted V1 trade-off in preference to duplicates. There is no automatic
 * retry (ruling 3).
 *
 * NO RECEIPT POLLING in V1 (ruling 7). A ticket that comes back with an
 * error is logged with Expo's error code and nothing else.
 *
 * EXPO ACCESS TOKEN. Every request carries the Expo access token
 * (src/community/secrets.js). Without one there is no send, and the check
 * runs BEFORE the marker, so a configuration fault does not consume it and
 * the event is not silently marked as delivered.
 */

const admin = require("firebase-admin");
const {Expo} = require("expo-server-sdk");
const {logCommunity} = require("./log");

/** Firestore's ALREADY_EXISTS, as the Admin SDK reports it. */
const ALREADY_EXISTS = 6;

/**
 * Title, body and data for one Community push. Copy is Kyle's K7 and K8.
 * The direct-message push carries no message text.
 *
 * @param {string} kind direct_message | connection_request
 * @param {string} eventId the triggering document's ID
 * @param {object} eligible the result of checkDeliveryEligibility
 * @return {object} {title, body, data}
 */
function composePush(kind, eventId, eligible) {
  const name = eligible.actorName;
  if (kind === "direct_message") {
    return {
      title: "New message",
      body: `${name} sent you a message.`,
      data: {
        type: "direct_message",
        conversationId: eligible.parsed.conversationId,
        messageId: eventId,
        senderId: eligible.actorId,
      },
    };
  }
  return {
    title: "New connection request",
    body: `${name} wants to connect. Open Vara to respond.`,
    data: {
      type: "connection_request",
      connectionId: eventId,
      requesterId: eligible.actorId,
    },
  };
}

/**
 * Write the marker, then send. Logs every outcome.
 *
 * @param {object} db
 * @param {string} kind
 * @param {string} eventId
 * @param {object} eligible
 * @param {string|null} accessToken the Expo access token, or null
 * @return {Promise<boolean>} whether a push was handed to Expo
 */
async function markAndSend(db, kind, eventId, eligible, accessToken) {
  const base = {
    kind,
    eventId,
    actorId: eligible.actorId,
    recipientId: eligible.recipientId,
  };

  if (!accessToken) {
    logCommunity("error", Object.assign(
        {reason: "expo_access_token_missing"}, base));
    return false;
  }

  try {
    await db.doc(
        `notificationLog/${eligible.recipientId}/community/${eventId}`,
    ).create({
      kind,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err && err.code === ALREADY_EXISTS) {
      logCommunity("info", Object.assign({reason: "duplicate_event"}, base));
    } else {
      logCommunity("error", Object.assign(
          {reason: "marker_failed", code: err && err.code}, base));
    }
    return false;
  }

  const push = composePush(kind, eventId, eligible);
  const message = {
    to: eligible.token,
    sound: "default",
    title: push.title,
    body: push.body,
    data: push.data,
    priority: "high",
    channelId: "default",
  };

  const expo = new Expo({accessToken});
  let tickets;
  try {
    tickets = await expo.sendPushNotificationsAsync([message]);
  } catch (err) {
    logCommunity("error", Object.assign(
        {reason: "expo_send_failed", code: err && err.code}, base));
    return true;
  }

  const ticket = Array.isArray(tickets) ? tickets[0] : undefined;
  if (!ticket || ticket.status !== "ok") {
    // details.error is Expo's code (for example DeviceNotRegistered). The
    // ticket's message and details also carry the token, so neither is
    // logged.
    const code = ticket && ticket.details && ticket.details.error ?
      ticket.details.error : "unknown";
    logCommunity("error", Object.assign(
        {reason: "expo_ticket_error", code}, base));
    return true;
  }

  logCommunity("info", Object.assign({reason: "sent"}, base));
  return true;
}

module.exports = {composePush, markAndSend};
