import { computeContinuity } from '../continuity';
import type { WeeklyRecord } from '../types';

/** Records are chronological, oldest first (see the contract doc). */
const week = (weekStart: string, floorMet: boolean): WeeklyRecord => ({ weekStart, floorMet });

describe('computeContinuity (spec Section 1, the D1 rule)', () => {
  it('returns 0 for no history', () => {
    expect(computeContinuity([])).toBe(0);
  });

  it('counts every week when the floor was met throughout', () => {
    const records = [
      week('2026-01-05', true),
      week('2026-01-12', true),
      week('2026-01-19', true),
      week('2026-01-26', true),
    ];
    expect(computeContinuity(records)).toBe(4);
  });

  it('counts a single met week as 1', () => {
    expect(computeContinuity([week('2026-01-05', true)])).toBe(1);
  });

  it('resets the run to the tail when a missed week sits in the middle', () => {
    const records = [
      week('2026-01-05', true),
      week('2026-01-12', true),
      week('2026-01-19', false),
      week('2026-01-26', true),
      week('2026-02-02', true),
    ];
    expect(computeContinuity(records)).toBe(2);
  });

  it('returns 0 when the most recent week missed the floor', () => {
    const records = [
      week('2026-01-05', true),
      week('2026-01-12', true),
      week('2026-01-19', false),
    ];
    expect(computeContinuity(records)).toBe(0);
  });

  it('returns 0 when the floor was never met', () => {
    const records = [week('2026-01-05', false), week('2026-01-12', false)];
    expect(computeContinuity(records)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// LOAD-BEARING INVARIANT (spec Section 1): continuity is judged ONLY against
// floorMet. It must never reference the capacity tier. A slammed week that met
// the floor counts identically to a normal week that met the floor. This is
// what makes the dynamic in-week re-set safe in both directions.
// ---------------------------------------------------------------------------
describe('continuity is measured against the floor, never the capacity tier', () => {
  it('counts slammed-but-floor-met weeks identically to normal-but-floor-met weeks', () => {
    // Conceptually: normal, slammed, slammed, normal, limited - all floor met.
    const records = [
      week('2026-01-05', true), // normal
      week('2026-01-12', true), // slammed
      week('2026-01-19', true), // slammed
      week('2026-01-26', true), // normal
      week('2026-02-02', true), // limited
    ];
    expect(computeContinuity(records)).toBe(records.length);
  });

  it('stays unbroken across a downshift and back up again', () => {
    // normal -> limited -> slammed -> limited -> normal, floor met every week.
    const records = [
      week('2026-03-02', true),
      week('2026-03-09', true),
      week('2026-03-16', true),
      week('2026-03-23', true),
      week('2026-03-30', true),
    ];
    expect(computeContinuity(records)).toBe(5);
  });

  it('ignores a capacity tier even when one is smuggled onto the record', () => {
    // The WeeklyRecord type carries no tier field on purpose. If a caller ever
    // attaches one anyway, the count must not move.
    const plain = [week('2026-01-05', true), week('2026-01-12', true), week('2026-01-19', true)];
    // Assigned to a variable first, so this stays a structural WeeklyRecord[]
    // with an extra property rather than a cast that papers over a mismatch.
    const tiered = [
      { ...plain[0], capacity: 'slammed' },
      { ...plain[1], capacity: 'normal' },
      { ...plain[2], capacity: 'slammed' },
    ];
    expect(computeContinuity(tiered)).toBe(computeContinuity(plain));
    expect(computeContinuity(tiered)).toBe(3);
  });

  it('breaks only on a missed floor, regardless of the tiers around it', () => {
    const records = [
      week('2026-01-05', true), // slammed, floor met
      week('2026-01-12', false), // normal, floor missed - this is the only break
      week('2026-01-19', true), // slammed, floor met
      week('2026-01-26', true), // slammed, floor met
    ];
    expect(computeContinuity(records)).toBe(2);
  });
});
