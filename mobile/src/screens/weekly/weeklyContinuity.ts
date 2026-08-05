/**
 * Continuity, from stored cycles (spec Section 1, surfaced on Today per S9).
 *
 * THE SEAM between storage and the pure engine. `computeContinuity` knows
 * nothing about Firestore and `WeeklyCycle` knows nothing about the engine's
 * input type, so something has to map one to the other. It lives here, beside
 * the screens, for the same reason `weeklyEntry.ts` does: it is a decision the
 * screen obeys rather than logic the screen owns, and it is testable without a
 * navigator or a render.
 *
 * ORDER IS LOAD-BEARING AND SILENT WHEN WRONG. `computeContinuity` walks its
 * input from the END and stops at the first missed floor, so it requires
 * records oldest-first. `getWeeklyCyclesForUser` returns them in whatever order
 * Firestore hands back, and `getLatestWeeklyCycle` sorts newest-first. Feeding
 * either straight in returns a number that is wrong without ever throwing: it
 * would count the run at the WRONG END of history and quietly report a broken
 * streak as unbroken, or the reverse. The sort below is the fix, and the tests
 * include one that fails if it is removed.
 *
 * WHY NOT getRecentWeeklyCycles: that query pairs `where userId ==` with
 * `orderBy weekStart desc`, which needs a composite index that
 * firestore.indexes.json does not contain. `getWeeklyCyclesForUser` is
 * equality-only, so it is served by the automatic single-field index and needs
 * no index deploy at all. One document per week makes sorting in memory cheap
 * (about 52 rows a year), and continuity has to read the whole history anyway
 * to find where the run breaks. This is the reason the weekly-close slice did
 * NOT add the index that open item #12 anticipated.
 *
 * Pure except for `loadWeeklyContinuity`, which is the one-line read path.
 */
import { computeContinuity, type WeeklyRecord } from '../../weeklyEngine';
import { getWeeklyCyclesForUser } from '../../services/firebase/weeklyCycle.service';
import type { WeeklyCycle } from '../../types/models';

/**
 * Stored cycles to continuity records, OLDEST FIRST.
 *
 * A cycle with no `floorMet` counts as not met. That is every cycle written
 * before the weekly close existed, and every week the user opened but never
 * closed. Continuity therefore counts from the first closed week, which is the
 * honest answer: an unanswered week is not evidence the floor was held.
 *
 * `weekStart` is ISO YYYY-MM-DD, which sorts lexicographically exactly as it
 * sorts chronologically, so a string comparison is the date comparison.
 *
 * Copies before sorting. `Array.prototype.sort` mutates, and reordering the
 * caller's array as a side effect of reading it is the kind of thing that
 * shows up three screens away.
 */
export function toWeeklyRecords(cycles: WeeklyCycle[]): WeeklyRecord[] {
  return [...cycles]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0))
    .map((cycle) => ({
      weekStart: cycle.weekStart,
      floorMet: cycle.floorMet ?? false,
    }));
}

/**
 * The user's run of unbroken weeks. 0 when they have no closed weeks yet.
 *
 * Reads the full history rather than a recent window on purpose: the run can be
 * any length, and a window would silently cap the count at its own size.
 */
export async function loadWeeklyContinuity(userId: string): Promise<number> {
  const cycles = await getWeeklyCyclesForUser(userId);
  return computeContinuity(toWeeklyRecords(cycles));
}
