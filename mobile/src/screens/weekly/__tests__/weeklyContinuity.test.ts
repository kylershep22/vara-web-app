// The storage-to-engine seam for continuity. What it protects: the ordering
// contract computeContinuity depends on (and cannot check for itself), and the
// rule that a week with no recorded floor outcome counts as not met.

const mockGetCycles = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  getWeeklyCyclesForUser: (...a: any[]) => mockGetCycles(...a),
}));

import { loadWeeklyContinuity, toWeeklyRecords } from '../weeklyContinuity';
import { computeContinuity } from '../../../protocolEngine';
import type { WeeklyCycle } from '../../../types/models';

/** A stored cycle. Only the two fields the mapper reads are meaningful. */
const cycle = (weekStart: string, floorMet?: boolean): WeeklyCycle =>
  ({
    id: `c-${weekStart}`,
    userId: 'u1',
    weekStart,
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
    ...(floorMet === undefined ? {} : { floorMet }),
  }) as WeeklyCycle;

describe('toWeeklyRecords', () => {
  test('returns [] for a user with no cycles', () => {
    expect(toWeeklyRecords([])).toEqual([]);
  });

  test('maps weekStart and floorMet, and carries nothing else through', () => {
    // WeeklyRecord deliberately has no tier field. If the mapper ever spread
    // the cycle instead of picking two fields, a capacity would ride along into
    // the continuity input, and the invariant that continuity is judged against
    // the floor and never the tier would stop being structural.
    expect(toWeeklyRecords([cycle('2026-01-05', true)])).toEqual([
      { weekStart: '2026-01-05', floorMet: true },
    ]);
  });

  describe('the ascending sort (the silent-wrong-answer guard)', () => {
    test('sorts newest-first input into oldest-first order', () => {
      const newestFirst = [
        cycle('2026-01-26', true),
        cycle('2026-01-19', true),
        cycle('2026-01-12', false),
        cycle('2026-01-05', true),
      ];

      expect(toWeeklyRecords(newestFirst).map((r) => r.weekStart)).toEqual([
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
      ]);
    });

    test('sorts arbitrarily ordered input, not just reversed input', () => {
      const shuffled = [
        cycle('2026-01-19', true),
        cycle('2026-01-05', true),
        cycle('2026-01-26', true),
        cycle('2026-01-12', true),
      ];

      expect(toWeeklyRecords(shuffled).map((r) => r.weekStart)).toEqual([
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
      ]);
    });

    test('sorts correctly across a month and a year boundary', () => {
      const cycles = [cycle('2027-01-04'), cycle('2026-12-28'), cycle('2026-11-30')];

      expect(toWeeklyRecords(cycles).map((r) => r.weekStart)).toEqual([
        '2026-11-30',
        '2026-12-28',
        '2027-01-04',
      ]);
    });

    test('does not mutate the caller array', () => {
      const cycles = [cycle('2026-01-26', true), cycle('2026-01-05', true)];

      toWeeklyRecords(cycles);

      expect(cycles.map((c) => c.weekStart)).toEqual(['2026-01-26', '2026-01-05']);
    });

    // ---------------------------------------------------------------------
    // THE TEST THAT FAILS IF THE SORT IS REMOVED.
    //
    // computeContinuity walks from the end and stops at the first missed
    // floor. It cannot tell which end it is walking, so a reversed input
    // returns a plausible number rather than an error. Here the run is at the
    // OLD end and the recent weeks were missed: the true answer is 0, and an
    // unsorted (newest-first) input would answer 2 and paint an unbroken
    // fortnight the user did not have.
    // ---------------------------------------------------------------------
    test('a newest-first history yields the SAME count as the oldest-first one', () => {
      const oldestFirst = [
        cycle('2026-01-05', true),
        cycle('2026-01-12', true),
        cycle('2026-01-19', false),
        cycle('2026-01-26', false),
      ];
      const newestFirst = [...oldestFirst].reverse();

      expect(computeContinuity(toWeeklyRecords(newestFirst))).toBe(
        computeContinuity(toWeeklyRecords(oldestFirst))
      );
    });

    test('that history counts 0, because the run sits at the far end of it', () => {
      // Stated as an absolute rather than only as an equality: two equally
      // wrong answers would satisfy the comparison above on its own.
      const newestFirst = [
        cycle('2026-01-26', false),
        cycle('2026-01-19', false),
        cycle('2026-01-12', true),
        cycle('2026-01-05', true),
      ];

      expect(computeContinuity(toWeeklyRecords(newestFirst))).toBe(0);
    });

    test('a newest-first history with a recent run counts only the recent run', () => {
      // The mirror image: the run is at the RECENT end, and the break is old.
      // Unsorted, this would answer 1 instead of 3.
      const newestFirst = [
        cycle('2026-02-02', true),
        cycle('2026-01-26', true),
        cycle('2026-01-19', true),
        cycle('2026-01-12', false),
        cycle('2026-01-05', true),
      ];

      expect(computeContinuity(toWeeklyRecords(newestFirst))).toBe(3);
    });
  });

  describe('a week with no recorded floor outcome', () => {
    test('counts as not met', () => {
      expect(toWeeklyRecords([cycle('2026-01-05')])).toEqual([
        { weekStart: '2026-01-05', floorMet: false },
      ]);
    });

    test('breaks the run where it sits, so continuity counts from the first closed week', () => {
      // Every cycle written before the close slice has no floorMet, and so does
      // any week the user opened and never closed. Both are correct breaks: an
      // unanswered week is not evidence the floor was held.
      const cycles = [
        cycle('2026-01-05', true),
        cycle('2026-01-12'), // opened, never closed
        cycle('2026-01-19', true),
        cycle('2026-01-26', true),
      ];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(2);
    });

    test('an entirely pre-close history counts 0 rather than throwing', () => {
      const cycles = [cycle('2026-01-05'), cycle('2026-01-12'), cycle('2026-01-19')];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(0);
    });
  });

  describe('the counts the run itself produces', () => {
    test('an all-met history counts every week', () => {
      const cycles = [
        cycle('2026-01-05', true),
        cycle('2026-01-12', true),
        cycle('2026-01-19', true),
      ];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(3);
    });

    test('a mid-history gap breaks the run at the right place', () => {
      const cycles = [
        cycle('2026-01-05', true),
        cycle('2026-01-12', true),
        cycle('2026-01-19', false),
        cycle('2026-01-26', true),
        cycle('2026-02-02', true),
      ];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(2);
    });

    test('a missed most-recent week counts 0, however long the run before it', () => {
      const cycles = [
        cycle('2026-01-05', true),
        cycle('2026-01-12', true),
        cycle('2026-01-19', true),
        cycle('2026-01-26', false),
      ];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(0);
    });

    test('a slammed week that held the floor counts like any other', () => {
      // The tier is not read by the mapper, so it cannot reach the count. This
      // is the storage-side half of the invariant the engine tests assert.
      const cycles = [
        { ...cycle('2026-01-05', true), capacityCurrent: 'slammed' } as WeeklyCycle,
        { ...cycle('2026-01-12', true), capacityCurrent: 'normal' } as WeeklyCycle,
      ];

      expect(computeContinuity(toWeeklyRecords(cycles))).toBe(2);
    });
  });
});

describe('loadWeeklyContinuity', () => {
  beforeEach(() => {
    mockGetCycles.mockReset();
  });

  test('reads the full history with the equality-only query, so no index is needed', async () => {
    // getRecentWeeklyCycles would pair userId with orderBy weekStart and need a
    // composite index that does not exist. This path deliberately avoids it.
    mockGetCycles.mockResolvedValue([]);

    await loadWeeklyContinuity('u1');

    expect(mockGetCycles).toHaveBeenCalledWith('u1');
  });

  test('is 0 for a user who has never closed a week', async () => {
    mockGetCycles.mockResolvedValue([cycle('2026-01-05'), cycle('2026-01-12')]);

    expect(await loadWeeklyContinuity('u1')).toBe(0);
  });

  test('is 0 for a user with no cycles at all', async () => {
    mockGetCycles.mockResolvedValue([]);

    expect(await loadWeeklyContinuity('u1')).toBe(0);
  });

  test('counts the run from stored cycles, in whatever order they arrive', async () => {
    mockGetCycles.mockResolvedValue([
      cycle('2026-01-19', true),
      cycle('2026-01-05', true),
      cycle('2026-01-12', true),
    ]);

    expect(await loadWeeklyContinuity('u1')).toBe(3);
  });

  test('propagates a read failure rather than reporting a false 0', async () => {
    // A continuity of 0 means "no unbroken weeks", which is a claim about the
    // user. An unreadable history is not that claim, so this must not swallow
    // the error and answer 0. The caller decides what to show.
    mockGetCycles.mockRejectedValue(new Error('offline'));

    await expect(loadWeeklyContinuity('u1')).rejects.toThrow('offline');
  });
});
