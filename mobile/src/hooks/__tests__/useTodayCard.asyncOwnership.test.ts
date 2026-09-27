// useTodayCard: WHO OWNS AN ASYNC RESULT (ASYNC-LOAD-OWNERSHIP).
//
// Two questions, answered by two different flags, and this suite pins both.
//
//   RUN OWNERSHIP, for the load. A load whose dependencies have moved on must
//   not mutate state belonging to the run that replaced it. HISTORY: an earlier
//   Today load could settle after a dependency-triggered reload and overwrite
//   the newer run.
//
//   MOUNT OWNERSHIP, for `markDone` and `confirmPick`. Their writes outlive the
//   load run they were called under, so their post-write state answers to the
//   mount. Tied to a run, `saving` / `pickSaving` stick true and the CTA dies.
//
// The rollover-specific supersession case lives with the other rollover cases
// in useTodayCard.dayRollover.test.ts.

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

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { phaseSource, useTodayCard } from '../useTodayCard';
import { selectProtocol } from '../../protocolEngine';
import type { PhaseContext } from '../../journey/resolveJourney';
import type { DailyLog } from '../../types/models';
import {
  dailyLog,
  pickedNotCompleted,
} from '../../services/firebase/__tests__/dailyLogFixtures';

const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';

/** A journey source with nothing offered and no consistency read. */
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

/**
 * SUPERSEDED LOADS (ASYNC-LOAD-OWNERSHIP).
 *
 * A load whose dependencies have moved on must not mutate state belonging to
 * the run that replaced it: not the commit, not the catch, not the
 * consistent-days read that lands outside the main batch. Each case holds the
 * OLD run's read open with a deferred promise, lets the NEW run settle first,
 * then releases the old one - the out-of-order resolution a slow network makes
 * possible and a device cannot reproduce on demand.
 *
 * `remove` and `recover` resolve DIFFERENT variants, which is what makes the
 * protocol assertions able to fail.
 */
describe('superseded loads cannot mutate the newer run (ASYNC-LOAD-OWNERSHIP)', () => {
  const REMOVE_ID = selectProtocol('remove', 'normal', 'medium', 'focus', undefined, null).id;
  const RECOVER_ID = selectProtocol('recover', 'normal', 'medium', 'focus', undefined, null).id;

  /** A held read, and the two ways to let it go. */
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  /** Let every continuation a released promise schedules run to completion. */
  async function flush() {
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {});
    }
  }

  // PICKED, so no load reads yesterday: one `getDailyLog` call per run, which
  // is what lets `mockImplementationOnce` hand the held read to run A alone.
  const picked = () => pickedNotCompleted('2026-08-10', { dailyCapacity: 'normal' });

  beforeEach(() => {
    mockGetDailyLog.mockReset().mockImplementation(async () => picked());
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  test('the two phases really do resolve different variants', () => {
    // The guard against this suite passing by coincidence.
    expect(REMOVE_ID).not.toBe(RECOVER_ID);
  });

  test('a superseded load that resolves LAST does not commit over the newer run', async () => {
    const readA = deferred<DailyLog | null>();
    mockGetDailyLog.mockImplementationOnce(() => readA.promise);

    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ phaseKey: 'remove', revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ phaseKey: 'recover', revisionToken: 2 }) });
    await waitFor(() => expect(result.current.protocol?.id).toBe(RECOVER_ID));

    await act(async () => {
      readA.resolve(picked());
    });
    await flush();

    expect(result.current.protocol?.id).toBe(RECOVER_ID);
    expect(result.current.picked).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  test('a superseded load that REJECTS last does not wipe the newer run', async () => {
    // The sharper half. The catch path nulls the protocol and sets `failed`,
    // so an unguarded stale rejection destroys valid state rather than
    // replacing it.
    const readA = deferred<DailyLog | null>();
    mockGetDailyLog.mockImplementationOnce(() => readA.promise);

    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ phaseKey: 'remove', revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ phaseKey: 'recover', revisionToken: 2 }) });
    await waitFor(() => expect(result.current.protocol?.id).toBe(RECOVER_ID));

    await act(async () => {
      readA.reject(new Error('offline'));
    });
    await flush();

    expect(result.current.protocol?.id).toBe(RECOVER_ID);
    expect(result.current.dayCapacity).toBe('normal');
    expect(result.current.failed).toBe(false);
  });

  test('a superseded consistent-days read does not overwrite the newer count', async () => {
    const sinceA = deferred<DailyLog[]>();
    mockGetLogsSince.mockImplementationOnce(() => sinceA.promise);
    // Run B counts two completed days in the phase.
    mockGetLogsSince.mockImplementationOnce(async () => [
      dailyLog(MONDAY, { protocolCompleted: true }),
      dailyLog(TUESDAY, { protocolCompleted: true }),
    ]);

    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ enteredAtIso: MONDAY, revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ enteredAtIso: MONDAY, revisionToken: 2 }) });
    await waitFor(() => expect(result.current.consistentDays).toBe(2));

    await act(async () => {
      sinceA.resolve([]);
    });
    await flush();

    expect(result.current.consistentDays).toBe(2);
  });

  test('a superseded consistent-days read that REJECTS does not zero the newer count', async () => {
    const sinceA = deferred<DailyLog[]>();
    mockGetLogsSince.mockImplementationOnce(() => sinceA.promise);
    mockGetLogsSince.mockImplementationOnce(async () => [
      dailyLog(MONDAY, { protocolCompleted: true }),
    ]);

    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ enteredAtIso: MONDAY, revisionToken: 1 }) } }
    );
    await waitFor(() => expect(mockGetLogsSince).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ enteredAtIso: MONDAY, revisionToken: 2 }) });
    await waitFor(() => expect(result.current.consistentDays).toBe(1));

    await act(async () => {
      sinceA.reject(new Error('offline'));
    });
    await flush();

    expect(result.current.consistentDays).toBe(1);
  });

  test('a load in flight when the uid goes away does not commit over the cleared card', async () => {
    // The early-return branch runs no load of its own, but it used to set the
    // shared flag true, which re-armed the run it had just replaced.
    const readA = deferred<DailyLog | null>();
    mockGetDailyLog.mockImplementationOnce(() => readA.promise);

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | undefined }) =>
        useTodayCard(uid, phaseSource(phase({ phaseKey: 'remove' }))),
      { initialProps: { uid: 'u1' as string | undefined } }
    );
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(1));

    rerender({ uid: undefined });
    expect(result.current.protocol).toBeNull();

    await act(async () => {
      readA.resolve(picked());
    });
    await flush();

    expect(result.current.protocol).toBeNull();
    expect(result.current.picked).toBe(false);
  });
});

/**
 * THE CALLBACKS ARE OWNED BY THE MOUNT, NOT BY A LOAD RUN.
 *
 * `markDone`'s write routinely outlives the load it was tapped under - any
 * journey write re-arms the load. If its post-write state were gated on the
 * load's run, `saving` would never clear and the CTA would stay disabled, and a
 * failed write would never revert the optimistic check.
 */
describe('markDone across a reload that starts mid-write (ASYNC-LOAD-OWNERSHIP)', () => {
  function deferredWrite() {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  beforeEach(() => {
    mockGetDailyLog
      .mockReset()
      .mockResolvedValue(pickedNotCompleted('2026-08-10', { dailyCapacity: 'normal' }));
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset();
  });

  async function tapThenReload() {
    const write = deferredWrite();
    mockUpsertDailyLog.mockImplementationOnce(() => write.promise);

    const view = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());

    act(() => view.result.current.markDone());
    expect(view.result.current.saving).toBe(true);

    // A journey write lands while the completion write is still in flight.
    const loadsBefore = mockGetDailyLog.mock.calls.length;
    view.rerender({ p: phase({ revisionToken: 2 }) });
    await waitFor(() =>
      expect(mockGetDailyLog.mock.calls.length).toBeGreaterThan(loadsBefore)
    );

    return { ...view, write };
  }

  test('a successful write still clears saving', async () => {
    const { result, write } = await tapThenReload();

    await act(async () => {
      write.resolve();
    });

    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.saveFailed).toBe(false);
  });

  test('under StrictMode, the simulated remount leaves the mount flag TRUE', async () => {
    // StrictMode runs every effect, its cleanup, then the effect again. A mount
    // flag set true only by `useRef(true)` ends that sequence false, and every
    // post-write setState is then skipped: `saving` sticks and the CTA dies.
    mockUpsertDailyLog.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTodayCard('u1', phaseSource(phase())), {
      wrapper: React.StrictMode,
    });
    await waitFor(() => expect(result.current.protocol).not.toBeNull());

    act(() => result.current.markDone());

    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
    await waitFor(() => expect(result.current.saving).toBe(false));
  });

  test('a failed write still reverts the check and clears saving', async () => {
    const { result, write } = await tapThenReload();

    await act(async () => {
      write.reject(new Error('offline'));
    });

    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.saveFailed).toBe(true);
    expect(result.current.completed).toBe(false);
  });
});

/**
 * `confirmPick` ACROSS A RELOAD THAT STARTS MID-WRITE.
 */
describe('confirmPick across a reload that starts mid-write (ASYNC-LOAD-OWNERSHIP)', () => {
  beforeEach(() => {
    mockGetDailyLog.mockReset();
    mockGetLogsSince.mockReset().mockResolvedValue([]);
    mockUpsertDailyLog.mockReset();
  });

  test('a reload that starts MID-WRITE does not swallow the confirm (ASYNC-LOAD-OWNERSHIP)', async () => {
    // `confirmPick` outlives the load it was called under, and a journey write
    // can re-arm the load while the pick is still in flight. That load read the
    // row BEFORE the pick landed, so the confirm's own reload is the only thing
    // that shows the answer. Gated on the load's run instead of the mount, it
    // would be skipped exactly here, and `pickSaving` would stick true.
    let written = false;
    mockGetDailyLog.mockImplementation(async () =>
      written
        ? {
            id: 'u1_x',
            userId: 'u1',
            date: 'x',
            practiceIds: [],
            dailyCapacity: 'slammed',
            dailyTimeBudget: 'short',
          }
        : null
    );
    let releaseWrite!: () => void;
    mockUpsertDailyLog.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseWrite = () => {
            written = true;
            resolve();
          };
        })
    );

    const view = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.picked).toBe(false);

    let confirming!: Promise<void>;
    act(() => {
      confirming = view.result.current.confirmPick('slammed', 'short');
    });
    expect(view.result.current.pickSaving).toBe(true);

    // The load re-runs while the write is outstanding, and settles unpicked.
    const readsBefore = mockGetDailyLog.mock.calls.length;
    view.rerender({ p: phase({ revisionToken: 2 }) });
    await waitFor(() =>
      expect(mockGetDailyLog.mock.calls.length).toBeGreaterThan(readsBefore)
    );
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.picked).toBe(false);

    await act(async () => {
      releaseWrite();
      await confirming;
    });

    await waitFor(() => expect(view.result.current.picked).toBe(true));
    expect(view.result.current.pickSaving).toBe(false);
  });
});
