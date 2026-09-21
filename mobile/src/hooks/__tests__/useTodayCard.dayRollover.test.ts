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
const mockGetLogsSince = jest.fn();
const mockUpsertDailyLog = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
  getWeeklyCyclesForUser: jest.fn(),
}));

jest.mock('../../services/firebase/dailyLog.service', () => {
  const actual = jest.requireActual('../../services/firebase/dailyLog.service');
  return {
    // The real predicate, so this suite cannot drift from the one definition.
    hasPickedToday: actual.hasPickedToday,
    getDailyLog: (...a: any[]) => mockGetDailyLog(...a),
    getDailyLogsSince: (...a: any[]) => mockGetLogsSince(...a),
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
import {
  dailyLog,
  pickedNotCompleted,
} from '../../services/firebase/__tests__/dailyLogFixtures';

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

/** A two-line alias over the shared fixture (slice 9.1a). */
const log = (date: string, over: Partial<DailyLog> = {}): DailyLog =>
  dailyLog(date, over);

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
    mockGetLogsSince.mockReset().mockResolvedValue([]);
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

  /**
   * THE WINDOW BETWEEN THE DATE MOVING AND THE NEW DAY'S LOAD COMMITTING.
   *
   * The test above asserts the SETTLED contract and deliberately steps past
   * this window: its `waitFor(completed === false)` waits for the new day's
   * load to commit before it taps. These cases tap INSIDE it.
   *
   * WHY IT EXISTS. The load effect sets `loading` and then awaits; it does not
   * synchronously clear `protocol`, `picked` or `completed`. `markDone` depends
   * on `todayIso` AND on the protocol's identity primitives, so at the render
   * where the date moves the callback is rebuilt with the NEW date while
   * `protocol` still holds the PREVIOUS day's variant. A tap there wrote
   * `dailyLogs/{today}` stamped with yesterday's identity - and because the new
   * day's row does not exist yet, all three of `stampProvenance`'s clauses pass
   * and the service records it as a well-formed, established completion.
   *
   * HELD OPEN RATHER THAN RACED. `getDailyLog` for the new day returns a
   * promise this suite resolves by hand, so the window is deterministic instead
   * of depending on how fast a mock settles.
   *
   * THESE CALL `markDone()` DIRECTLY RATHER THAN PRESSING A RENDERED CONTROL,
   * so per CLAUDE.md's third evidence rule they prove the guard is sensitive to
   * the logic and NOT that the guard is reachable through the UI. The window is
   * not reproducible by hand - it needs the calendar date to move under a
   * running app - so the render-time half stays unverified on device. All five
   * `DashboardScreen` suites mock `useTodayCard` wholesale, so the press path is
   * unexercised either way; that is a standing gap, not one this slice created.
   */
  describe('the completion window during a rollover reload', () => {
    /** Resolves the new day's read, releasing the load the test is holding. */
    let releaseTuesday: (value: DailyLog | null) => void;

    beforeEach(() => {
      const tuesdayRead = new Promise<DailyLog | null>((resolve) => {
        releaseTuesday = resolve;
      });

      // MONDAY IS PICKED AND NOT COMPLETED, which the outer fixture is not.
      // `markDone` returns early on `completed`, so a stale-true `completed`
      // refuses the write before the defect can occur: a red test built on the
      // outer fixture cannot go red at all.
      //
      // MONDAY IS ALSO SLAMMED, so the two days resolve DIFFERENT variants -
      // Tuesday has no row and falls back to the cycle's `normal` seed. Without
      // that difference the stale write would carry the right identity by
      // coincidence and the assertion would prove nothing.
      mockGetDailyLog
        .mockReset()
        .mockImplementation(async (_uid: string, date: string) => {
          if (date === MONDAY) {
            return pickedNotCompleted(MONDAY, { dailyCapacity: 'slammed' });
          }
          if (date === TUESDAY) return tuesdayRead;
          return null;
        });
    });

    afterEach(() => {
      // Release whatever the test left held, so a pending promise cannot leak
      // into the next case.
      releaseTuesday?.(null);
    });

    /** Mount on Monday, move to Tuesday, and stop with the new read in flight. */
    async function openTheWindow() {
      const view = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
      await waitFor(() => expect(view.result.current.picked).toBe(true));
      expect(view.result.current.protocol?.id).toBe('refocus-slammed');
      expect(view.result.current.completed).toBe(false);

      setToday(TUESDAY);
      foreground();

      // The window, stated as the assertions that define it: the date has
      // moved, and the previous day's variant is still what the card holds.
      await waitFor(() => expect(view.result.current.todayIso).toBe(TUESDAY));
      expect(view.result.current.protocol?.id).toBe('refocus-slammed');
      expect(view.result.current.picked).toBe(true);

      return view;
    }

    test('a tap inside the window writes NOTHING', async () => {
      // THE RED TEST. Before the fix this fails, and its failure output is the
      // defect reproduced: one call, to TUESDAY's row, carrying Monday's
      // `refocus-slammed`.
      const { result } = await openTheWindow();

      act(() => result.current.markDone());

      expect(mockUpsertDailyLog).not.toHaveBeenCalled();
    });

    test('no completion state is shown for a day nothing is known about', async () => {
      // The other half of the guarantee. `completed` is the PREVIOUS day's
      // answer until the new load commits, so a card that trusted it would show
      // a check and an acknowledgment for a day nobody completed.
      const { result } = await openTheWindow();

      expect(result.current.staleDate).toBe(true);
    });

    test('the tap lands normally once the new day has loaded', async () => {
      // THE OVER-TIGHT-GUARD CASE. A guard that refused after the load settled
      // would break completion entirely and every case above would still pass.
      const { result } = await openTheWindow();

      await act(async () => {
        releaseTuesday(null);
      });
      await waitFor(() => expect(result.current.protocol?.id).toBe('refocus-normal'));
      expect(result.current.staleDate).toBe(false);

      act(() => result.current.markDone());

      await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
      expect(mockUpsertDailyLog.mock.calls[0][1]).toBe(TUESDAY);
      expect(mockUpsertDailyLog.mock.calls[0][2]).toMatchObject({
        protocolCellId: 'refocus-normal',
      });
    });

    test('a load that resolves after the date moved stamps the day it SERVED', async () => {
      // THE STAMP MUST CARRY THE DATE ITS CLOSURE CAPTURED, not the live clock.
      // The two are identical whenever a load commits on the day it started,
      // which is every other case in this file - so without this test the stamp
      // could read `toIsoDate(new Date())` and nothing would notice.
      //
      // Here the previous day's read is still in flight when the date moves, so
      // it commits a protocol that was resolved for a day that has ended. The
      // captured date makes that visible and the write refuses; the live clock
      // would label it as today's and let the stale variant through.
      //
      // THIS IS NOT A FIX FOR THE SUPERSEDED-LOAD DEFECT and must not be read
      // as one. `activeRef` is a single shared boolean, so the stale load still
      // COMMITS - the card goes on showing the previous day's action until
      // something else re-arms the effect. Only the WRITE is refused. The cause
      // is tracked separately and is deliberately untouched here.
      let releaseMonday: (value: DailyLog | null) => void = () => {};
      const mondayRead = new Promise<DailyLog | null>((resolve) => {
        releaseMonday = resolve;
      });
      mockGetDailyLog
        .mockReset()
        .mockImplementation(async (_uid: string, date: string) =>
          date === MONDAY ? mondayRead : new Promise<DailyLog | null>(() => {})
        );

      const { result } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
      expect(result.current.protocol).toBeNull();

      // The day turns while Monday's read is still outstanding.
      setToday(TUESDAY);
      foreground();
      await waitFor(() => expect(result.current.todayIso).toBe(TUESDAY));

      // Monday's load now resolves and commits, carrying Monday's variant.
      await act(async () => {
        releaseMonday(pickedNotCompleted(MONDAY, { dailyCapacity: 'slammed' }));
      });
      await waitFor(() => expect(result.current.protocol?.id).toBe('refocus-slammed'));

      expect(result.current.staleDate).toBe(true);

      act(() => result.current.markDone());

      expect(mockUpsertDailyLog).not.toHaveBeenCalled();
    });

    test('a day already complete when the date moves still refuses', async () => {
      // The branch that was ALREADY safe, via `markDone`'s `completed` guard.
      // Pinned so the new guard cannot be credited with it, and so a later
      // refactor of either guard cannot silently drop the other.
      mockGetDailyLog
        .mockReset()
        .mockImplementation(async (_uid: string, date: string) =>
          date === MONDAY
            ? log(MONDAY, {
                dailyCapacity: 'slammed',
                dailyTimeBudget: 'short',
                protocolCompleted: true,
              })
            : new Promise<DailyLog | null>(() => {})
        );

      const { result } = renderHook(() => useTodayCard('u1', cycleSource(cycle())));
      await waitFor(() => expect(result.current.completed).toBe(true));

      setToday(TUESDAY);
      foreground();
      await waitFor(() => expect(result.current.todayIso).toBe(TUESDAY));

      act(() => result.current.markDone());

      expect(mockUpsertDailyLog).not.toHaveBeenCalled();
    });
  });
});

/** The journey source (slice 2). */
const phase = (over: Partial<PhaseContext> = {}): PhaseContext => ({
  phaseKey: 'remove',
  destination: 'focus',
  capacitySeed: 'normal',
  revisionToken: 1,
  // Slice 3c-i. Empty enteredAtIso suppresses the consistency read, which is
  // what keeps these suites asserting the day's load and nothing else.
  enteredAtIso: '',
  hasRemoveCapture: false,
  // Slice 7a. Cleared values: this factory builds a phase nobody has been
  // offered anything in, which is what every test in this file assumes.
  advanceDeclined: false,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  adjustArmedFromIso: null,
  // Slice 7c. No recorded adjustment is the default state of every fixture
  // here; the cases that need one set it.
  adjustChoice: null,
  adjustDeclines: 0,
  adjustOffered: false,
  ...over,
});

describe('reload identity on the PhaseContext path (journey slice 2)', () => {
  // THE RELOAD PROBE IS THE CONSISTENCY READ as of slice 6. It has been three
  // things: the week-number query in slice 2 (retired with applyQuickWin in
  // 3a), then the continuity read (retired with the count in slice 6), now
  // `getDailyLogsSince`.
  //
  // IT IS THE RIGHT ONE FOR THIS BLOCK SPECIFICALLY. It runs once per effect
  // run and ONLY on the PhaseContext path, because it is gated on
  // `enteredAtIso`, which the legacy cycle path never supplies. This describe
  // block is the PhaseContext path, so the probe cannot be satisfied by a
  // legacy read wandering in.
  //
  // NOT `getDailyLog`: that fires TWICE per load on an unpicked day (today,
  // then yesterday for the sheet pre-fill), so counting it would read every
  // single load as two. NOT `getFloorCommitment` either: it is conditional on
  // a 'slammed' day, so it would be absent for most fixtures and the counts
  // would be zero rather than wrong, which is the failure mode that looks
  // like a passing test.
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  /**
   * The shared fixture WITH a phase-entry date, which is what arms the probe.
   *
   * `phase()` deliberately leaves `enteredAtIso` empty so the other suites in
   * this file assert the day's load and nothing else. This block needs the
   * consistency read to actually fire, so it supplies one. It is CONSTANT
   * across every rerender below, so it can never be the thing causing a
   * refetch: the token and the phase key are.
   */
  const journeyPhase = (over: Partial<PhaseContext> = {}): PhaseContext =>
    phase({ enteredAtIso: MONDAY, ...over });

  test('a NEW PhaseContext object with identical values does NOT refetch', async () => {
    // The journey path has the same problem the cycle path solved with
    // `cycle.id`: the landing hook rebuilds the object on every resolve, and
    // depending on the object would refetch the protocol on every Home focus.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: journeyPhase() } }
    );
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));

    rerender({ p: journeyPhase() });
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));
  });

  test('a BUMPED revisionToken DOES refetch', async () => {
    // The token is updatedAt millis, so it moves exactly when the journey
    // state changes. That is the one thing that has to re-arm the load.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: journeyPhase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));

    rerender({ p: journeyPhase({ revisionToken: 2 }) });
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(2));
  });

  test('a phase ADVANCE refetches even if the token has not resolved yet', async () => {
    // A freshly written document reads back with an unresolved serverTimestamp,
    // so revisionToken can still be 0 while phaseKey has already moved. The key
    // carries both for exactly this window.
    const { rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: journeyPhase({ phaseKey: 'remove', revisionToken: 0 }) } }
    );
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));

    rerender({ p: journeyPhase({ phaseKey: 'recover', revisionToken: 0 }) });
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(2));
  });

  test('a SAME-DAY revision does not block completion', async () => {
    // THE CASE THE ROLLOVER GUARD MUST NOT CATCH, and the reason the stamp
    // carries the DATE and nothing else.
    //
    // A revisionToken bump re-arms the load and puts the card through the same
    // window a rollover does: `protocol` is the previous resolution until the
    // new one commits. But the DATE has not moved, so `loadedForIso` still
    // equals `todayIso` and `staleDate` stays false throughout. The user
    // completes the protocol they actually read, which is 9.1a's recorded
    // intent - record what the card rendered, never what is true at the tap.
    //
    // A guard that compared protocol IDENTITY instead of the date would refuse
    // here, and this test is what would catch that being added.
    const held = new Promise<never[]>(() => {});
    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: journeyPhase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(result.current.protocol).not.toBeNull());
    expect(result.current.staleDate).toBe(false);

    // Bump the token and hold the re-resolve open, so the assertion below is
    // made INSIDE the reload rather than after it has settled.
    mockGetLogsSince.mockReturnValueOnce(held);
    rerender({ p: journeyPhase({ revisionToken: 2 }) });
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(2));

    expect(result.current.staleDate).toBe(false);

    act(() => result.current.markDone());

    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
  });
});
