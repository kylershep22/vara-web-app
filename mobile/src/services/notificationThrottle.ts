/**
 * Notification Throttle Service
 * Prevents notification spam by enforcing rate limits and quiet hours.
 *
 * Rules:
 * - Maximum 1 system notification per 4-hour window
 * - In-app toasts are exempt from throttle but limited to 1 at a time
 * - Quiet hours (default 9 PM – 8 AM) block all system notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const THROTTLE_KEY = '@vara_notification_last_sent';
const THROTTLE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Check if a system notification can be sent (outside throttle window)
 */
export async function canSendSystemNotification(): Promise<boolean> {
  try {
    const lastSent = await AsyncStorage.getItem(THROTTLE_KEY);
    if (!lastSent) return true;
    return Date.now() - parseInt(lastSent, 10) > THROTTLE_WINDOW_MS;
  } catch {
    return true; // Allow on error
  }
}

/**
 * Mark that a system notification was just sent
 */
export async function markNotificationSent(): Promise<void> {
  try {
    await AsyncStorage.setItem(THROTTLE_KEY, String(Date.now()));
  } catch {
    // Non-critical, continue
  }
}

/**
 * Check if the current time falls within quiet hours
 * Handles overnight spans (e.g., 9 PM – 8 AM)
 */
export function isInQuietHours(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 8 AM – 5 PM)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 9 PM – 8 AM)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
