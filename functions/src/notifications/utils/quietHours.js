/**
 * Quiet Hours Utility
 * Server-side quiet hours check matching client-side logic.
 */

/**
 * Check if the current time falls within a user's quiet hours.
 * @param {object} quietHours - { enabled, startTime: {hour,minute}, endTime: {hour,minute} }
 * @param {Date} [now] - Optional override for current time
 * @returns {boolean}
 */
function isWithinQuietHours(quietHours, now) {
  if (!quietHours || !quietHours.enabled) return false;

  const d = now || new Date();
  const currentMinutes = d.getHours() * 60 + d.getMinutes();
  const startMinutes = quietHours.startTime.hour * 60 + quietHours.startTime.minute;
  const endMinutes = quietHours.endTime.hour * 60 + quietHours.endTime.minute;

  // Overnight (e.g., 21:00 – 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

module.exports = {isWithinQuietHours};
