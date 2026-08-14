// Grouping for the capture list (TB-2b, mockup C).
//
// PURE, AND CLIENT-SIDE ON PURPOSE. The spine's listCapturedTasks is a bare
// `where userId ==` with no orderBy and no composite index, which was a decision
// rather than an omission: demand buckets are not a sort order, so the rows have
// to be walked in memory regardless, and not needing a composite removes a whole
// class of passes-mocked/fails-production bug. All of the ordering therefore
// happens here. If this ever moves server-side, the index ships in that commit.

import type { CapturedTask, Demand } from '../../types/models';
import { DEMAND_ORDER } from './tasksCopy';

export interface TaskGroup {
  demand: Demand;
  tasks: CapturedTask[];
}

/** Milliseconds from a Firestore Timestamp, a Date, or nothing at all. */
function createdMs(task: CapturedTask): number {
  const value: any = task.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
}

/**
 * Tasks bucketed by demand, heaviest group first, newest first within a group.
 *
 * EMPTY GROUPS ARE OMITTED ENTIRELY — not rendered as an empty header, not
 * rendered with a placeholder line. The mockup shows a list with HEAVY and
 * LIGHT and no MEDIUM header at all, and that is the behaviour rather than an
 * artefact of its example data: a header with nothing under it reads as a slot
 * waiting to be filled, which is the deficit framing this whole screen avoids.
 *
 * Heaviest first because the heavy group is the one worth placing into a block,
 * and it is the group a person scans for. Newest first within a group because a
 * just-captured task should be visible without hunting — capture is the primary
 * action of the screen, so its result belongs at the top of its group.
 *
 * A task whose createdAt has not resolved yet (an optimistic local row, or a
 * serverTimestamp still in flight) sorts to the BOTTOM rather than throwing.
 */
export function groupTasksByDemand(tasks: CapturedTask[]): TaskGroup[] {
  return DEMAND_ORDER.map((demand) => ({
    demand,
    tasks: tasks
      .filter((task) => task.demand === demand)
      .sort((a, b) => createdMs(b) - createdMs(a)),
  })).filter((group) => group.tasks.length > 0);
}
