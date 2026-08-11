// useTodayCard — the daily pick (roadmap 3b-ii-b).
//
// What the hook owes the picker: whether today has been answered, what to
// pre-fill the sheet with, and a confirm that writes exactly once.
//
// CONFIRM WRITES, NOTHING ELSE DOES. The pre-fill is a READ of yesterday's row
// and must never write today's. `hasPickedToday` keys on the time field, so a
// write during load or on open would mark the day picked before the user
// answered anything, and the morning prompt would vanish on its own.

const mockCountForOutcome = jest.fn();
const mockGetDailyLog = jest.fn();
const mockUpsertDailyLog = jest.fn();
const mockGetCyclesForUser = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => {
  const actual = jest.requireActual('../../services/firebase/weeklyCycle.service');
  return {
    // The real predicate, so this suite cannot drift from the one definition.
    hasPickedToday: actual.hasPickedToday,
    countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
    getDailyLog: (...a: any[]) => mockGetDailyLog(...a),
    upsertDailyLog: (...a: any[]) => mockUpsertDailyLog(...a),
    getWeeklyCyclesForUser: (...a: any[]) => mockGetCyclesForUser(...a),
  };
});
const mockGetFloor = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTodayCard } from '../useTodayCard';
import { PROTOCOL_MATRIX } from '../../weeklyEngine';
import type { DailyLog, WeeklyCycle } from '../../types/models';

const TODAY = '2026-08-11';
const YESTERDAY = '2026-08-10';

const cycle = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: '2026-08-10',
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
    ...over,
  }) as WeeklyCycle;

const log = (date: string, over: Partial<DailyLog> = {}): DailyLog =>
  ({
    id: `u1_${date}`,
    userId: 'u1',
    date,
    protocolCompleted: false,
    practiceIds: [],
    ...over,
  }) as DailyLog;

/** Serve a specific row per date; anything unlisted is absent. */
function rows(byDate: Record<string, DailyLog>) {
  mockGetDailyLog.mockImplementation(async (_uid: string, date: string) =>
    byDate[date] ?? null
  );
}

async function renderToday(c: WeeklyCycle = cycle()) {
  const view = renderHook(() => useTodayCard('u1', c));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useTodayCard — the daily pick', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`${TODAY}T09:00:00.000Z`));
    mockCountForOutcome.mockReset().mockResolvedValue(2);
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
    mockGetDailyLog.mockReset();
    rows({});
  });

  afterEach(() => jest.useRealTimers());

  describe('has today been answered', () => {
    test('is not picked when there is no row for today', async () => {
      const { result } = await renderToday();
      expect(result.current.picked).toBe(false);
    });

    test('is NOT picked when today carries only a seeded capacity', async () => {
      // The 3b-i completion write stamps a capacity the user never chose. It
      // must not read as an answer.
      rows({ [TODAY]: log(TODAY, { protocolCompleted: true, dailyCapacity: 'normal' }) });
      const { result } = await renderToday();

      expect(result.current.picked).toBe(false);
    });

    test('is picked once today carries a time budget', async () => {
      rows({
        [TODAY]: log(TODAY, { dailyCapacity: 'slammed', dailyTimeBudget: 'short' }),
      });
      const { result } = await renderToday();

      expect(result.current.picked).toBe(true);
    });
  });

  describe('the pre-fill', () => {
    test("offers yesterday's answers", async () => {
      rows({
        [YESTERDAY]: log(YESTERDAY, {
          dailyCapacity: 'limited',
          dailyTimeBudget: 'long',
        }),
      });
      const { result } = await renderToday();

      expect(result.current.prefillCapacity).toBe('limited');
      expect(result.current.prefillTime).toBe('long');
    });

    test('falls back to the week seed on day one, with no prior row', async () => {
      const { result } = await renderToday(cycle({ capacityInitial: 'slammed' }));

      expect(result.current.prefillCapacity).toBe('slammed');
      expect(result.current.prefillTime).toBe('medium');
    });

    test('READS yesterday and never writes today', async () => {
      // The pre-fill is a read. A write here would set the time field and mark
      // the day picked before the user answered.
      rows({
        [YESTERDAY]: log(YESTERDAY, { dailyCapacity: 'limited', dailyTimeBudget: 'long' }),
      });
      const { result } = await renderToday();

      expect(mockGetDailyLog).toHaveBeenCalledWith('u1', YESTERDAY);
      expect(mockUpsertDailyLog).not.toHaveBeenCalled();
      expect(result.current.picked).toBe(false);
    });
  });

  describe('confirming', () => {
    test('writes capacity and time to today in a single upsert', async () => {
      const { result } = await renderToday();

      await act(async () => {
        await result.current.confirmPick('slammed', 'short');
      });

      expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1);
      expect(mockUpsertDailyLog.mock.calls[0][1]).toBe(TODAY);
      expect(mockUpsertDailyLog.mock.calls[0][2]).toEqual({
        dailyCapacity: 'slammed',
        dailyTimeBudget: 'short',
      });
    });

    test('does not touch completion, which is a separate answer', async () => {
      const { result } = await renderToday();

      await act(async () => {
        await result.current.confirmPick('normal', 'medium');
      });

      expect(mockUpsertDailyLog.mock.calls[0][2]).not.toHaveProperty('protocolCompleted');
    });

    test('re-derives the protocol from the confirmed capacity', async () => {
      const { result } = await renderToday(cycle({ capacityInitial: 'normal' }));
      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.normal[0].dailyAction
      );

      rows({
        [TODAY]: log(TODAY, { dailyCapacity: 'slammed', dailyTimeBudget: 'short' }),
      });
      await act(async () => {
        await result.current.confirmPick('slammed', 'short');
      });

      await waitFor(() =>
        expect(result.current.protocol?.dailyAction).toBe(
          PROTOCOL_MATRIX.focus.slammed[0].dailyAction
        )
      );
      expect(result.current.picked).toBe(true);
    });

    test('surfaces a failed write and leaves the day unpicked', async () => {
      mockUpsertDailyLog.mockRejectedValue(new Error('offline'));
      const { result } = await renderToday();

      await act(async () => {
        await result.current.confirmPick('normal', 'medium');
      });

      expect(result.current.pickFailed).toBe(true);
      expect(result.current.picked).toBe(false);
    });
  });

  describe('the time budget is stored but inert this slice', () => {
    test('a short time does NOT shrink the served protocol', async () => {
      // PATH C, pinned. Every cell holds one variant, so the answer to the time
      // question cannot change what is served until the off-diagonal content
      // exists. This asserts the honest current behaviour rather than hiding
      // it: capacity drives the result, time rides along.
      rows({
        [TODAY]: log(TODAY, { dailyCapacity: 'normal', dailyTimeBudget: 'short' }),
      });
      const { result } = await renderToday();

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.normal[0].dailyAction
      );
      expect(result.current.protocol?.estMinutes).toBe(30);
    });

    test('capacity alone decides, whatever the time answer is', async () => {
      for (const time of ['short', 'medium', 'long'] as const) {
        rows({
          [TODAY]: log(TODAY, { dailyCapacity: 'limited', dailyTimeBudget: time }),
        });
        const { result } = await renderToday();

        expect(result.current.protocol?.dailyAction).toBe(
          PROTOCOL_MATRIX.focus.limited[0].dailyAction
        );
      }
    });
  });

  describe('completion no longer writes capacity', () => {
    test('markDone writes only completion, leaving one writer of the tier', async () => {
      // The pick always precedes completion now (the CTA does not exist until
      // the day is picked), so the seed-write markDone used to carry is
      // redundant. Two writers of one field is how they disagree.
      rows({
        [TODAY]: log(TODAY, { dailyCapacity: 'slammed', dailyTimeBudget: 'short' }),
      });
      const { result } = await renderToday();

      act(() => result.current.markDone());

      await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
      const written = mockUpsertDailyLog.mock.calls[0][2];
      expect(written).toEqual({ protocolCompleted: true, practiceIds: [] });
      expect(written).not.toHaveProperty('dailyCapacity');
    });
  });
});
