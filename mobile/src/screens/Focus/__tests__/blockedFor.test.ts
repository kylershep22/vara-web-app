// The task-to-block derivation (TB-3).
//
// Pure and render-free, like groupTasks.test.ts beside it. What is worth pinning
// here is not "a Map comes back" but the three properties the chip depends on:
// which direction the link is read, what happens when it dangles, and which
// block wins when there is more than one.

import { blockedFor } from '../blockedFor';
import type { CapturedTask, DayBlock } from '../../../types/models';

const ts = (d: Date) => ({ toDate: () => d }) as any;

function task(id: string, title = 'Q3 board deck'): CapturedTask {
  return {
    id,
    userId: 'u1',
    title,
    demand: 'heavy',
    createdAt: {} as any,
    updatedAt: {} as any,
  };
}

function block(
  id: string,
  start: Date,
  sourceTaskId?: string
): DayBlock {
  return {
    id,
    userId: 'u1',
    title: 'Deep work',
    demand: 'heavy',
    durationMinutes: 60,
    startAt: ts(start),
    isProtected: false,
    ...(sourceTaskId ? { sourceTaskId } : {}),
    createdAt: {} as any,
    updatedAt: {} as any,
  };
}

const NINE = new Date(2026, 7, 14, 9, 0, 0);
const ELEVEN = new Date(2026, 7, 14, 11, 0, 0);
const TOMORROW_EIGHT = new Date(2026, 7, 15, 8, 0, 0);

describe('blockedFor', () => {
  it('matches a block to the task it was created from', () => {
    const map = blockedFor([task('t1')], [block('b1', NINE, 't1')]);

    expect(map.get('t1')?.id).toBe('b1');
  });

  it('leaves a task with no block out of the map entirely', () => {
    // Absence, not a null entry: the caller branches on `get` returning
    // undefined, and a present-but-empty key would make "blocked" truthy.
    const map = blockedFor([task('t1'), task('t2')], [block('b1', NINE, 't1')]);

    expect(map.has('t2')).toBe(false);
    expect(map.size).toBe(1);
  });

  it('ignores blocks that came from no task at all', () => {
    // Hand-started blocks are the common case and carry no sourceTaskId.
    const map = blockedFor([task('t1')], [block('b1', NINE), block('b2', ELEVEN)]);

    expect(map.size).toBe(0);
  });

  it('ignores a block pointing at a task that has been cleared', () => {
    // THE DANGLING CASE, and it is expected rather than exceptional: clearing a
    // task deletes it outright with no history, so blocks made from it keep
    // pointing at an id that no longer resolves. Nothing dereferences it, so
    // there is no cleanup write anywhere in the feature.
    const map = blockedFor([task('t1')], [block('b1', NINE, 'cleared-task')]);

    expect(map.size).toBe(0);
  });

  it('survives a block whose task was cleared alongside one whose task lives', () => {
    const map = blockedFor(
      [task('t1')],
      [block('b1', NINE, 'cleared-task'), block('b2', ELEVEN, 't1')]
    );

    expect(map.size).toBe(1);
    expect(map.get('t1')?.id).toBe('b2');
  });

  it('takes the FIRST block when a task has several', () => {
    // Determinism, pinned. The chip must not flip between two blocks depending
    // on array order.
    const map = blockedFor(
      [task('t1')],
      [block('b1', NINE, 't1'), block('b2', ELEVEN, 't1')]
    );

    expect(map.get('t1')?.id).toBe('b1');
  });

  it('takes the EARLIEST block, because the caller hands them in start order', () => {
    // The guarantee this depends on lives in another file: listDayBlocksBetween
    // issues orderBy('startAt','asc'), so first IS earliest. This asserts the
    // consequence with a list in that order; the day-after block is later in
    // both senses, and both must agree.
    const map = blockedFor(
      [task('t1')],
      [block('b1', NINE, 't1'), block('b2', TOMORROW_EIGHT, 't1')]
    );

    expect(map.get('t1')?.id).toBe('b1');
    expect(map.get('t1')?.startAt.toDate()).toEqual(NINE);
  });

  it('handles several tasks and several blocks at once', () => {
    const map = blockedFor(
      [task('t1'), task('t2'), task('t3')],
      [block('b1', NINE, 't2'), block('b2', ELEVEN), block('b3', TOMORROW_EIGHT, 't1')]
    );

    expect(map.get('t1')?.id).toBe('b3');
    expect(map.get('t2')?.id).toBe('b1');
    expect(map.has('t3')).toBe(false);
  });

  it('returns an empty map for empty inputs rather than throwing', () => {
    expect(blockedFor([], []).size).toBe(0);
    expect(blockedFor([task('t1')], []).size).toBe(0);
    expect(blockedFor([], [block('b1', NINE, 't1')]).size).toBe(0);
  });

  it('mutates neither list it is given', () => {
    // It reads both to build a third thing. A sort in here would reorder the
    // caller's rendered list as a side effect.
    const tasks = [task('t1'), task('t2')];
    const blocks = [block('b2', ELEVEN, 't1'), block('b1', NINE, 't2')];
    const taskIds = tasks.map((t) => t.id);
    const blockIds = blocks.map((b) => b.id);

    blockedFor(tasks, blocks);

    expect(tasks.map((t) => t.id)).toEqual(taskIds);
    expect(blocks.map((b) => b.id)).toEqual(blockIds);
  });
});
