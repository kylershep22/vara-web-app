// useTodayCard — capacity is a DAILY read (roadmap 3b-i).
//
// WHAT MOVED. Capacity used to be locked for the week on the cycle
// (`capacityCurrent`, re-set by the in-week control that this slice retires).
// It is now an INPUT ON THE DAY'S LOG, and the cycle's `capacityInitial` is the
// day-1 SEED the day falls back to before anything has been picked.
//
// THE SEED IS WHAT MAKES THIS SLICE A NO-OP. `createWeeklyCycle` writes
// `capacityCurrent = capacityInitial`, so for every week where the retired
// control was never tapped the two are the same value and the derived protocol
// is bit-for-bit what it was before. The first two cases below are that proof.
//
// WHAT IS DELIBERATELY NOT HERE. The picker that WRITES a daily capacity, the
// time question, the sibling-variant matrix and the yesterday recall all belong
// to 3b-ii/3b-iii. This slice establishes the field, the seed and the read path
// and nothing else, which is why every case here either omits the daily value
// or hands it over directly.
//
// `capacityCurrent` IS IGNORED FROM NOW ON, and the last case pins that rather
// than leaving it to be inferred from the absence of a reference. The field
// stays on the document (createWeeklyCycle still seeds it) so nothing has to be
// migrated; what changed is that nothing reads it.

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
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTodayCard } from '../useTodayCard';
import { PROTOCOL_MATRIX } from '../../protocolEngine';
import type { DailyLog, WeeklyCycle } from '../../types/models';

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

/** Today's stored log, as getDailyLog returns it. */
const log = (over: Partial<DailyLog> = {}): DailyLog =>
  ({
    id: 'u1_2026-08-05',
    userId: 'u1',
    date: '2026-08-05',
    protocolCompleted: false,
    practiceIds: [],
    ...over,
  }) as DailyLog;

async function renderToday(c: WeeklyCycle = cycle()) {
  const view = renderHook(() => useTodayCard('u1', c));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useTodayCard — capacity read from the day, seeded from the week', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(2);
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
  });

  describe('the seed (no daily capacity picked yet)', () => {
    test('derives the protocol from capacityInitial when no log exists', async () => {
      // The no-op proof. Nothing has been picked today, so the day falls back
      // to the week's forecast and lands on exactly the protocol the weekly
      // lock produced before this slice.
      const { result } = await renderToday(cycle({ capacityInitial: 'limited' }));

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.limited[0].dailyAction
      );
      expect(result.current.protocol?.capacity).toBe('limited');
    });

    test('derives from capacityInitial when a log exists but carries no capacity', async () => {
      // Every row written before this field existed. Absent must read as
      // "not picked", never as a broken day.
      mockGetDailyLog.mockResolvedValue(log({ protocolCompleted: true }));
      const { result } = await renderToday(cycle({ capacityInitial: 'slammed' }));

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.slammed[0].dailyAction
      );
      expect(result.current.completed).toBe(true);
    });
  });

  describe("the day's own capacity", () => {
    test("a capacity stored on today's log wins over the week's seed", async () => {
      mockGetDailyLog.mockResolvedValue(log({ dailyCapacity: 'slammed' }));
      const { result } = await renderToday(cycle({ capacityInitial: 'normal' }));

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.slammed[0].dailyAction
      );
    });

    test('the floor is read when the DAY is slammed, on a week that is not', async () => {
      // The floor gate moved with the capacity. It answers to what the user is
      // living in today, which is the whole point of making the read daily.
      mockGetDailyLog.mockResolvedValue(log({ dailyCapacity: 'slammed' }));
      const { result } = await renderToday(cycle({ capacityInitial: 'normal' }));

      expect(mockGetFloor).toHaveBeenCalledWith('u1');
      expect(result.current.floorCommitment).toBe('ten minutes outside');
    });

    test('the floor is NOT read when the DAY is not slammed, on a week that is', async () => {
      // The inverse, and the one that proves the gate actually moved rather
      // than merely gaining a second source.
      mockGetDailyLog.mockResolvedValue(log({ dailyCapacity: 'normal' }));
      const { result } = await renderToday(cycle({ capacityInitial: 'slammed' }));

      expect(mockGetFloor).not.toHaveBeenCalled();
      expect(result.current.floorCommitment).toBeNull();
    });
  });

  describe('the frozen weekly field', () => {
    test('capacityCurrent is ignored, even when it disagrees with capacityInitial', async () => {
      // The two diverge only on a week where the RETIRED in-week control was
      // tapped. Those weeks resolve to the forecast from here on: the control
      // is gone, so nothing can create the divergence again, and the next
      // weekly open writes the two equal.
      const { result } = await renderToday(
        cycle({ capacityInitial: 'normal', capacityCurrent: 'slammed' })
      );

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.focus.normal[0].dailyAction
      );
    });
  });

  describe('completion', () => {
    test('marking the day done writes completion and NOTHING about capacity', async () => {
      // This case used to assert the opposite. markDone carried a capacity
      // seed-write while it was the only writer of the field; the daily picker
      // (3b-ii-b) made the pick always precede completion, so that write became
      // a second writer of one field and was removed. The picker's confirm is
      // now the sole writer, which useTodayCard.dailyPick.test.ts pins.
      const { result } = await renderToday(cycle({ capacityInitial: 'limited' }));

      act(() => result.current.markDone());

      await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
      expect(mockUpsertDailyLog.mock.calls[0][2]).toEqual({
        protocolCompleted: true,
        practiceIds: [],
      });
    });
  });
});
