/**
 * Weekday names for display, indexed 0 = Sunday … 6 = Saturday.
 *
 * Matches `Date#getDay` and therefore `userPrivate.weekStartDay` and
 * `isoWeekday`, so an index can travel from the stored preference to a rendered
 * label without a conversion step anywhere in between.
 *
 * SEPARATE FROM weekStart.ts on purpose. That module is the boundary ARITHMETIC
 * the entry guard runs on, and it is deliberately free of anything user-facing.
 * Labels are presentation and belong out here.
 *
 * Two private DAY_NAMES arrays already exist (components/dashboard/
 * habitWeekState.ts and components/habits/habitHistory.ts). Neither is exported
 * and both serve their own module's column ordering; consolidating the three is
 * a tidy-up with its own blast radius, not this slice's work.
 */
import { isoWeekday } from './weekStart';

/** Full weekday names, Sunday first. */
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Short weekday names, Sunday first. For compact controls. */
export const WEEKDAY_SHORT_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

/** Every valid weekStartDay value, in render order. */
export const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * The weekday name of an ISO date (YYYY-MM-DD).
 *
 * Goes through `isoWeekday`, which reads the date in the same UTC frame as the
 * rest of the boundary maths, so a rendered day name cannot disagree with the
 * boundary it describes.
 */
export function weekdayNameForIso(iso: string): string {
  return WEEKDAY_NAMES[isoWeekday(iso)];
}
