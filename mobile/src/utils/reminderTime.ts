/**
 * The one validity check for a stored daily reminder time (NPM-2).
 *
 * A time is valid when it is an object whose hour is a whole number from 0 to
 * 23 and whose minute is a whole number from 0 to 59. Anything else (null, a
 * map with null parts, a string, 7.5) is not a time: the scheduler treats it as
 * no time, and the Settings row offers Add a time instead of formatting it.
 *
 * Kept in a module with no imports so every caller sees the real check: the
 * scheduler reaches it here rather than through notificationPreferences.service,
 * which tests routinely replace wholesale. The service re-exports it.
 */
import type { ReminderTime } from '../types';

export function isValidReminderTime(value: unknown): value is ReminderTime {
  if (!value || typeof value !== 'object') return false;
  const { hour, minute } = value as { hour?: unknown; minute?: unknown };
  return (
    Number.isInteger(hour) &&
    (hour as number) >= 0 &&
    (hour as number) <= 23 &&
    Number.isInteger(minute) &&
    (minute as number) >= 0 &&
    (minute as number) <= 59
  );
}
