/**
 * Where a user entering the weekly loop should land (spec 6.1, 10.1).
 *
 * Pure decision function, kept out of the screen so the routing rule can be
 * tested without a navigator, a Firestore mock or a clock. The screen's only job
 * is to fetch the two inputs and obey the answer.
 *
 * The order is deliberate and not interchangeable: the floor commitment is
 * captured while the user is calm (spec 10.1), which means BEFORE the weekly
 * open, not after it and not during a slammed week when they most need it.
 *
 * IT DECIDES, IT DOES NOT ACT. 'rollover' says a cycle must be created; the
 * caller creates it. Keeping the write out of here is what lets the rule stay a
 * pure function of three inputs and be tested without a clock or a database.
 *
 * THE LIVENESS TEST IS THE CYCLE'S OWN BOUNDARY, not its age. A cycle carries
 * an inclusive `weekEnd`, and a week is live until today passes it. The retired
 * `age < WEEK_LENGTH_DAYS` predicate could only ask "has seven days elapsed",
 * which on a four-day stub kept the cycle current for three days into the
 * following week and blocked the user from opening their first full week on the
 * day it began.
 */
import { isWithinWeek, resolveWeekEnd } from '../../utils/weekStart';

/**
 * Where the user lands.
 *
 * 'rollover' WAS 'open', AND THE RENAME IS THE SLICE. It used to name a screen
 * that asked for an outcome and a capacity before writing a cycle; that screen
 * is deleted (roadmap §3.6) because the phase supplies the destination and
 * capacity is a daily answer, so there was nothing left to ask. What remains is
 * a fact about the world rather than a destination: the user has no live week
 * and one must be created. It is TRANSIENT — the caller creates the cycle and
 * resolves again, and a user never sees it.
 */
export type WeeklyEntryTarget = 'floor' | 'rollover' | 'today';

/** The facts about the user's most recent cycle that the rule needs. */
export interface WeeklyEntryCycle {
  weekStart: string;
  /**
   * Inclusive last day. ABSENT on every cycle written before boundaries were
   * stored, which is why this goes through resolveWeekEnd rather than being
   * read directly — the fallback reproduces those cycles' old behavior exactly.
   */
  weekEnd?: string;
  /**
   * The week has been closed: `closeCompletedAt` is set on the cycle.
   *
   * NOT CONSULTED BY THE RULE, on purpose, and carried here so that stays
   * visible. Only expiry routes a user out of their week — see the comment in
   * resolveWeeklyEntry for why closing early must not, and the paired tests
   * that assert the answer is identical closed or not.
   */
  closed: boolean;
}

export interface WeeklyEntryInput {
  /** null when the user has never written one. */
  floorCommitment: string | null;
  /** The user's most recent cycle; null when they have none. */
  latestCycle: WeeklyEntryCycle | null;
  /** Today, injected. Never read from the clock in here. */
  todayIso: string;
}

export function resolveWeeklyEntry({
  floorCommitment,
  latestCycle,
  todayIso,
}: WeeklyEntryInput): WeeklyEntryTarget {
  if (!floorCommitment) return 'floor';
  // No cycle at all is the same answer as an expired one: there is no live week
  // and one has to be made. It used to be a different answer only because the
  // open screen could ask a first-time user questions it could not ask a
  // returning one, and it no longer asks anybody anything.
  if (!latestCycle) return 'rollover';

  // EXPIRY IS THE ONLY THING THAT ROUTES A USER OUT OF THEIR WEEK. Closed-ness
  // is deliberately NOT consulted here, and `closed` is carried on the input
  // above so that this stays a stated decision rather than a missing one.
  //
  // Closing early briefly did route to 'open', and it was wrong twice over: it
  // made the "this week is closed" acknowledgment unreachable (Home renders it
  // only under 'today'), and it tripped Home's focus latch into pushing the
  // weekly open the instant the user finished closing. Closing is a completed,
  // acknowledged state; it is not a shove into next week.
  //
  // What a closed week DOES change is what Home draws, and Home reads
  // `closeCompletedAt` off the cycle itself for that. It is not this rule's
  // business.
  return isWithinWeek(
    resolveWeekEnd(latestCycle.weekStart, latestCycle.weekEnd),
    todayIso
  )
    ? 'today'
    : 'rollover';
}
