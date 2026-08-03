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
 */
import { isCurrentWeek } from '../../utils/weekStart';

/** The three screens a user can enter on. */
export type WeeklyEntryTarget = 'floor' | 'open' | 'today';

export interface WeeklyEntryInput {
  /** null when the user has never written one. */
  floorCommitment: string | null;
  /** weekStart of the user's most recent cycle; null when they have none. */
  latestCycleWeekStart: string | null;
  /** Today, injected. Never read from the clock in here. */
  todayIso: string;
}

export function resolveWeeklyEntry({
  floorCommitment,
  latestCycleWeekStart,
  todayIso,
}: WeeklyEntryInput): WeeklyEntryTarget {
  if (!floorCommitment) return 'floor';
  if (!latestCycleWeekStart) return 'open';
  return isCurrentWeek(latestCycleWeekStart, todayIso) ? 'today' : 'open';
}
