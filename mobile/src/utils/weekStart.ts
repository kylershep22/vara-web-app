/**
 * Week-start arithmetic for the weekly loop (spec 6.1).
 *
 * PROVISIONAL DERIVATION — read this before depending on `weekStart`. A week
 * starts on the day the user opens it: `weekStart` is simply the ISO date of
 * the open, and a week is current until seven days have passed. Spec 6.1 allows
 * any weekday deliberately (shift and healthcare workers genuinely start
 * midweek), and nothing in the app captures a fixed start day yet.
 *
 * `userPrivate.weekStartDay` exists in the type but is written by nothing; the
 * progressive onboarding in spec 18 is what will set it. When it does, this
 * module is what changes. Until then a later slice reading `weekStart` MUST NOT
 * assume a stable anchor day — two consecutive cycles for the same user can
 * legitimately start on different weekdays.
 *
 * Pure: the current date is always injected, never read from the clock here, so
 * every function below is a pure function of its inputs and testable without
 * faking time.
 */

/** Days in a week. A cycle is current while it is strictly younger than this. */
export const WEEK_LENGTH_DAYS = 7;

/**
 * Format a Date as an ISO calendar date (YYYY-MM-DD) in LOCAL time.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which converts to UTC first
 * and so returns tomorrow's date for anyone east of UTC late in the evening,
 * and yesterday's for the Americas. The user's week starts on the user's day.
 */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Whole days from `fromIso` to `toIso`. Negative when `toIso` is earlier.
 *
 * Both dates are read as UTC midnight rather than local midnight, so the
 * difference is an exact multiple of 24h and cannot be knocked off by a
 * daylight-saving transition inside the interval.
 */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((utcMidnight(toIso) - utcMidnight(fromIso)) / MS_PER_DAY);
}

function utcMidnight(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Is a cycle that started on `weekStart` still the current week as of `todayIso`?
 *
 * True for days 0 through 6; day 7 opens a fresh week. A `weekStart` in the
 * future counts as current: the only way to produce one is a clock or timezone
 * skew, and treating it as stale would open a duplicate cycle for the same week.
 */
export function isCurrentWeek(weekStart: string, todayIso: string): boolean {
  const age = daysBetweenIso(weekStart, todayIso);
  return age < WEEK_LENGTH_DAYS;
}
