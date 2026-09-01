// useTodayCard across the day boundary.
//
// THE BUG THIS FIXES IS PRE-EXISTING, and it predates the daily picker. The
// hook's effect depends on `[uid, cycleId, outcome, capacitySeed, isClosed]`,
// none of which change at midnight, and it reads `toIsoDate(new Date())` INSIDE
// the effect body. So an app left open past midnight kept reading yesterday's
// dailyLog: a day completed on Monday still showed "Done today" on Tuesday.
//
// It was invisible while the card only showed completion, because nobody leaves
// the app open overnight and looks. The daily picker makes it structural: the
// pre-pick prompt is supposed to return every morning, and it cannot if the day
// never rolls over.
//
// WHY TWO MECHANISMS. The date is state, re-synced by
//   1. an AppState 'active' listener  — the real overnight path, where the app
//      is backgrounded on Monday night and foregrounded on Tuesday with no
//      navigation and no re-render in between; and
//   2. a sync on every render          — which catches Home refocusing (the
//      landing hook's refresh re-renders but yields identical primitives, so
//      the effect below would not otherwise re-arm).
// Neither covers the other. The listener fires without a render; the render
// sync fires without a foreground.

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
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { cycleSource, phaseSource, useTodayCard } from '../useTodayCard';
import type { PhaseContext } from '../../journey/resolveJourney';
import type { DailyLog, WeeklyCycle } from '../../types/models';

const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';

const cycle = (): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: '2026-08-10',
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
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

/** Move the wall clock, in a way `new Date()` inside the hook will observe. */
function setToday(iso: string) {
  jest.setSystemTime(new Date(`${iso}T09:00:00.000Z`));
}

/**
 * Handlers the hook registered with AppState, newest last.
 *
 * Spied rather than asserted through the real module: the RN preset leaves
 * AppState.addEventListener a plain function, so there is no `.mock` to read
 * and no way to drive a foreground without one.
 */
let appStateHandlers: ((state: string) => void)[] = [];

/** Drive an app foreground, the way returning to Vara the next morning does. */
function foreground() {
  const handler = appStateHandlers[appStateHandlers.length - 1];
  expect(handler).toBeDefined();
  act(() => handler('active'));
}

describe('useTodayCard across the day boundary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setToday(MONDAY);
    appStateHandlers = [];
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event: any, handler: any) => {
        appStateHandlers.push(handler);
        return { remove: jest.fn() } as any;
      });
    mockCountForOutcome.mockReset().mockResolvedValue(2);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
    mockGetDailyLog.mockReset().mockImplementation(async (_uid: string, date: string) =>
      date === MONDAY ? log(MONDAY, { protocolCompleted: true }) : null
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('reads the log for today, not for whatever day the hook mounted on', async () => {
    const { result } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));

    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(mockGetDailyLog).toHaveBeenCalledWith('u1', MONDAY);
  });

  test('re-reads for the new date when the app is foregrounded the next morning', async () => {
    // The overnight path: backgrounded on Monday with the day complete,
    // foregrounded on Tuesday. Without the listener nothing re-renders, the
    // effect never re-arms, and Tuesday opens showing Monday's completion.
    const { result } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
    await waitFor(() => expect(result.current.completed).toBe(true));

    setToday(TUESDAY);
    foreground();

    await waitFor(() => expect(result.current.completed).toBe(false));
    expect(mockGetDailyLog).toHaveBeenCalledWith('u1', TUESDAY);
  });

  test('re-reads for the new date on a re-render, without any foreground event', async () => {
    // The other path: Home refocuses and the landing hook hands back a fresh
    // cycle object. Its primitives are identical, so the effect would not
    // re-arm on its own.
    const { result, rerender } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
    await waitFor(() => expect(result.current.completed).toBe(true));

    setToday(TUESDAY);
    rerender(undefined);

    await waitFor(() => expect(result.current.completed).toBe(false));
    expect(mockGetDailyLog).toHaveBeenCalledWith('u1', TUESDAY);
  });

  test('does NOT re-read when the date has not changed', async () => {
    // The guard that stops the render-time sync from refetching on every
    // render of Home. It must only fire when the calendar date actually moved.
    const { result, rerender } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
    await waitFor(() => expect(result.current.completed).toBe(true));
    const callsAfterLoad = mockGetDailyLog.mock.calls.length;

    rerender(undefined);
    rerender(undefined);

    expect(mockGetDailyLog.mock.calls.length).toBe(callsAfterLoad);
  });

  test('writes completion against the NEW date after a rollover', async () => {
    // The other half of the bug: markDone also read the clock inline, so a tap
    // on Tuesday could have written to Monday's row.
    const { result } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
    await waitFor(() => expect(result.current.completed).toBe(true));

    setToday(TUESDAY);
    foreground();
    await waitFor(() => expect(result.current.completed).toBe(false));

    act(() => result.current.markDone());

    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
    expect(mockUpsertDailyLog.mock.calls[0][1]).toBe(TUESDAY);
  });
});

/** The journey source (slice 2). */
const phase = (over: Partial<PhaseContext> = {}): PhaseContext => ({
  phaseKey: 'remove',
  destination: 'focus',
  capacitySeed: 'normal',
  revisionToken: 1,
  ...over,
});

describe('reload identity on the PhaseContext path (journey slice 2)', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
  });

  test('a NEW PhaseContext object with identical values does NOT refetch', async () => {
    // The journey path has the same problem the cycle path solved with
    // `cycle.id`: the landing hook rebuilds the object on every resolve, and
    // depending on the object would refetch the protocol on every Home focus.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase() } }
    );
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(1));

    rerender({ p: phase() });
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(1));
  });

  test('a BUMPED revisionToken DOES refetch', async () => {
    // The token is updatedAt millis, so it moves exactly when the journey
    // state changes. That is the one thing that has to re-arm the load.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ revisionToken: 2 }) });
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(2));
  });

  test('a phase ADVANCE refetches even if the token has not resolved yet', async () => {
    // A freshly written document reads back with an unresolved serverTimestamp,
    // so revisionToken can still be 0 while phaseKey has already moved. The key
    // carries both for exactly this window.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ phaseKey: 'remove', revisionToken: 0 }) } }
    );
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ phaseKey: 'recover', revisionToken: 0 }) });
    await waitFor(() => expect(mockCountForOutcome).toHaveBeenCalledTimes(2));
  });
});
