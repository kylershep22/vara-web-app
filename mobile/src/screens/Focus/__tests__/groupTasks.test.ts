// groupTasks — the capture list's client-side bucketing (TB-2b).
//
// Tested directly, like dayShape and suggestPlacement, because this is where
// ALL of the list's ordering lives: the spine query is a bare equality with no
// orderBy and no composite index, by decision, so nothing upstream of this
// function has an opinion about order.

import { groupTasksByDemand } from '../groupTasks';
import type { CapturedTask, Demand } from '../../../types/models';

const ts = (ms: number) => ({ toMillis: () => ms }) as any;

const task = (id: string, demand: Demand, createdAt: any = ts(1000)): CapturedTask =>
  ({
    id,
    userId: 'u1',
    title: `Task ${id}`,
    demand,
    createdAt,
    updatedAt: ts(1000),
  }) as CapturedTask;

describe('groupTasksByDemand', () => {
  it('returns nothing for an empty list', () => {
    expect(groupTasksByDemand([])).toEqual([]);
  });

  it('orders groups heaviest first', () => {
    const groups = groupTasksByDemand([
      task('a', 'light'),
      task('b', 'heavy'),
      task('c', 'medium'),
    ]);

    expect(groups.map((g) => g.demand)).toEqual(['heavy', 'medium', 'light']);
  });

  it('OMITS empty groups entirely', () => {
    // The empty-group pin, at the unit level. The mockup shows HEAVY and LIGHT
    // and no MEDIUM header: a header with nothing under it reads as a slot
    // waiting to be filled, which is the deficit framing this screen avoids.
    const groups = groupTasksByDemand([task('a', 'heavy'), task('b', 'light')]);

    expect(groups.map((g) => g.demand)).toEqual(['heavy', 'light']);
    expect(groups.find((g) => g.demand === 'medium')).toBeUndefined();
  });

  it('orders newest first within a group', () => {
    const groups = groupTasksByDemand([
      task('old', 'heavy', ts(1000)),
      task('new', 'heavy', ts(3000)),
      task('mid', 'heavy', ts(2000)),
    ]);

    expect(groups[0].tasks.map((t) => t.id)).toEqual(['new', 'mid', 'old']);
  });

  it('keeps each task in exactly one group', () => {
    const tasks = [
      task('a', 'heavy'),
      task('b', 'heavy'),
      task('c', 'medium'),
      task('d', 'light'),
    ];

    const groups = groupTasksByDemand(tasks);
    const ids = groups.flatMap((g) => g.tasks.map((t) => t.id));

    expect(ids).toHaveLength(tasks.length);
    expect(new Set(ids).size).toBe(tasks.length);
  });

  it('reads a Timestamp via toDate when toMillis is absent', () => {
    // Firestore hands back a Timestamp; a seeded fixture or an older SDK shape
    // may only offer toDate. Both have to sort rather than collapse to 0.
    const groups = groupTasksByDemand([
      task('old', 'heavy', { toDate: () => new Date(1000) }),
      task('new', 'heavy', { toDate: () => new Date(3000) }),
    ]);

    expect(groups[0].tasks.map((t) => t.id)).toEqual(['new', 'old']);
  });

  it('sorts an unresolved createdAt to the bottom rather than throwing', () => {
    // A serverTimestamp still in flight reads as null on a local snapshot. It
    // must not take the whole list down, and it must not jump to the top of a
    // group it has no claim to.
    const groups = groupTasksByDemand([
      task('pending', 'heavy', null),
      task('real', 'heavy', ts(1000)),
    ]);

    expect(groups[0].tasks.map((t) => t.id)).toEqual(['real', 'pending']);
  });

  it('does not mutate the array it was given', () => {
    // `.sort()` is in-place, so filtering first is what keeps the caller's
    // state array untouched. A memo that mutated its input would make render
    // order depend on how many times it ran.
    const tasks = [task('a', 'heavy', ts(1000)), task('b', 'heavy', ts(3000))];
    const original = [...tasks];

    groupTasksByDemand(tasks);

    expect(tasks).toEqual(original);
  });
});
