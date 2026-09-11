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
}

/**
 * Which door opened, or null when neither has.
 *
 * TWO DOORS, AND WHICH ONE OPENED IS COPY-BEARING, which is why this returns a
 * discriminant rather than a boolean and why `deriveAdvanceDue` below is
 * defined in terms of it. B2 ships two variants (Content Pack v1 section B2):
 * the consistency variant can say the user has been coming back, and the
 * ceiling variant deliberately cannot, because there is nothing there to name.
 * Two independent comparisons - one for "is it due", one for "which card" -
 * would be two places to keep in step, and the day they disagreed the ceiling
 * user would be told they had been consistent.
 *
 * CONSISTENCY WINS WHEN BOTH ARE OPEN. Someone at 8 consistent days AND 14
 * calendar days has done the work, and the honest card is the one that says so.
 * The ceiling is what catches the user who has NOT, so serving it to someone
 * who has would understate what happened.
 */
export type AdvanceDoor = 'consistency' | 'ceiling' | null;

export function deriveAdvanceDoor(input: AdvanceDueInput): AdvanceDoor {
  if (input.consistentDays >= ADVANCE_MIN_CONSISTENT_DAYS) return 'consistency';
  if (input.calendarDays >= ADVANCE_CALENDAR_CEILING_DAYS) return 'ceiling';
  return null;
}

/**
 * Should the app OFFER to move to the next phase?
 *
 * EITHER threshold suffices, never both (Section 1). The consistency door
 * opens for someone doing the work; the calendar ceiling opens for someone who
 * is not, so a phase can never become a place to be stuck.
 *
 * ELIGIBILITY ONLY. THIS FUNCTION KNOWS NOTHING ABOUT EXPOSURES, TODAY OR THE
 * MAP, and that separation is the whole of slice 7a decision 1. It used to take
 * `advanceDeclinedAt` and short-circuit false on it, under a comment calling
 * that a placeholder whose final policy was slice 7. This is that policy, and
 * the placeholder was wrong in a specific way worth recording: a decline made
 * this return false, and a false here would have hidden the offer from the MAP
 * as well as from Today, which contradicts section 9 R3's "then map only". A
 * declined offer is still DUE; it is merely no longer surfaced on Today.
 *
 * Where an offer is surfaced is `placeAdvanceOffer` in journey/offerPlacement.ts,
 * which takes this answer plus the exposure state. Do not reintroduce a
 * suppression term here.
 */
export function deriveAdvanceDue(input: AdvanceDueInput): boolean {
  return deriveAdvanceDoor(input) !== null;
}

/**
 * Should the app OFFER to adjust the journey?
 *
 * TWO CONSECUTIVE 'not_moving' WEEKLY READS (Section 1). One flat week is
 * normal and offering to change course on it would be noise. The reads must be
 * consecutive, so an 'unclear' or 'moving' week between two not_moving weeks
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
 * C1 THREE-STATE CONTRACT (Content Pack v1, decisions section 1, approved
 * 2026-09-05). The weekly question has exactly three answers and they map:
 *
 *   "Yes, I can feel a difference" -> 'moving'
 *   "Not really yet"               -> 'not_moving'
 *   "Hard to tell"                 -> 'unclear'
 *
 * `unclear` is NEUTRAL, and neutral is a stronger claim than it sounds. It must
 * not count toward the two-consecutive run below, must not RESET a prior
 * not_moving as though the user reported improvement, must not be read as
 * 'moving', and must not be treated as a negative signal anywhere else. It
 * behaves exactly as an unanswered week does: it breaks the run without
 * counting against the user. Uncertainty is not a complaint.
 *
 * ONLY EXPLICIT `not_moving` ACCUMULATES. The `every` below already enforces
 * this by construction: a run needs two literal 'not_moving' values and any
 * other value, present or absent, fails it. Stated here because the rule is a
 * product decision that happens to match the code today, not a property the
 * code would keep on its own through a refactor.
 *
 * C1 NEVER GATES THE ADVANCEMENT OFFER. Advancement stays governed by its own
 * consistency/time eligibility and stays an offer; `phaseRead` is read HERE and
 * nowhere else, and `deriveAdvanceDue` does not read it. Adding a "must report
 * moving before advancing" requirement would be a separate product decision, to
 * be taken deliberately and never inferred from this field.
 *
 * THE CONTRACT ABOVE IS NOW THE SHIPPED TYPE (slice 6). `PhaseRead` is
 * `'moving' | 'not_moving' | 'unclear'` in types/models.ts, and this function
 * needed no change to honour it: the `every` below already required two
 * literal 'not_moving' values, so 'unclear' broke the run by construction
 * before it had a name.
 *
 * `same` -> `unclear` WAS A SEMANTIC CHANGE, NOT A RENAME, and the distinction
 * is kept here because the field's meaning depends on it:
 *
 *   'same'    = the user reports NO CHANGE. A real read about the journey.
 *   'unclear' = the user CANNOT TELL. A read about their own confidence.
 *
 * "No change" is a substantive answer; "hard to tell" is the absence of one.
 * The neutrality rules above attach to `unclear` and were never true of `same`.
 *
 * THE STEP-0 CHECK THIS COMMENT USED TO ASK FOR IS ANSWERED, and the answer is
 * recorded here so it is never re-run on a guess. It said the repo could see no
 * writer but could not see production, and that any surviving `same` values
 * could not be silently relabeled. Kyle ran the query on 2026-09-10: a
 * collection-group read of `weeklyCycles` filtered `phaseRead != null` returned
 * ZERO documents. No value had ever been stored, so the re-spec rewrote nothing
 * a user said and needed no migration. Slice 6's weekly reset is the first
 * writer of the field.
 *
 * DECLINED STILL SUPPRESSES HERE, AND THIS IS NOW THE ONLY PLACE THAT DOES.
 * This clause used to read "on the same placeholder policy as
 * deriveAdvanceDue"; that policy is gone from the advance side (slice 7a
 * decision 1 moved it to journey/offerPlacement.ts), so the cross-reference
 * would now point at a rule that no longer exists.
 *
 * IT IS LEFT IN PLACE DELIBERATELY RATHER THAN MOVED TO MATCH. Section 9 R5
 * re-arms the adjust counter after a decline and caps proactive offers at two,
 * and that is slice 7b's scope. Moving the suppression out now would leave the
 * adjust offer with no suppression at all until 7b lands, which is a live
 * behaviour change in a slice that does not own this function. The conservative
 * reading stands one more slice: declined means not due.
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
