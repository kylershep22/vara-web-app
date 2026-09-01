/**
 * The journey's derived quantities (Journey Architecture Roadmap v3,
 * Section 1).
 *
 * PURE. No Firestore, no clock, no imports from services. Every input arrives
 * as an argument, which is what makes the thresholds testable at their exact
 * boundaries rather than only through a mocked read.
 *
 * COUNTERS ARE DERIVED, NEVER STORED (Section 3.1). These functions ARE the
 * counters. Nothing in journeyStates holds a tally, so there is no second copy
 * to drift from these; keep it that way.
 *
 * WHAT THESE DECIDE IS WHETHER TO OFFER, never what to do. Both thresholds
 * open an offer the user answers. Neither advances anyone, and nothing here
 * may become a countdown shown to a user.
 */
import {
  ADJUST_CONSECUTIVE_NOT_MOVING,
  ADVANCE_CALENDAR_CEILING_DAYS,
  ADVANCE_MIN_CONSISTENT_DAYS,
} from '../constants/journey';
import type { DailyLog, WeeklyCycle } from '../types/models';

/**
 * How many days in this phase the user actually completed.
 *
 * CUMULATIVE, NOT A STREAK. Section 1 says eight consistent days, and a missed
 * day does not reset the count: the phase is about accumulating practice, not
 * about an unbroken run. Do not "fix" this into a streak.
 *
 * `date >= enteredAtIso` is an ISO YYYY-MM-DD string compare, which is a valid
 * chronological compare for that format and only for that format.
 *
 * The boundary is INCLUSIVE: a day completed on the day the phase was entered
 * counts. The phase began that day, so the work done on it belongs to it.
 */
export function deriveConsistentDays(logs: DailyLog[], enteredAtIso: string): number {
  return logs.filter(
    (log) => log.protocolCompleted === true && log.date >= enteredAtIso
  ).length;
}

/**
 * How many calendar days the user has been in this phase.
 *
 * Whole days between the two ISO dates, so entering and reading on the same
 * day is 0 and the next day is 1. Computed in UTC from the date parts alone:
 * both arguments are already date-only strings, so there is no time of day to
 * lose, and going through UTC keeps a device in a negative-offset timezone
 * from reading one day short.
 *
 * Returns 0 rather than a negative number when `todayIso` precedes
 * `enteredAtIso`. That ordering means a clock moved backwards or a date was
 * corrected; neither is a reason to report negative time in a phase.
 */
export function deriveCalendarDays(enteredAtIso: string, todayIso: string): number {
  const entered = Date.parse(enteredAtIso + 'T00:00:00Z');
  const today = Date.parse(todayIso + 'T00:00:00Z');
  if (Number.isNaN(entered) || Number.isNaN(today)) return 0;
  const days = Math.floor((today - entered) / 86400000);
  return days > 0 ? days : 0;
}

export interface AdvanceDueInput {
  consistentDays: number;
  calendarDays: number;
  /** Null when the user has not declined an advance in this phase. */
  advanceDeclinedAt: unknown | null;
}

/**
 * Should the app OFFER to move to the next phase?
 *
 * EITHER threshold suffices, never both (Section 1). The consistency door
 * opens for someone doing the work; the calendar ceiling opens for someone who
 * is not, so a phase can never become a place to be stuck.
 *
 * A DECLINE SUPPRESSES THE OFFER FOR THE REST OF THE PHASE. That is a
 * placeholder, not the final policy: re-offer timing is slice 7. Until then
 * declined means not due, which is the conservative reading - it asks once and
 * then leaves the user alone, rather than asking again on a rule nobody has
 * agreed yet.
 */
export function deriveAdvanceDue(input: AdvanceDueInput): boolean {
  if (input.advanceDeclinedAt !== null && input.advanceDeclinedAt !== undefined) {
    return false;
  }
  return (
    input.consistentDays >= ADVANCE_MIN_CONSISTENT_DAYS ||
    input.calendarDays >= ADVANCE_CALENDAR_CEILING_DAYS
  );
}

/**
 * Should the app OFFER to adjust the journey?
 *
 * TWO CONSECUTIVE 'not_moving' WEEKLY READS (Section 1). One flat week is
 * normal and offering to change course on it would be noise. The reads must be
 * consecutive, so a 'same' or 'moving' week between two not_moving weeks
 * breaks the run and the offer does not fire.
 *
 * CONSECUTIVE IS JUDGED BY weekEnd ORDER, not by array order. The caller may
 * hand these over in whatever order the query returned, and an unsorted input
 * silently reading the wrong two weeks is exactly the failure this sorts to
 * avoid. Cycles with no weekEnd sort as empty string and land oldest, which is
 * correct: weekEnd only became a stored field partway through, so a row
 * without one predates every row that has one.
 *
 * AN UNANSWERED WEEK IS NOT A not_moving WEEK. `phaseRead` is absent on every
 * cycle written before slice 6 and on any week the user skipped the question,
 * and absence breaks a run exactly as a 'moving' read would. Silence is not a
 * complaint.
 *
 * Declined suppresses, on the same placeholder policy as deriveAdvanceDue.
 */
export function deriveAdjustDue(
  resetsSinceEntry: WeeklyCycle[],
  adjustDeclinedAt: unknown | null
): boolean {
  if (adjustDeclinedAt !== null && adjustDeclinedAt !== undefined) return false;
  if (resetsSinceEntry.length < ADJUST_CONSECUTIVE_NOT_MOVING) return false;

  const byWeekEnd = [...resetsSinceEntry].sort((a, b) =>
    (a.weekEnd ?? '').localeCompare(b.weekEnd ?? '')
  );
  const mostRecent = byWeekEnd.slice(-ADJUST_CONSECUTIVE_NOT_MOVING);

  return mostRecent.every((cycle) => cycle.phaseRead === 'not_moving');
}
