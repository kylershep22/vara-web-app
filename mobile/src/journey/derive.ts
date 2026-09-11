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
import type { DailyLog, PhaseKey, WeeklyCycle } from '../types/models';

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
 * What `deriveAdjustDue` needs. Every term is a primitive or an array the
 * caller already holds; nothing here reaches Firestore or a clock.
 */
export interface AdjustDueInput {
  /**
   * The user's weekly cycles since the phase was entered, OLDEST FIRST,
   * EXACTLY AS `getWeeklyCyclesSince` RETURNED THEM.
   *
   * THE ORDERING IS THE SERVICE'S CONTRACT AND THIS FUNCTION CONSUMES IT. See
   * the header above for why it must not be re-established here.
   */
  cyclesOldestFirst: WeeklyCycle[];
  /**
   * The phase in progress. Reads given about any other phase are excluded.
   *
   * WHY A READ CAN NAME A DIFFERENT PHASE: `phaseKeyAtRead` is stored beside
   * every read precisely because the phase can change between a close and
   * whenever the read is next consulted. Two not_moving reads given about the
   * stretch the user has just LEFT are a true account of that stretch and say
   * nothing about this one, so they must not offer to adjust it on its first
   * day.
   */
  phaseKey: PhaseKey;
  /**
   * The re-arm floor: a cycle counts only if its `weekStart` is STRICTLY after
   * this date. Null when nothing has established a floor yet.
   *
   * THE LATEST OF THREE INSTANTS, resolved once in `PhaseContext` so the
   * Timestamp-to-ISO conversion happens in one place rather than in every
   * caller: the phase's own `enteredAt`, `adjustDeclinedAt` and
   * `adjustChosenAt`. Entering the phase, declining the offer and acting on it
   * are three different ways of saying "start counting again from here", and
   * the most recent of them wins.
   *
   * `weekStart`, NOT `weekEnd`, AND THE DIFFERENCE IS LOAD BEARING. Step 0 of
   * this slice caught it: the offer can only be on Today when the NEWEST read
   * is `not_moving`, and the newest read always belongs to the LIVE week
   * (`closeWeeklyCycle` attaches it to the live cycle; `ensureCurrentWeeklyCycle`
   * rolls that cycle over before Home renders). A live week is one whose
   * `weekEnd` is today or later, so at the decline instant D the triggering
   * week has `weekEnd >= D` and a `weekEnd > D` floor KEEPS it. The same two
   * reads would then re-trigger on the very next render, which is the exact
   * failure the re-arm exists to prevent. Its `weekStart` is on or before D,
   * so a `weekStart > D` floor excludes it and the count genuinely restarts.
   *
   * STRICTLY AFTER, NOT ON-OR-AFTER, for the same reason: a decline taken on
   * the first day of a week must still exclude that week.
   */
  armedFromIso: string | null;
}

/**
 * Should the app OFFER to adjust the journey?
 *
 * TWO CONSECUTIVE 'not_moving' WEEKLY READS (Section 1). One flat week is
 * normal and offering to change course on it would be noise. The reads must be
 * consecutive, so an 'unclear' or 'moving' week between two not_moving weeks
 * breaks the run and the offer does not fire.
 *
 * IT CONSUMES `getWeeklyCyclesSince`'s ORDERING AND DOES NOT RE-SORT. THIS IS A
 * CHANGE IN SLICE 7b AND IT FIXED A LIVE DISAGREEMENT, not a hypothetical one.
 * This function used to sort by `(a.weekEnd ?? '')`, which lands a row with no
 * stored `weekEnd` at the OLDEST end as the empty string. The service sorts the
 * same rows by `resolveWeekEnd(weekStart, weekEnd)`, which resolves that row to
 * `weekStart + 6` and can place it LAST. `weekEnd` only became a stored field
 * partway through, so rows without one exist. Two functions with two
 * definitions of "newest", one of them documented as the authority and the
 * other silently winning, is how the wrong two weeks get read with nothing
 * failing. There is now ONE authority: the service, whose fallback-aware
 * `resolveWeekEnd` ordering is asserted by its own tests and by this module's.
 *
 * THE WINDOW IS READS, NOT WEEKS (slice 7b, amendment 4). Cycles with no
 * `phaseRead` are removed BEFORE the two most recent are taken, so a week the
 * user did not answer does not occupy a slot. This is a DELIBERATE CHANGE from
 * the rule this comment used to state, which was that absence "breaks a run
 * exactly as a 'moving' read would":
 *
 *   - WHAT IT FIXES. Rollover creates the next week's cycle before Home renders
 *     and carries `outcome` and `capacityInitial` forward but never
 *     `phaseRead`. Under the old rule, a blank rolled-over week displaced one of
 *     the two reads and withdrew a due offer the moment the week turned, from a
 *     user who had answered not_moving twice and had not yet been asked
 *     anything. The offer would vanish without the user acting and without a
 *     newer read contradicting it.
 *   - WHAT IT PRESERVES. Silence still never accumulates and still never counts
 *     against the user; it is simply not a read. "Silence is not a complaint"
 *     is unchanged and is in fact stated more exactly by exclusion than it was
 *     by breaking the run.
 *   - WHAT IS NOT AFFECTED. `unclear` IS a read and stays in the window, where
 *     it breaks the run on the `every` below. Uncertainty is an answer about
 *     the user's own confidence; absence is no answer at all. The two were
 *     indistinguishable to the old threshold and are deliberately no longer.
 *
 * READS ABOUT THIS PHASE ONLY. `phaseKeyAtRead` must match, and a read with no
 * phase attached is excluded rather than assumed to be about this one. See
 * `AdjustDueInput.phaseKey`.
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
 * 'moving', and must not be treated as a negative signal anywhere else.
 *
 * ONLY EXPLICIT `not_moving` ACCUMULATES. The `every` below already enforces
 * this by construction: a run needs two literal 'not_moving' values and any
 * other value fails it. Stated here because the rule is a product decision that
 * happens to match the code today, not a property the code would keep on its
 * own through a refactor.
 *
 * C1 NEVER GATES THE ADVANCEMENT OFFER. Advancement stays governed by its own
 * consistency/time eligibility and stays an offer; `phaseRead` is read HERE and
 * nowhere else, and `deriveAdvanceDue` does not read it. Adding a "must report
 * moving before advancing" requirement would be a separate product decision, to
 * be taken deliberately and never inferred from this field.
 *
 * `same` -> `unclear` WAS A SEMANTIC CHANGE, NOT A RENAME, and the distinction
 * is kept here because the field's meaning depends on it:
 *
 *   'same'    = the user reports NO CHANGE. A real read about the journey.
 *   'unclear' = the user CANNOT TELL. A read about their own confidence.
 *
 * "No change" is a substantive answer; "hard to tell" is the absence of one.
 * The neutrality rules above attach to `unclear` and were never true of `same`.
 * Kyle ran the migration check on 2026-09-10: a collection-group read of
 * `weeklyCycles` filtered `phaseRead != null` returned ZERO documents, so the
 * re-spec rewrote nothing a user said. Slice 6's weekly reset is the first
 * writer of the field.
 *
 * ELIGIBILITY ONLY. THE DECLINE NO LONGER SHORT-CIRCUITS HERE, and that is
 * slice 7b completing what 7a started on the advance side. This function used
 * to return false outright on a non-null `adjustDeclinedAt`, under a comment
 * saying the conservative reading would stand "one more slice". This is that
 * slice. A decline is now a FLOOR on which reads count (see `armedFromIso`),
 * not a suppression, because R5 re-arms the counter and a suppression cannot
 * re-arm. WHERE an offer is surfaced, and the two-offer cap on surfacing it,
 * are `placeAdjustOffer` in journey/offerPlacement.ts. Do not reintroduce a
 * suppression term here.
 */
export function deriveAdjustDue(input: AdjustDueInput): boolean {
  const { cyclesOldestFirst, phaseKey, armedFromIso } = input;

  // ONE FILTER PASS, THREE RULES, AND THE ORDER OF THE CLAUSES IS NOT THE
  // POLICY - all three must hold. What IS policy is that every one of them runs
  // BEFORE the two most recent are taken: a cycle excluded here must not
  // occupy a slot in the window, which is the whole substance of the amendment
  // above and of the re-arm floor.
  const window = cyclesOldestFirst.filter(
    (cycle) =>
      // A read, not merely a week.
      cycle.phaseRead !== undefined &&
      cycle.phaseRead !== null &&
      // Given about the stretch the user is standing in.
      cycle.phaseKeyAtRead === phaseKey &&
      // After the last time the count was armed.
      (armedFromIso === null || cycle.weekStart > armedFromIso)
  );

  if (window.length < ADJUST_CONSECUTIVE_NOT_MOVING) return false;

  const mostRecent = window.slice(-ADJUST_CONSECUTIVE_NOT_MOVING);
  return mostRecent.every((cycle) => cycle.phaseRead === 'not_moving');
}
