// useTodayCard — the dynamic in-week capacity re-set (spec 7), ported onto Home.
//
// Four properties, each of which is a decision rather than an implementation
// detail:
//
//   1. RE-ENTRANCY. A second tap inside the window between the write and the
//      reload would record a transition from a tier the user is no longer on.
//   2. THE RELOAD. Home's cycle is owned by useWeeklyLanding, so this hook
//      cannot patch it. It asks the caller to re-read, which is what re-derives
//      the protocol AND re-runs the conditional floor read.
//   3. reset_failed FIRES ON FAILURE, bucketed. The batch is atomic, so a
//      rejection means the downshiftEvents row was never written either, and
//      logger.error is __DEV__-gated: without this event the failure leaves no
//      trace on device.
//   4. NO SUCCESS EVENT. downshiftEvents already carries the from/to pair,
//      atomically with the tier change. A second non-atomic copy could disagree
//      with it. The absence is the design.

const mockCountForOutcome = jest.fn();
const mockGetDailyLog = jest.fn();
const mockUpsertDailyLog = jest.fn();
const mockResetCapacity = jest.fn();
const mockGetCyclesForUser = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
  getDailyLog: (...a: any[]) => mockGetDailyLog(...a),
  upsertDailyLog: (...a: any[]) => mockUpsertDailyLog(...a),
  resetWeeklyCapacity: (...a: any[]) => mockResetCapacity(...a),
  getWeeklyCyclesForUser: (...a: any[]) => mockGetCyclesForUser(...a),
}));
const mockGetFloor = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTodayCard } from '../useTodayCard';
import type { WeeklyCycle } from '../../types/models';

const cycle = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: '2026-08-03',
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
    ...over,
  }) as WeeklyCycle;

/** Renders the hook with a reload spy standing in for useWeeklyLanding.refresh. */
async function renderToday(c: WeeklyCycle = cycle()) {
  const reload = jest.fn();
  const view = renderHook(() => useTodayCard('u1', c, reload));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return { ...view, reload };
}

describe('useTodayCard capacity re-set', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetFloor.mockReset().mockResolvedValue(null);
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockResetCapacity.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
    mockLogEvent.mockReset();
  });

  describe('one tap, no confirmation (spec 7)', () => {
    test('a single call writes the transition the caller passed', async () => {
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(mockResetCapacity).toHaveBeenCalledTimes(1);
      expect(mockResetCapacity).toHaveBeenCalledWith('u1', 'cycle-1', 'normal', 'limited');
    });

    test('writes only the four arguments the service takes', async () => {
      // Re-set frequency is read off the downshiftEvents log the service
      // batches atomically, not off anything passed here.
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(mockResetCapacity.mock.calls[0]).toHaveLength(4);
    });
  });

  describe('the reload', () => {
    test('asks the caller to re-read the cycle after a successful write', async () => {
      const { result, reload } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(reload).toHaveBeenCalledTimes(1);
    });

    test('does not re-read after a failed write', async () => {
      // The batch is atomic, so a rejection means nothing landed and the tier
      // on screen is still the true one. There is nothing to re-read.
      mockResetCapacity.mockRejectedValue(new Error('permission denied'));
      const { result, reload } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('re-entrancy', () => {
    test('a second call while the first is in flight is dropped', async () => {
      let release: () => void = () => {};
      mockResetCapacity.mockImplementation(
        () => new Promise<void>((resolve) => (release = () => resolve()))
      );
      const { result } = await renderToday();

      let first: Promise<void>;
      act(() => {
        first = result.current.changeTier('normal', 'limited');
      });
      await waitFor(() => expect(result.current.resetting).toBe(true));
      await act(async () => {
        await result.current.changeTier('normal', 'slammed');
      });

      expect(mockResetCapacity).toHaveBeenCalledTimes(1);
      await act(async () => {
        release();
        await first!;
      });
    });

    test('the flag clears after the write settles, so a later tap works', async () => {
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });
      expect(result.current.resetting).toBe(false);

      await act(async () => {
        await result.current.changeTier('normal', 'slammed');
      });
      expect(mockResetCapacity).toHaveBeenCalledTimes(2);
    });

    test('the flag clears after a failure too', async () => {
      mockResetCapacity.mockRejectedValue(new Error('offline'));
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(result.current.resetting).toBe(false);
    });
  });

  describe('when the batch fails', () => {
    test('surfaces its own error rather than the whole-card failure', async () => {
      // A failed re-set is not a failed week: the cycle on screen is still
      // valid, so `failed` (which blanks Home's day action) must stay false.
      mockResetCapacity.mockRejectedValue(new Error('permission denied'));
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(result.current.resetFailed).toBe(true);
      expect(result.current.failed).toBe(false);
      expect(result.current.protocol).not.toBeNull();
    });

    test('a retry clears the error', async () => {
      mockResetCapacity.mockRejectedValueOnce(new Error('offline'));
      const { result } = await renderToday();
      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });
      expect(result.current.resetFailed).toBe(true);

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(result.current.resetFailed).toBe(false);
      expect(mockResetCapacity).toHaveBeenCalledTimes(2);
    });
  });

  describe('the reset_failed event', () => {
    test('a successful re-set logs NOTHING', async () => {
      // The deliberate absence. If this test ever needs changing, that is the
      // decision being reversed.
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('fires once on failure, carrying the transition the user tapped', async () => {
      mockResetCapacity.mockRejectedValue(
        Object.assign(new Error('nope'), { code: 'permission-denied' })
      );
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('reset_failed');
      expect(params).toEqual({
        fromCapacity: 'normal',
        toCapacity: 'limited',
        reason: 'permission-denied',
      });
    });

    test('an unrecognised failure is bucketed, never passed through', async () => {
      // 'offline' is 7 characters, so the writer's own length backstop would
      // keep it. Only the mapper stops it reaching the log verbatim.
      mockResetCapacity.mockRejectedValue(new Error('offline'));
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      const params = mockLogEvent.mock.calls[0][2];
      expect(params.reason).toBe('unknown');
      expect(JSON.stringify(params)).not.toContain('offline');
    });

    test('carries no field beyond the three declared', async () => {
      mockResetCapacity.mockRejectedValue(new Error('offline'));
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(Object.keys(mockLogEvent.mock.calls[0][2]).sort()).toEqual([
        'fromCapacity',
        'reason',
        'toCapacity',
      ]);
    });

    test('a throwing analytics call still surfaces the error to the user', async () => {
      mockResetCapacity.mockRejectedValue(new Error('offline'));
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const { result } = await renderToday();

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(result.current.resetFailed).toBe(true);
    });
  });

  describe('with no cycle there is nothing to re-set', () => {
    test('does not write', async () => {
      const { result } = renderHook(() => useTodayCard('u1', null, jest.fn()));

      await act(async () => {
        await result.current.changeTier('normal', 'limited');
      });

      expect(mockResetCapacity).not.toHaveBeenCalled();
    });
  });

  describe('the floor read the reload re-runs', () => {
    // The second load-bearing effect of the reload (WeeklyTodayScreen.tsx:194-198):
    // the floor card appears on crossing INTO slammed and goes away on leaving
    // it, because the read is conditional on the tier. On Home the reload is a
    // new cycle prop, so this is what proves the effect still keys on it.
    test('crossing into slammed reads the floor', async () => {
      mockGetFloor.mockResolvedValue('ten minutes outside');
      const { result, rerender } = renderHook(
        ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c, jest.fn()),
        { initialProps: { c: cycle({ capacityCurrent: 'limited' }) } }
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.floorCommitment).toBeNull();
      expect(mockGetFloor).not.toHaveBeenCalled();

      rerender({ c: cycle({ capacityCurrent: 'slammed' }) });

      await waitFor(() =>
        expect(result.current.floorCommitment).toBe('ten minutes outside')
      );
    });

    test('leaving slammed takes the floor away', async () => {
      mockGetFloor.mockResolvedValue('ten minutes outside');
      const { result, rerender } = renderHook(
        ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c, jest.fn()),
        { initialProps: { c: cycle({ capacityCurrent: 'slammed' }) } }
      );
      await waitFor(() =>
        expect(result.current.floorCommitment).toBe('ten minutes outside')
      );

      rerender({ c: cycle({ capacityCurrent: 'limited' }) });

      await waitFor(() => expect(result.current.floorCommitment).toBeNull());
      // Read once, on the slammed load, and not again.
      expect(mockGetFloor).toHaveBeenCalledTimes(1);
    });
  });
});
