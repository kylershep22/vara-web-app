// usePinnedProtocol: AN OPEN SHEET IS AN IMMUTABLE PROTOCOL SNAPSHOT, NOT A
// LIVE RENDERING OF THE TODAY CARD (slice 9.1b, Kyle's ruling).
//
// WHY THIS SUITE EXISTS WHEN useTodayCard's TWO FLAG SUITES ALREADY DO. Both of
// those tap INSIDE the window, between something moving and the reload
// committing, and both deliberately pin the SETTLED contract after it: once the
// reload lands, `markDone` writes the live date and the live variant
// (dayRollover.test.ts "writes completion against the NEW date", variantStale
// .test.ts "once the new variant commits"). That is right for the card. For a
// sheet that pinned what it showed, it is the silent substitution. So the
// cases that matter here tap AFTER the reload commits, and they run against
// the REAL useTodayCard, so the flags rise and fall on their real lifecycle
// rather than on a fixture's say-so.
//
// THE OPERATION IS CALLED DIRECTLY, not through a rendered press. The sheet's
// UI half is covered by ProtocolSheet.test.tsx and the DashboardScreen suite;
// whether a real tap reaches either is a device-walk question.

const mockGetDailyLog = jest.fn();
const mockGetLogsSince = jest.fn();
const mockUpsertDailyLog = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  countWeeklyCyclesForOutcome: jest.fn().mockResolvedValue(1),
  getWeeklyCyclesForUser: jest.fn(),
}));
jest.mock('../../services/firebase/dailyLog.service', () => {
  const actual = jest.requireActual('../../services/firebase/dailyLog.service');
  return {
    hasPickedToday: actual.hasPickedToday,
    getDailyLog: (...a: unknown[]) => mockGetDailyLog(...a),
    getDailyLogsSince: (...a: unknown[]) => mockGetLogsSince(...a),
    upsertDailyLog: (...a: unknown[]) => mockUpsertDailyLog(...a),
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

import {
  AppState,
  type AppStateEvent,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { phaseSource, useTodayCard } from '../useTodayCard';
import { usePinnedProtocol } from '../usePinnedProtocol';
import { selectProtocol } from '../../protocolEngine';
import type { PhaseContext } from '../../journey/resolveJourney';
import type { DailyLog } from '../../types/models';
import {
  completionWithProvenance,
  pickedNotCompleted,
} from '../../services/firebase/__tests__/dailyLogFixtures';

const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';

const phase = (over: Partial<PhaseContext> = {}): PhaseContext => ({
  phaseKey: 'remove',
  destination: 'focus',
  capacitySeed: 'normal',
  revisionToken: 1,
  enteredAtIso: '',
  hasRemoveCapture: false,
  advanceDeclined: false,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  adjustArmedFromIso: null,
  adjustChoice: null,
  adjustDeclines: 0,
  adjustOffered: false,
  ...over,
});

const REMOVE_NORMAL = selectProtocol('remove', 'normal', 'medium', 'focus', undefined, null);
const REMOVE_SLAMMED = selectProtocol('remove', 'slammed', 'medium', 'focus', undefined, null);
const RECOVER_NORMAL = selectProtocol('recover', 'normal', 'medium', 'focus', undefined, null);

/** Home as it composes the two: one useTodayCard, the pin reading from it. */
function useHome({ p }: { p: PhaseContext }) {
  const card = useTodayCard('u1', phaseSource(p));
  const pinned = usePinnedProtocol('u1', card);
  return { card, pinned };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {});
  }
}

test('the fixtures really do resolve different variants', () => {
  // Without this every identity assertion below could pass by coincidence.
  expect(REMOVE_NORMAL.id).not.toBe(REMOVE_SLAMMED.id);
  expect(REMOVE_NORMAL.id).not.toBe(RECOVER_NORMAL.id);
});

// ---------------------------------------------------------------------------
// MIDNIGHT: the pin outlives the day, and completes the day it was opened on.
// ---------------------------------------------------------------------------

describe('a sheet pinned on Monday and completed after midnight', () => {
  let appStateHandlers: ((state: AppStateStatus) => void)[] = [];

  function setToday(iso: string) {
    jest.setSystemTime(new Date(`${iso}T09:00:00.000Z`));
  }

  function foreground() {
    const handler = appStateHandlers[appStateHandlers.length - 1];
    act(() => handler('active'));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    setToday(MONDAY);
    appStateHandlers = [];
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_e: AppStateEvent, handler: (state: AppStateStatus) => void) => {
        appStateHandlers.push(handler);
        return { remove: jest.fn() } as unknown as NativeEventSubscription;
      });
    // Monday was picked at normal. Tuesday was picked at SLAMMED, so the live
    // card after midnight serves a DIFFERENT variant: a write that read the
    // live protocol would carry the wrong id, not merely the wrong date.
    mockGetDailyLog
      .mockReset()
      .mockImplementation(async (_uid: string, iso: string) =>
        iso === MONDAY
          ? pickedNotCompleted(MONDAY, { dailyCapacity: 'normal', dailyTimeBudget: 'medium' })
          : pickedNotCompleted(TUESDAY, { dailyCapacity: 'slammed', dailyTimeBudget: 'medium' })
      );
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function pinMondayThenCrossMidnight() {
    const view = renderHook(useHome, { initialProps: { p: phase() } });
    await waitFor(() => expect(view.result.current.card.protocol?.id).toBe(REMOVE_NORMAL.id));
    act(() => view.result.current.pinned.open());
    expect(view.result.current.pinned.snapshot?.iso).toBe(MONDAY);

    setToday(TUESDAY);
    foreground();
    // AFTER THE RELOAD COMMITS, which is the whole point: both flags are false
    // again and the live card is entirely Tuesday's.
    await waitFor(() => expect(view.result.current.card.protocol?.id).toBe(REMOVE_SLAMMED.id));
    expect(view.result.current.card.staleDate).toBe(false);
    expect(view.result.current.card.variantStale).toBe(false);
    expect(view.result.current.card.todayIso).toBe(TUESDAY);
    return view;
  }

  test("writes MONDAY's row with Monday's identity", async () => {
    const { result } = await pinMondayThenCrossMidnight();

    expect(result.current.pinned.completable).toBe(true);
    act(() => result.current.pinned.complete());

    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    const [uid, iso, patch] = mockUpsertDailyLog.mock.calls[0];
    expect(uid).toBe('u1');
    expect(iso).toBe(MONDAY);
    expect(patch.protocolCellId).toBe(REMOVE_NORMAL.id);
    expect(patch.protocolCompleted).toBe(true);
    expect(patch.completionSource).toBe('user_declared');
  });

  test('the sheet keeps showing what it pinned', async () => {
    const { result } = await pinMondayThenCrossMidnight();
    expect(result.current.pinned.snapshot?.protocol.id).toBe(REMOVE_NORMAL.id);
    expect(result.current.pinned.diverged).toBe(false);
  });

  test("the live card's completed is NOT set by a completion for Monday", async () => {
    const { result } = await pinMondayThenCrossMidnight();

    act(() => result.current.pinned.complete());
    await waitFor(() => expect(result.current.pinned.saving).toBe(false));

    expect(result.current.pinned.done).toBe(true);
    expect(result.current.card.completed).toBe(false);
    // And the overlay Home reads for the card names Monday, never Tuesday.
    expect(result.current.pinned.completedIso).toBe(MONDAY);
    expect(result.current.pinned.completedIso).not.toBe(result.current.card.todayIso);
  });

  test('a pinned day already done shows done and does not revert when Tuesday arrives', async () => {
    mockGetDailyLog.mockImplementation(async (_uid: string, iso: string) =>
      iso === MONDAY
        ? completionWithProvenance(MONDAY, { dailyCapacity: 'normal', dailyTimeBudget: 'medium' })
        : pickedNotCompleted(TUESDAY, { dailyCapacity: 'slammed', dailyTimeBudget: 'medium' })
    );
    const view = renderHook(useHome, { initialProps: { p: phase() } });
    await waitFor(() => expect(view.result.current.card.completed).toBe(true));
    act(() => view.result.current.pinned.open());
    expect(view.result.current.pinned.done).toBe(true);

    setToday(TUESDAY);
    foreground();
    await waitFor(() => expect(view.result.current.card.todayIso).toBe(TUESDAY));
    await waitFor(() => expect(view.result.current.card.protocol?.id).toBe(REMOVE_SLAMMED.id));
    expect(view.result.current.card.completed).toBe(false);

    expect(view.result.current.pinned.done).toBe(true);
    expect(view.result.current.pinned.completable).toBe(false);
    act(() => view.result.current.pinned.complete());
    await flush();
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// A SAME-DAY VARIANT CHANGE: the pin is invalidated, and says so.
// ---------------------------------------------------------------------------

describe('a sheet pinned before a same-day variant change', () => {
  const picked = () =>
    pickedNotCompleted('2026-08-10', { dailyCapacity: 'normal', dailyTimeBudget: 'medium' });

  beforeEach(() => {
    mockGetDailyLog.mockReset().mockImplementation(async () => picked());
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  async function pinThenAdvance() {
    const held = deferred<DailyLog | null>();
    const view = renderHook(useHome, { initialProps: { p: phase({ revisionToken: 1 }) } });
    await waitFor(() => expect(view.result.current.card.protocol?.id).toBe(REMOVE_NORMAL.id));
    act(() => view.result.current.pinned.open());

    mockGetDailyLog.mockImplementationOnce(() => held.promise);
    view.rerender({ p: phase({ phaseKey: 'recover', revisionToken: 2 }) });
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(2));
    return { ...view, held };
  }

  test('inside the window it is not completable, and not yet called diverged', async () => {
    const { result } = await pinThenAdvance();
    expect(result.current.card.variantStale).toBe(true);
    expect(result.current.pinned.completable).toBe(false);
    // Not yet KNOWN: the new load has not said what it resolves to.
    expect(result.current.pinned.diverged).toBe(false);
  });

  test('after the reload commits it cannot complete, and shows the divergence state', async () => {
    const { result, held } = await pinThenAdvance();
    await act(async () => {
      held.resolve(picked());
    });
    await waitFor(() => expect(result.current.card.protocol?.id).toBe(RECOVER_NORMAL.id));
    expect(result.current.card.variantStale).toBe(false);
    expect(result.current.card.staleDate).toBe(false);

    expect(result.current.pinned.diverged).toBe(true);
    expect(result.current.pinned.completable).toBe(false);
    // The pinned content is preserved, not swapped.
    expect(result.current.pinned.snapshot?.protocol.id).toBe(REMOVE_NORMAL.id);

    act(() => result.current.pinned.complete());
    await flush();
    // THE DEFECT this guards: a write of REMOVE's id onto a day Recover counts.
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
  });

  test('a revision that leaves the variant where it was does not diverge', async () => {
    const view = renderHook(useHome, { initialProps: { p: phase({ revisionToken: 1 }) } });
    await waitFor(() => expect(view.result.current.card.protocol?.id).toBe(REMOVE_NORMAL.id));
    act(() => view.result.current.pinned.open());

    // An offer exposure: the token moves, the variant identity does not, and the
    // reload re-resolves the SAME cell into a fresh object.
    view.rerender({ p: phase({ revisionToken: 2, advanceExposures: 1 }) });
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(2));
    await flush();

    expect(view.result.current.pinned.diverged).toBe(false);
    expect(view.result.current.pinned.completable).toBe(true);
  });
});
