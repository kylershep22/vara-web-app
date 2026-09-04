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
const mockGetUserPrivate = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
  getUserPrivate: (...a: any[]) => mockGetUserPrivate(...a),
}));
const mockGetLatestCycle = jest.fn();
const mockEnsureCycle = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  ensureCurrentWeeklyCycle: (...a: any[]) => mockEnsureCycle(...a),
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
  // The rolled cycle every rollover case lands on. Distinct id, so a test can
  // tell "the hook rolled over and reported the new week" apart from "the hook
  // reported the expired one it started with".
  const ROLLED = cycle({ id: 'cycle-rolled', weekStart: TODAY, weekEnd: day(6) });

  beforeEach(() => {
    mockGetFloor.mockReset().mockResolvedValue(FLOOR);
    mockGetUserPrivate.mockReset().mockResolvedValue({ weekStartDay: null });
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockEnsureCycle.mockReset().mockResolvedValue(ROLLED);
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
    test('one day past weekEnd rolls over and lands on Today', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-4), weekEnd: day(-1) }));
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
    });

    test('a 4-day stub that ended yesterday rolls over, rather than lingering to day 7', async () => {
      // THE STUB REGRESSION, at the hook. weekStart is 4 days back, so the
      // retired age < 7 predicate would still call this current and Home would
      // keep serving the finished week for three more days.
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-4), weekEnd: day(-1) }));
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
    });

    test('carries the ROLLED cycle, never the expired one it replaced', async () => {
      // Before rollover this asserted null, because an expired week meant the
      // user was being navigated away and a stale cycle held behind them was a
      // trap. There is nowhere to navigate to now: the hook makes the new week
      // and Home renders it, so the cycle it carries must be the new one. If
      // this ever reports the expired cycle, Home draws last week.
      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: day(-9), weekEnd: day(-3) }));
      const { result } = await resolve();

      expect(result.current.cycle?.id).toBe('cycle-rolled');
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

    test('rolls over once the week has expired', async () => {
      // The gap this slice fixed: closed the stub, and the next week is due.
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-5), weekEnd: day(-1), closeCompletedAt: {} as any })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
    });

    test('closed-ness changes nothing — inside the window or past it', async () => {
      // THE REGRESSION GUARD against re-adding a closed check to the rule.
      // Both rows are 'today' now, for two DIFFERENT reasons: the live week is
      // served directly, the expired one is rolled over first. That they agree
      // is the point being guarded, which is that closing is not expiry.
      const dates: Array<[string, string, 'today']> = [
        [day(-1), day(3), 'today'],
        [day(-5), day(-1), 'today'],
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

    test('no weekEnd rolls over and lands on Today on day seven', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ weekStart: day(-7), weekEnd: undefined })
      );
      const { result } = await resolve();

      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
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

      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
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
      expect(result.current.target).toBe('today');
      expect(mockEnsureCycle).toHaveBeenCalledTimes(1);

      mockGetLatestCycle.mockResolvedValue(cycle({ weekStart: TODAY, weekEnd: day(6) }));
      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => expect(result.current.target).toBe('today'));
    });
  });
});
