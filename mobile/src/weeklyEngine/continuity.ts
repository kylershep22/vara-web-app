/**
 * Continuity (spec Section 1, the D1 rule).
 *
 * THE LOAD-BEARING INVARIANT: continuity is measured against the user's floor
 * commitment and NEVER against the current capacity tier. A slammed week that
 * met the floor counts exactly as much as a normal week that met the floor.
 *
 * That is what makes the dynamic in-week re-set (spec Section 7) safe in both
 * directions: raising or lowering capacity changes what the app offers, but it
 * can never move the line that defines "unbroken", so a user cannot upshift
 * themselves into a fresh failure.
 *
 * `WeeklyRecord` deliberately carries no tier field so this cannot regress.
 * Do not add one, and do not read one here.
 */
import type { WeeklyRecord } from './types';

/**
 * The run of consecutive weeks ending at the most recent one where the floor
 * was met. A missed floor breaks the run; nothing else does.
 *
 * Precondition: `records` are chronological, oldest first.
 */
export function computeContinuity(records: WeeklyRecord[]): number {
  let run = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (!records[i].floorMet) break;
    run++;
  }
  return run;
}
