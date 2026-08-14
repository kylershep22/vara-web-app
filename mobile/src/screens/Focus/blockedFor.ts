// Which captured tasks already have a block on them (TB-3, the bridge).
//
// PURE, AND CLIENT-SIDE ON PURPOSE, exactly like groupTasks.ts beside it. There
// is no server-side "tasks that have a block" query and there must not be one:
// listCapturedTasks is a bare `where userId ==` with no orderBy and no composite
// index, and that is a decision with a tripwire test on it (see the service).
// Filtering or joining server-side would trip that tripwire, which is the
// tripwire working. The two lists are loaded independently and married here.
//
// THE LINK IS READ IN ONE DIRECTION ONLY: block -> task, via DayBlock's
// `sourceTaskId`. Nothing on CapturedTask points back, by design — see the
// blockId entry in that type's "deliberately absent" list.

import type { CapturedTask, DayBlock } from '../../types/models';

/**
 * The live block for each task that has one, keyed by task id.
 *
 * TAKES THE TASK LIST TOO, AND NOT JUST THE BLOCKS, and that is what makes a
 * dangling `sourceTaskId` structurally harmless rather than merely tolerated. A
 * cleared task is DELETED with no history, so blocks created from it keep
 * pointing at an id that no longer resolves. Starting from the tasks means the
 * question asked is always "which block points at THIS task, which exists" —
 * a pointer to a cleared task is never followed, never resolved, and never
 * needs a cleanup write. Do not "simplify" this to a blocks-only reduce.
 *
 * THE FIRST MATCH WINS, AND FIRST MEANS EARLIEST — but only because of a
 * guarantee made somewhere else. listDayBlocksBetween issues
 * `orderBy('startAt', 'asc')`, so the caller hands these in start order and the
 * first block found for a task is the one that starts soonest. That is the only
 * reason the chip is deterministic. If that orderBy is ever dropped, relaxed, or
 * the caller starts sorting the list itself, this silently starts showing an
 * arbitrary block for a multi-block task rather than the next one. A test in
 * blockedFor.test.ts pins the behaviour; this comment is what explains why the
 * behaviour depends on a different file.
 *
 * Multiple live blocks for one task is not reachable through the UI — the
 * "Block it" action is hidden the moment a task has any block, so the action and
 * the chip are mutually exclusive. It is still reachable across two devices, so
 * the rule is defined rather than left to array order.
 */
export function blockedFor(
  tasks: CapturedTask[],
  blocks: DayBlock[]
): Map<string, DayBlock> {
  const live = new Set(tasks.map((task) => task.id));
  const byTask = new Map<string, DayBlock>();

  for (const block of blocks) {
    const taskId = block.sourceTaskId;
    if (!taskId) continue;
    // Points at a task that has been cleared. Nothing to show it against.
    if (!live.has(taskId)) continue;
    // First wins: see the note above on why first is earliest.
    if (byTask.has(taskId)) continue;
    byTask.set(taskId, block);
  }

  return byTask;
}
