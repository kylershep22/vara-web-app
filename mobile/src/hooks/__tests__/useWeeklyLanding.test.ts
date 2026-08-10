// useWeeklyLanding — the weekly entry guard as HOME actually resolves it.
//
// WHY THIS FILE EXISTS. WeeklyEntryScreen has had a test since the guard
// shipped, but Home does not go through that screen: it is a tab and cannot be
// `replace`d into, so it resolves the same rule through this hook instead. The
// hook was the untested half of a two-producer rule, and it is the half every
// user hits. The boundary rework touches exactly this seam.
//
// resolveWeeklyEntry is NOT mocked. The rule is pure and has its own unit test;
// what these cover is the wiring — that the hook hands it the cycle's stored
// boundary and closed-ness rather than dropping either on the floor, which is
// the failure a mocked rule would hide completely.
//
// Fixtures are built RELATIVE TO TODAY through the same date helpers the hook
// uses, because the hook reads the real clock. Hardcoded ISO dates would pass
// today and rot tomorrow.

const mockGetFloor = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
const mockGetLatestCycle = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useWeeklyLanding } from '../useWeeklyLanding';
import { addDaysIso, toIsoDate } from '../../utils/weekStart';
import type { WeeklyCycle } from '../../types/models';

const FLOOR = 'ten minutes outside';
const TODAY = toIsoDate(new Date());
/** Days from today, as an ISO date. Negative is the past. */
const day = (offset: number) => addDaysIso(TODAY, offset);

const cycle = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: TODAY,
    weekEnd: day(6),
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
    ...over,
  }) as WeeklyCycle;

const landing = () => renderHook(() => useWeeklyLanding('u1'));

/** Render and wait for the two reads to settle. */
async function resolve() {
  const view = landing();
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useWeeklyLanding', () => {
  beforeEach(() => {
    mockGetFloor.mockReset().mockResolvedValue(FLOOR);
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
  });

  describe('a live week', () => {
    test('today inside the stored boundary lands on Today', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-2), weekEnd: day(1) }));
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
    });

    test('the last day of the week is still Today', async () => {
      // weekEnd is inclusive. Off-by-one here would end every user's week a day
      // early, which is the kind of thing nobody notices until it is shipped.
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-3), weekEnd: TODAY }));
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
    });

    test('carries the cycle through, so Home can render the day from it', async () => {
      const live = cycle({ id: 'live-1', weekStart: day(-1), weekEnd: day(2) });
      mockGetLatestCycle.mockResolvedValue(live);
      const { result } = await resolve();

      expect(result.current.cycle?.id).toBe('live-1');
    });
  });

  describe('a week that has ended', () => {
    test('one day past weekEnd opens a fresh week', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-4), weekEnd: day(-1) }));
      const { result } = await resolve();

      expect(result.current.target).toBe('open');
    });

    test('a 4-day stub that ended yesterday opens, rather than lingering to day 7', async () => {
      // THE STUB REGRESSION, at the hook. weekStart is 4 days back, so the
      // retired age < 7 predicate would still call this current and Home would
      // keep serving the finished week for three more days.
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-4), weekEnd: day(-1) }));
      const { result } = await resolve();

      expect(result.current.target).toBe('open');
    });

    test('does not carry a cycle the user is being sent away from', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-9), weekEnd: day(-3) }));
      const { result } = await resolve();

      expect(result.current.cycle).toBeNull();
    });
  });

  describe('a closed week — EXPIRY routes, closing does not', () => {
    test('stays on Today while inside the boundary, so the acknowledgment shows', async () => {
      // Home renders the "week is closed" acknowledgment under 'today'. If this
      // resolved 'open' the acknowledgment would be unreachable and Home's
      // focus latch would push the weekly open the moment the close landed.
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-1), weekEnd: day(3), closeCompletedAt: {} as any })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
    });

    test('carries the closed cycle through, so Home can draw the acknowledgment', async () => {
      // Not just the target: Home reads closeCompletedAt off this cycle. A
      // 'today' answer with a null cycle would render nothing at all.
      mockGetLatestCycle.mockResolvedValue(
        cycle({ id: 'closed-1', weekEnd: day(3), closeCompletedAt: {} as any })
      );
      const { result } = await resolve();

      expect(result.current.cycle?.id).toBe('closed-1');
      expect(result.current.cycle?.closeCompletedAt).toBeTruthy();
    });

    test('opens once the week has expired', async () => {
      // The gap this slice fixed: closed the stub, and the next week is due.
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-5), weekEnd: day(-1), closeCompletedAt: {} as any })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('open');
    });

    test('closed-ness changes nothing — inside the window or past it', async () => {
      // THE REGRESSION GUARD against re-adding a closed check to the rule.
      const dates: Array<[string, string, 'today' | 'open']> = [
        [day(-1), day(3), 'today'],
        [day(-5), day(-1), 'open'],
      ];

      for (const [weekStart, weekEnd, expected] of dates) {
        mockGetLatestCycle.mockResolvedValue(
          cycle({ weekStart, weekEnd, closeCompletedAt: {} as any })
        );
        const closedRun = await resolve();
        expect(closedRun.result.current.target).toBe(expected);

        mockGetLatestCycle.mockResolvedValue(cycle({ weekStart, weekEnd }));
        const openRun = await resolve();
        expect(openRun.result.current.target).toBe(expected);
      }
    });
  });

  describe('legacy cycles, written before boundaries were stored', () => {
    test('no weekEnd falls back to weekStart + 6 and is current on day six', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-6), weekEnd: undefined })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
    });

    test('no weekEnd opens a fresh week on day seven', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-7), weekEnd: undefined })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('open');
    });
  });

  describe('the floor short-circuit', () => {
    test('no floor commitment routes to capture', async () => {
      mockGetFloor.mockResolvedValue(null);
      const { result } = await resolve();

      expect(result.current.target).toBe('floor');
    });

    test('the cycle read is skipped entirely when there is no floor', async () => {
      mockGetFloor.mockResolvedValue(null);
      await resolve();

      expect(mockGetLatestCycle).not.toHaveBeenCalled();
    });
  });

  describe('a user with no cycle at all', () => {
    test('opens their first week', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      const { result } = await resolve();

      expect(result.current.target).toBe('open');
    });
  });

  describe('a failed read', () => {
    test('reports failure and refuses to guess a target', async () => {
      // Routing to the open on an unknown state would let the user open a
      // second cycle for a week they already have.
      mockGetLatestCycle.mockRejectedValue(new Error('offline'));
      const { result } = await resolve();

      expect(result.current.failed).toBe(true);
      expect(result.current.target).toBeNull();
    });
  });

  describe('refresh', () => {
    test('re-reads, so returning from the open reflects the week just started', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      const { result } = await resolve();
      expect(result.current.target).toBe('open');

      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: TODAY, weekEnd: day(6) }));
      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => expect(result.current.target).toBe('today'));
    });
  });
});
