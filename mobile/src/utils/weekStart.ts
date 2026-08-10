/**
 * Week-boundary arithmetic for the weekly loop (spec 6.1).
 *
 * ANCHORED, NOT FIXED-LENGTH. A cycle carries an explicit inclusive `weekEnd`,
 * and "is this week still live" is `todayIso <= weekEnd` — never a day count
 * from an arbitrary origin. That is what lets the FIRST cycle be a partial
 * "stub" (setup mid-week, running to the day before the user's next chosen
 * start day) while every cycle after it is a full seven days anchored to that
 * start day.
 *
 * WHY THE OLD age < WEEK_LENGTH_DAYS PREDICATE HAD TO GO. It answered "has a
 * week elapsed since the open", which is only the same question as "has this
 * week ended" when every cycle is exactly seven days long. On a four-day stub
 * it kept the cycle current for three days INTO the following week, so the user
 * could not open their first full week on the day it began. WEEK_LENGTH_DAYS
 * survives here as the LENGTH OF A FULL WEEK — the input to computing a
 * weekEnd, and the legacy fallback below — and it no longer appears in any
 * liveness test.
 *
 * `userPrivate.weekStartDay` (0 = Sunday … 6 = Saturday) is the durable anchor.
 * It is OPTIONAL throughout: until the setup picker writes one, `planWeek`
 * falls back to anchoring on the open date, which is byte-for-byte the behavior
 * this module had before. Nothing here requires a start day to exist.
 *
 * Pure: the current date is always injected, never read from the clock here, so
 * every function below is a pure function of its inputs and testable without
 * faking time.
 */

/**
 * Days in a full week.
 *
 * Used to COMPUTE a boundary (a full week's weekEnd, and the legacy fallback),
 * never to test one. A stub week is shorter than this by design.
 */
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
 * Shift an ISO date by whole days.
 *
 * UTC-midnight arithmetic for the same reason as daysBetweenIso: adding seven
 * local days across a daylight-saving transition lands an hour off and can roll
 * the calendar date backwards.
 */
export function addDaysIso(iso: string, days: number): string {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const shifted = new Date(utcMidnight(iso) + days * MS_PER_DAY);
  const month = `${shifted.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${shifted.getUTCDate()}`.padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${month}-${day}`;
}

/**
 * Day of the week for an ISO date. 0 = Sunday … 6 = Saturday, matching
 * `Date#getDay` and therefore `userPrivate.weekStartDay`.
 *
 * Read in the UTC frame so it agrees with every other function here; a local
 * `new Date(iso)` would parse the string as UTC and then report a local day,
 * which is off by one for half the world.
 */
export function isoWeekday(iso: string): number {
  return new Date(utcMidnight(iso)).getUTCDay();
}

/**
 * The next occurrence of `weekStartDay`, STRICTLY after `fromIso`.
 *
 * Strictness is load-bearing in two places. It makes a setup that lands ON the
 * start day a full seven days rather than a zero-day stub, and it makes
 * "the anchor after this week ended" land on the following week rather than on
 * the boundary date itself.
 */
export function nextWeekStartAfter(fromIso: string, weekStartDay: number): string {
  const delta = (weekStartDay - isoWeekday(fromIso) + WEEK_LENGTH_DAYS) % WEEK_LENGTH_DAYS;
  // A delta of 0 means fromIso is already on the start day; strictly-after
  // means the next one, a full week along.
  return addDaysIso(fromIso, delta === 0 ? WEEK_LENGTH_DAYS : delta);
}

/**
 * The most recent occurrence of `weekStartDay`, on or before `fromIso`.
 *
 * This is what anchors a LATE open: a user who opens on Tuesday belongs to the
 * week that began on their start day, not to a new week beginning Tuesday.
 */
export function mostRecentWeekStartOnOrBefore(
  fromIso: string,
  weekStartDay: number
): string {
  const delta = (isoWeekday(fromIso) - weekStartDay + WEEK_LENGTH_DAYS) % WEEK_LENGTH_DAYS;
  return addDaysIso(fromIso, -delta);
}

/**
 * A cycle's inclusive last day, with the LEGACY FALLBACK.
 *
 * Every cycle written before boundaries were stored has no `weekEnd`, and for
 * those `weekStart + 6` reproduces the old fixed-length behavior exactly. This
 * is why the slice needs no backfill: the fallback IS the migration, computed
 * at read time for the rows that predate the field and for nothing else.
 *
 * Call this rather than reading `cycle.weekEnd` directly. A raw read is how a
 * legacy cycle silently reads as expired.
 */
export function resolveWeekEnd(
  weekStart: string,
  storedWeekEnd?: string | null
): string {
  return storedWeekEnd ?? addDaysIso(weekStart, WEEK_LENGTH_DAYS - 1);
}

/**
 * Is a cycle ending on `weekEnd` still live as of `todayIso`?
 *
 * INCLUSIVE of weekEnd: it is the last day the cycle is live, not the first day
 * it is over. A future `weekEnd` counts as live, which preserves the clock-skew
 * guard the retired predicate carried — treating a skewed cycle as stale would
 * open a second cycle for a week the user already has.
 *
 * Lexicographic comparison is the date comparison: ISO YYYY-MM-DD sorts exactly
 * as it orders chronologically.
 */
export function isWithinWeek(weekEnd: string, todayIso: string): boolean {
  return todayIso <= weekEnd;
}

/** The boundary of a week, as planned at the moment it is opened. */
export interface WeekPlan {
  weekStart: string;
  /** Inclusive last day. */
  weekEnd: string;
}

export interface WeekPlanInput {
  /** Today, injected. Never read from the clock in here. */
  todayIso: string;
  /**
   * The user's chosen start day, 0 = Sunday … 6 = Saturday. Null or undefined
   * until the setup picker writes one, which is every user today.
   */
  weekStartDay: number | null | undefined;
  /**
   * The inclusive weekEnd of the user's most recent cycle, or null when they
   * have none.
   *
   * NULL IS WHAT MAKES THIS A SETUP WEEK. It is the only signal separating the
   * first cycle (which starts today and may be a stub) from every cycle after
   * it (which anchors to the start day). Callers on the onboarding path pass
   * null unconditionally — see OnboardingV3DoneScreen for why a retry must not
   * flip this.
   */
  priorWeekEnd: string | null;
}

/**
 * Where a week being opened today begins and ends.
 *
 * THE FIX FOR THE DRIFTING ANCHOR. The old write path stamped
 * `toIsoDate(new Date())` as weekStart on every open, so a user who opened a
 * day late moved their week a day later, permanently, and a chosen start day
 * could never take effect. Here the start day decides, and the open date only
 * decides WHICH anchored week the user has landed in.
 *
 * Three cases, in the order they are tested:
 *
 *  1. NO START DAY (every user until the picker ships): anchor on the open date
 *     and run a full week. Identical to the previous behavior on every path
 *     that was reachable before this slice.
 *  2. SETUP (no prior cycle): start today and run to the day before the next
 *     start day. A setup that lands on the start day gets a full seven days,
 *     not a zero-day stub, because `nextWeekStartAfter` is strict.
 *  3. RECURRING: anchor to the start day. The result always falls ON the start
 *     day, which is the invariant that keeps the anchor from drifting.
 *
 * NO CYCLE MAY OVERLAP THE ONE BEFORE IT. Two cycles covering the same days
 * corrupts both the per-outcome week count and the continuity history, and
 * nothing downstream would ever notice. The guard below pushes a replacement
 * week to the first anchor AFTER the outgoing one, which is forward-dated and
 * correct rather than overlapping.
 *
 * DEFENCE IN DEPTH, not a response to any one caller. The entry guard only
 * routes to the open once a week has EXPIRED, so the ordinary path arrives here
 * with `priorWeekEnd` already in the past and the guard is a no-op. It earns
 * its place on the paths that bypass that rule — the __DEV__ Settings entry, a
 * forward-dated cycle left by an earlier open, and clock or timezone skew —
 * where a live prior week can still be in play.
 */
export function planWeek({
  todayIso,
  weekStartDay,
  priorWeekEnd,
}: WeekPlanInput): WeekPlan {
  const fullWeekFrom = (weekStart: string): WeekPlan => ({
    weekStart,
    weekEnd: addDaysIso(weekStart, WEEK_LENGTH_DAYS - 1),
  });

  // 1. No chosen start day: the open date is the anchor, as it always was.
  if (weekStartDay === null || weekStartDay === undefined) {
    const weekStart =
      priorWeekEnd !== null && priorWeekEnd >= todayIso
        ? addDaysIso(priorWeekEnd, 1)
        : todayIso;
    return fullWeekFrom(weekStart);
  }

  // 2. Setup: the stub. Starts today whatever day that is, and ends when the
  // user's first full week is due to begin.
  if (priorWeekEnd === null) {
    return {
      weekStart: todayIso,
      weekEnd: addDaysIso(nextWeekStartAfter(todayIso, weekStartDay), -1),
    };
  }

  // 3. Recurring: the week the user is actually in, unless that week is one the
  // outgoing cycle still covers — then the next one. Both branches land on the
  // start day, including when the outgoing cycle is a legacy row whose boundary
  // falls on an arbitrary weekday.
  const anchored = mostRecentWeekStartOnOrBefore(todayIso, weekStartDay);
  return fullWeekFrom(
    anchored <= priorWeekEnd ? nextWeekStartAfter(priorWeekEnd, weekStartDay) : anchored
  );
}
