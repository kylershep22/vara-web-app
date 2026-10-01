/**
 * Routine reminder time: the picker-era helpers (ROUTINE-REMINDER-TIME-PICKER,
 * Kyle's rulings R-4, R-6 and R-7 of 2026-10-01).
 *
 * Pure functions. A stored routine reminder is a string; the picker works in
 * {hour, minute}. `parseTimeString` is the single parser in both directions,
 * and `formatReminderTime` is the one display format ("7:30 PM"), the same one
 * the Reminder set alert already names. Every one of the 1,440 minutes of a day
 * round-trips through the pair (verified at Step 0).
 */

import { parseTimeString } from '../../services/reminderScheduler.service';
import { formatReminderTime } from '../../services/firebase/notificationPreferences.service';
import { ReminderTime } from '../../types';

const MINUTES_PER_DAY = 24 * 60;
const STEP = 15;

/**
 * The next quarter hour STRICTLY after `now`, to the minute: 2:07 PM gives
 * 2:15 PM, and 2:15 PM exactly gives 2:30 PM. Seconds are ignored. A reminder
 * is a time of day with no date, so 11:50 PM wraps to 12:00 AM.
 */
export function nextQuarterHourAfter(now: Date): ReminderTime {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const next = ((Math.floor(minutes / STEP) + 1) * STEP) % MINUTES_PER_DAY;
  return { hour: Math.floor(next / 60), minute: next % 60 };
}

/**
 * Where the picker opens: at the editor's valid reminder if it holds one,
 * otherwise at the next quarter hour. Never a routine-type default (R-4).
 * The caller computes this ONCE, when the sheet opens, and holds it.
 */
export function initialPickerTime(
  reminder: string | null | undefined,
  now: Date
): ReminderTime {
  return (reminder ? parseTimeString(reminder) : null) ?? nextQuarterHourAfter(now);
}

/**
 * A stored reminder as it is displayed (R-7): a value that parses is shown in
 * the picker-era format, so a stored "08:00" reads "8:00 AM"; a value that
 * does not parse is never shown as a time and gives null. Display only: the
 * stored value is never rewritten for formatting.
 */
export function displayReminderTime(stored: string | null | undefined): string | null {
  const parsed = stored ? parseTimeString(stored) : null;
  return parsed ? formatReminderTime(parsed) : null;
}

/**
 * The editor's local model for a persisted reminder (R-6): the stored string
 * if it parses, otherwise null. A legacy malformed value therefore displays as
 * Add a reminder, and an ordinary save persists null with no alert.
 */
export function reminderModelFrom(stored: string | null | undefined): string | null {
  return stored && parseTimeString(stored) ? stored : null;
}
