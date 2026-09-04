import { resolveWeeklyEntry, type WeeklyEntryCycle } from '../weeklyEntry';

// 2026-08-12 is a WEDNESDAY; 2026-08-16 is the Sunday after it. The stub
// scenario throughout: setup Wednesday with a chosen Sunday start day, so
// cycle 1 covers Wed-Sat and the first full week begins Sunday.
const WED = '2026-08-12';
const THU = '2026-08-13';
const FRI = '2026-08-14';
const SAT = '2026-08-15';
const SUN = '2026-08-16';
const MON = '2026-08-17';
const TUE = '2026-08-18';

const TODAY = WED;
const floorCommitment = 'ten minutes outside';

/** A live, unclosed cycle with an explicit boundary. */
function cycle(overrides: Partial<WeeklyEntryCycle> = {}): WeeklyEntryCycle {
  return { weekStart: WED, weekEnd: SAT, closed: false, ...overrides };
}

describe('resolveWeeklyEntry', () => {
  describe('the floor guard (the null-guard branch)', () => {
    test('no floor commitment sends the user to capture, even with a live cycle', () => {
      // The floor is captured while the user is calm (spec 10.1). It comes
      // before the weekly open regardless of what else is already true.
      expect(
        resolveWeeklyEntry({
          floorCommitment: null,
          latestCycle: cycle(),
          todayIso: TODAY,
        })
      ).toBe('floor');
    });

    test('no floor and no cycle also sends the user to capture', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment: null,
          latestCycle: null,
          todayIso: TODAY,
        })
      ).toBe('floor');
    });

    test('an empty-string floor counts as missing, not as captured', () => {
      // getFloorCommitment already collapses whitespace-only values to null;
      // this asserts the rule does not treat a falsy string as a commitment
      // if one ever reaches it another way.
      expect(
        resolveWeeklyEntry({
          floorCommitment: '',
          latestCycle: null,
          todayIso: TODAY,
        })
      ).toBe('floor');
    });
  });

  describe('with a floor captured', () => {
    test('no cycle at all rolls a week over', () => {
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycle: null, todayIso: TODAY })
      ).toBe('rollover');
    });

    test('a cycle opened today lands on Today', () => {
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycle: cycle(), todayIso: TODAY })
      ).toBe('today');
    });

    test('the last day of the week still lands on Today', () => {
      // weekEnd is inclusive: it is the final day the cycle is live.
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycle: cycle(), todayIso: SAT })
      ).toBe('today');
    });

    test('a long-abandoned cycle rolls a fresh week over', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ weekStart: '2026-01-05', weekEnd: '2026-01-11' }),
          todayIso: TODAY,
        })
      ).toBe('rollover');
    });
  });

  describe('the 4-day stub, day by day — the transition Step-0 called the crux', () => {
    // Under the retired age < 7 predicate, Sunday, Monday and Tuesday all read
    // as still-current and the user could not open their first full week until
    // the following Wednesday. These are the cases that regression-test it.
    test.each([WED, THU, FRI, SAT])('%s stays on Today, inside the stub', (day) => {
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycle: cycle(), todayIso: day })
      ).toBe('today');
    });

    test.each([SUN, MON, TUE])(
      '%s rolls into the first full week — the stub is over',
      (day) => {
        expect(
          resolveWeeklyEntry({ floorCommitment, latestCycle: cycle(), todayIso: day })
        ).toBe('rollover');
      }
    );
  });

  describe('a closed week — EXPIRY routes, closing does not', () => {
    test('a closed cycle still inside its window stays on Today', () => {
      // Closing is a completed, acknowledged state, not a shove into next
      // week. Home renders the "week is closed" acknowledgment under 'today';
      // routing to 'open' here would make that unreachable AND trip Home's
      // focus latch into pushing the open flow the instant the user closed.
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: true }),
          todayIso: WED,
        })
      ).toBe('today');
    });

    test('a closed cycle stays on Today on its own last day', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: true }),
          todayIso: SAT,
        })
      ).toBe('today');
    });

    test('a closed cycle opens once the week has expired', () => {
      // THE GAP THIS SLICE FIXED: closed the stub on Saturday, and Sunday is
      // the day the first full week is due to begin.
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: true }),
          todayIso: SUN,
        })
      ).toBe('rollover');
    });

    test('an unclosed cycle opens once the week has expired, the same way', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: false }),
          todayIso: SUN,
        })
      ).toBe('rollover');
    });

    test.each([WED, THU, FRI, SAT])(
      'inside the window (%s) the answer is the same closed or not',
      (day) => {
        // THE REGRESSION GUARD against re-adding `if (closed) return "open"`.
        // Closed-ness is deliberately not consulted: expiry is the only thing
        // that routes a user out of their week.
        const closed = resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: true }),
          todayIso: day,
        });
        const open = resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: false }),
          todayIso: day,
        });
        expect(closed).toBe(open);
        expect(closed).toBe('today');
      }
    );

    test.each([SUN, MON, TUE])(
      'past the window (%s) the answer is the same closed or not',
      (day) => {
        const closed = resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: true }),
          todayIso: day,
        });
        const open = resolveWeeklyEntry({
          floorCommitment,
          latestCycle: cycle({ closed: false }),
          todayIso: day,
        });
        expect(closed).toBe(open);
        expect(closed).toBe('rollover');
      }
    );
  });

  describe('legacy cycles written before boundaries were stored', () => {
    test('a cycle with no weekEnd falls back to weekStart + 6', () => {
      // Day six of the fallback window: current, exactly as it was before.
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: { weekStart: '2026-08-03', weekEnd: undefined, closed: false },
          todayIso: '2026-08-09',
        })
      ).toBe('today');
    });

    test('a legacy cycle seven days old rolls a fresh week over', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: { weekStart: '2026-08-03', weekEnd: undefined, closed: false },
          todayIso: '2026-08-10',
        })
      ).toBe('rollover');
    });

    test('a closed legacy cycle inside its fallback window stays on Today', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: { weekStart: '2026-08-03', weekEnd: undefined, closed: true },
          todayIso: '2026-08-04',
        })
      ).toBe('today');
    });

    test('a closed legacy cycle opens once the fallback window has passed', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycle: { weekStart: '2026-08-03', weekEnd: undefined, closed: true },
          todayIso: '2026-08-10',
        })
      ).toBe('rollover');
    });
  });

  test('a future boundary counts as live, preserving the clock-skew guard', () => {
    // Only reachable through clock or timezone skew, or through the
    // forward-dated week an early close produces. Treating it as stale would
    // open a second cycle for a week the user already has.
    expect(
      resolveWeeklyEntry({
        floorCommitment,
        latestCycle: cycle({ weekStart: SUN, weekEnd: '2026-08-22' }),
        todayIso: WED,
      })
    ).toBe('today');
  });
});
