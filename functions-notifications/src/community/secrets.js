/**
 * The Expo access token for Community pushes.
 *
 * Kyle approved Expo's enhanced push security: every request to Expo's push
 * API carries "Authorization: Bearer <token>", and once that is switched on in
 * Expo, a request without the token is refused. The token is a Firebase
 * function secret, EXPO_ACCESS_TOKEN, bound ONLY to the two Community
 * triggers (index.js). notifyOnInviteCreated sends no push and is not bound.
 *
 * The value is never logged, never put in an error and never returned to a
 * caller except the Expo client that sends with it.
 */

const {defineSecret} = require("firebase-functions/params");

const EXPO_ACCESS_TOKEN = defineSecret("EXPO_ACCESS_TOKEN");

/**
 * The token, or null when it is unavailable or empty. A secret that is not
 * bound reads as an empty string, and a read that throws is treated the same.
 * @return {string|null}
 */
function readExpoAccessToken() {
  let value;
  try {
    value = EXPO_ACCESS_TOKEN.value();
  } catch (err) {
    return null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

module.exports = {EXPO_ACCESS_TOKEN, readExpoAccessToken};
