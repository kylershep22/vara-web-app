// useTodayCard — the continuity count (spec 1), ported onto Home.
//
// What these protect is the THREE-STATE rule at its source. The hook has to
// distinguish "read said zero" from "read never landed", because the render
// treats them the same way (silence) and a hook that collapsed them to 0 would
// look identical on screen until the day someone decided to show a zero.
//
// Continuity is BEST EFFORT: it is below the fold, and a failure there may
// never take Home's day-action down with it.
//
// getWeeklyCyclesForUser is mocked rather than loadWeeklyContinuity, so the
// real sort + computeContinuity run inside these tests. Mocking the seam would
// leave the ordering bug that weeklyContinuity.ts warns about untested here.

const mockCountForOutcome = jest.fn();
const mockGetDailyLog = jest.fn();
const mockUpsertDailyLog = jest.fn();
const mockGetCyclesForUser = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
  getWeeklyCyclesForUser: (...a: any[]) => mockGetCyclesForUser(...a),
}));

jest.mock('../../services/firebase/dailyLog.service', () => {
  const actual = jest.requireActual('../../services/firebase/dailyLog.service');
  return {
    // The real predicate, so this suite cannot drift from the one definition.
    hasPickedToday: actual.hasPickedToday,
    getDailyLog: (...a: any[]) => mockGetDailyLog(...a),
    upsertDailyLog: (...a: any[]) => mockUpsertDailyLog(...a),
  };
});
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

/** A stored cycle as the continuity read returns it. */
const closed = (weekStart: string, floorMet?: boolean) =>
  cycle({
    id: `c-${weekStart}`,
    weekStart,
    ...(floorMet === undefined ? {} : { floorMet }),
  } as Partial<WeeklyCycle>);

const renderToday = (c: WeeklyCycle | null = cycle()) =>
  renderHook(() => useTodayCard('u1', c));

describe('useTodayCard continuity', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetFloor.mockReset().mockResolvedValue(null);
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
    mockLogEvent.mockReset();
  });

  test('reports the run of unbroken weeks as a count', async () => {
    mockGetCyclesForUser.mockResolvedValue([
      closed('2026-07-20', true),
      closed('2026-07-27', true),
      closed('2026-08-03', true),
    ]);
    const { result } = renderToday();

    await waitFor(() => expect(result.current.continuity).toBe(3));
  });

  test('counts only back to the break, not the whole history', async () => {
    mockGetCyclesForUser.mockResolvedValue([
      closed('2026-07-13', true),
      closed('2026-07-20', false),
      closed('2026-07-27', true),
      closed('2026-08-03', true),
    ]);
    const { result } = renderToday();

    await waitFor(() => expect(result.current.continuity).toBe(2));
  });

  test('counts correctly when the history arrives newest first', async () => {
    // The service promises no order. Without the ascending sort in the mapper
    // this history counts 1 instead of 3, and never throws while doing it.
    mockGetCyclesForUser.mockResolvedValue([
      closed('2026-08-03', true),
      closed('2026-07-27', true),
      closed('2026-07-20', true),
      closed('2026-07-13', false),
    ]);
    const { result } = renderToday();

    await waitFor(() => expect(result.current.continuity).toBe(3));
  });

  describe('zero and unknown are different facts', () => {
    test('reports 0 when no week has been closed', async () => {
      mockGetCyclesForUser.mockResolvedValue([closed('2026-08-03')]);
      const { result } = renderToday();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.continuity).toBe(0);
    });

    test('reports null, never 0, when the read failed', async () => {
      // Zero is a claim about the user. An unread history is not, and the
      // render has to be able to tell them apart even though it silences both.
      mockGetCyclesForUser.mockRejectedValue(new Error('offline'));
      const { result } = renderToday();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.continuity).toBeNull();
    });
  });

  describe('a continuity failure is not a Home failure', () => {
    test('the day action still resolves', async () => {
      mockGetCyclesForUser.mockRejectedValue(new Error('offline'));
      const { result } = renderToday();

      await waitFor(() => expect(result.current.protocol).not.toBeNull());
      expect(result.current.failed).toBe(false);
    });

    test('the completion CTA still works', async () => {
      // The primary CTA may never be blocked by a below-the-fold read.
      mockGetCyclesForUser.mockRejectedValue(new Error('offline'));
      const { result } = renderToday();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.markDone());

      await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    });
  });

  test('is null with no cycle, so Home shows nothing before a week is open', async () => {
    const { result } = renderToday(null);

    expect(result.current.continuity).toBeNull();
    expect(mockGetCyclesForUser).not.toHaveBeenCalled();
  });

  describe('refreshing after the weekly close', () => {
    // WHY THIS EXISTS. The close writes floorMet, which is the only input to
    // continuity, and it used to land the user on WeeklyTodayScreen — a fresh
    // MOUNT, so the count re-read for free. Home is already mounted when the
    // close returns to it, so nothing re-reads unless the effect is told to.
    //
    // A close changes neither the cycle id, the outcome, nor the capacity
    // tier, so the original dependency list could not see it happen.

    /** A distinct Timestamp-shaped object, as Firestore rebuilds per read. */
    const stamp = (seconds: number) => ({ seconds, nanoseconds: 0 });

    test('re-reads when the cycle goes from open to closed', async () => {
      mockGetCyclesForUser
        .mockResolvedValueOnce([closed('2026-08-03')])
        .mockResolvedValue([closed('2026-07-27', true), closed('2026-08-03', true)]);
      const { result, rerender } = renderHook(
        ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c),
        { initialProps: { c: cycle() } }
      );
      await waitFor(() => expect(result.current.continuity).toBe(0));

      rerender({ c: cycle({ closeCompletedAt: stamp(1) } as Partial<WeeklyCycle>) });

      await waitFor(() => expect(result.current.continuity).toBe(2));
    });

    test('does NOT re-read on a focus that changes nothing', async () => {
      // useWeeklyLanding hands back a NEW cycle object on every focus resolve.
      // Re-reading on object identity would refetch on every return to Home.
      const { result, rerender } = renderHook(
        ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c),
        { initialProps: { c: cycle() } }
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetCyclesForUser).toHaveBeenCalledTimes(1);

      rerender({ c: cycle() });
      rerender({ c: cycle() });

      expect(mockGetCyclesForUser).toHaveBeenCalledTimes(1);
    });

    test('does NOT re-read when an already-closed week is re-resolved', async () => {
      // THE TIMESTAMP TRAP. Firestore rebuilds closeCompletedAt as a fresh
      // object on every read, so a dependency on the Timestamp itself refetches
      // on every focus while looking correct in a test that reuses one object.
      // These two stamps are equal in meaning and distinct in identity.
      const { result, rerender } = renderHook(
        ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c),
        {
          initialProps: {
            c: cycle({ closeCompletedAt: stamp(1) } as Partial<WeeklyCycle>),
          },
        }
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetCyclesForUser).toHaveBeenCalledTimes(1);

      rerender({ c: cycle({ closeCompletedAt: stamp(1) } as Partial<WeeklyCycle>) });
      rerender({ c: cycle({ closeCompletedAt: stamp(2) } as Partial<WeeklyCycle>) });

      expect(mockGetCyclesForUser).toHaveBeenCalledTimes(1);
    });
  });

  test('re-reads when the capacity SEED changes', async () => {
    // Was "when the capacity tier changes, so a re-set reload refreshes it".
    // The re-set is retired (roadmap 3b-i) and `capacityCurrent` is frozen, so
    // the tier this pins is now `capacityInitial` — the seed the day falls back
    // to, and a live effect dependency because it is what the protocol derives
    // from when nothing has been picked. Dropping it from the dep array would
    // leave the day's action stale against the cycle on screen.
    mockGetCyclesForUser
      .mockResolvedValueOnce([closed('2026-08-03', true)])
      .mockResolvedValue([closed('2026-07-27', true), closed('2026-08-03', true)]);
    const { result, rerender } = renderHook(
      ({ c }: { c: WeeklyCycle }) => useTodayCard('u1', c),
      { initialProps: { c: cycle() } }
    );
    await waitFor(() => expect(result.current.continuity).toBe(1));

    rerender({ c: cycle({ capacityInitial: 'limited' }) });

    await waitFor(() => expect(result.current.continuity).toBe(2));
  });
});
