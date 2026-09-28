// useTodayCard: A PROTOCOL MUST NOT BE COMPLETABLE ONCE THE INPUTS THAT CHOSE IT
// HAVE MOVED ON (STALE-SOURCE-COMPLETION).
//
// THE WINDOW (W1). Home learns of a phase advance when the landing hook's
// re-resolve lands. In that render JourneyLine names the new phase and the load
// re-arms, but `protocol` still holds the previous phase's variant until the
// new run commits. The date has not moved, so `staleDate` cannot see it, and
// before this row a tap in that window wrote the PREVIOUS phase's cell id.
//
// THE GUARD IS ON VARIANT IDENTITY, NOT ON `sourceKey`. Every journeyStates
// write bumps `revisionToken`, including the offer exposures Home writes on an
// ordinary visit, and a guard that fired on those would dim the CTA on a normal
// day. So this suite pins BOTH directions: an advance refuses, and a
// token-only revision does not.
//
// W0 IS NOT COVERED AND CANNOT BE. Before the re-resolve lands, Home's inputs
// have not changed, so there is nothing to compare against. That window is
// ledgered, not fixed.
//
// markDone IS CALLED DIRECTLY HERE, not through a rendered press. That is the
// point for the defensive half - the write must refuse whatever the UI does -
// and it means the UI half is covered separately, by TodayHeroCard.test.tsx.
// Whether a real tap in the window reaches either is a device-walk question.

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

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { phaseSource, useTodayCard } from '../useTodayCard';
import { selectProtocol } from '../../protocolEngine';
import { deriveConsistentDays } from '../../journey/derive';
import type { PhaseContext } from '../../journey/resolveJourney';
import type { DailyLog } from '../../types/models';
import { pickedNotCompleted } from '../../services/firebase/__tests__/dailyLogFixtures';
import { toIsoDate } from '../../utils/weekStart';

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

// The day the picker produced: normal capacity, medium time. The hook reads the
// log's own fields, so these are the arguments `selectProtocol` actually gets.
const REMOVE_ID = selectProtocol('remove', 'normal', 'medium', 'focus', undefined, null).id;
const RECOVER_ID = selectProtocol('recover', 'normal', 'medium', 'focus', undefined, null).id;

/** A held read, released by the test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Let every continuation a released promise schedules run to completion. */
async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {});
  }
}

// PICKED, so no load reads yesterday: one `getDailyLog` call per run, which is
// what lets `mockImplementationOnce` hand the held read to the SECOND run alone.
const picked = () =>
  pickedNotCompleted('2026-08-10', { dailyCapacity: 'normal', dailyTimeBudget: 'medium' });

beforeEach(() => {
  mockGetDailyLog.mockReset().mockImplementation(async () => picked());
  mockGetLogsSince.mockReset().mockResolvedValue([]);
  mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
});

test('the two phases really do resolve different variants', () => {
  // The guard against every test below passing by coincidence: if Remove and
  // Recover served the same cell, a stale write would carry the right id.
  expect(REMOVE_ID).not.toBe(RECOVER_ID);
});

/**
 * Mount on Remove, then advance to Recover and HOLD the new run's read, so the
 * assertions are made inside W1 rather than after it has closed.
 */
async function advanceIntoTheWindow(over: Partial<PhaseContext> = {}) {
  const held = deferred<DailyLog | null>();
  const view = renderHook(
    ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
    { initialProps: { p: phase({ phaseKey: 'remove', revisionToken: 1, ...over }) } }
  );
  await waitFor(() => expect(view.result.current.protocol?.id).toBe(REMOVE_ID));
  expect(view.result.current.variantStale).toBe(false);

  mockGetDailyLog.mockImplementationOnce(() => held.promise);
  view.rerender({ p: phase({ phaseKey: 'recover', revisionToken: 2, ...over }) });
  await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(2));

  // STILL THE OLD VARIANT. Without this the refusal below could be passing
  // because the protocol had already moved on, not because of the guard.
  expect(view.result.current.protocol?.id).toBe(REMOVE_ID);
  expect(view.result.current.staleDate).toBe(false);

  return { ...view, held };
}

describe('W1: the phase has advanced and the card still holds the old variant', () => {
  test('a tap inside the window writes NOTHING', async () => {
    const { result } = await advanceIntoTheWindow();

    act(() => result.current.markDone());
    await flush();

    // THE DEFECT, pre-fix: upsertDailyLog called with protocolCellId REMOVE_ID.
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
    expect(result.current.completed).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  test('variantStale is true in the render the new phase arrives in', async () => {
    const { result } = await advanceIntoTheWindow();
    expect(result.current.variantStale).toBe(true);
  });

  test('once the new variant commits, the tap writes the NEW cell id', async () => {
    const { result, held } = await advanceIntoTheWindow();

    await act(async () => {
      held.resolve(picked());
    });
    await waitFor(() => expect(result.current.protocol?.id).toBe(RECOVER_ID));
    expect(result.current.variantStale).toBe(false);

    act(() => result.current.markDone());
    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    const [, , patch] = mockUpsertDailyLog.mock.calls[0];
    expect(patch.protocolCellId).toBe(RECOVER_ID);
    // Recover variants carry no family, and an absent key is the valid row.
    expect('protocolFamily' in patch).toBe(false);
  });

  test('every other variant input goes stale the same way', async () => {
    // One named identity, four inputs. An advance is the reachable case; these
    // are the other three, each moved ALONE with the token held constant, so
    // the only thing the guard can be reacting to is the input itself.
    const moves: Partial<PhaseContext>[] = [
      { destination: 'energy' },
      { removeFamily: 'behavioral' },
      { adjustChoice: 'make_it_smaller' },
    ];
    for (const move of moves) {
      mockGetDailyLog.mockReset().mockImplementation(async () => picked());
      const held = deferred<DailyLog | null>();
      const view = renderHook(
        ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
        { initialProps: { p: phase({ revisionToken: 1 }) } }
      );
      await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
      expect(view.result.current.variantStale).toBe(false);

      mockGetDailyLog.mockImplementationOnce(() => held.promise);
      view.rerender({ p: phase({ revisionToken: 1, ...move }) });
      await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(2));

      expect(view.result.current.variantStale).toBe(true);
      view.unmount();
    }
  });
});

describe('the negative case: a revision that does not change the variant', () => {
  test('a token-only bump leaves the card completable and writes the CORRECT cell id', async () => {
    // THE OVER-TIGHT GUARD THIS ROW MUST NOT BECOME. recordAdvanceExposure and
    // recordAdjustOffered fire from Home itself and bump the token with nothing
    // about the variant changed. A sourceKey guard refuses here; this one must
    // not. dayRollover.test.ts:486 pins the write; this adds WHICH id.
    const held = deferred<DailyLog | null>();
    const { result, rerender } = renderHook(
      ({ p }: { p: PhaseContext }) => useTodayCard('u1', phaseSource(p)),
      { initialProps: { p: phase({ revisionToken: 1 }) } }
    );
    await waitFor(() => expect(result.current.protocol?.id).toBe(REMOVE_ID));

    mockGetDailyLog.mockImplementationOnce(() => held.promise);
    rerender({ p: phase({ revisionToken: 2 }) });
    await waitFor(() => expect(mockGetDailyLog).toHaveBeenCalledTimes(2));

    // Inside the reload, and still fine.
    expect(result.current.variantStale).toBe(false);
    expect(result.current.staleDate).toBe(false);

    act(() => result.current.markDone());
    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    expect(mockUpsertDailyLog.mock.calls[0][2].protocolCellId).toBe(REMOVE_ID);
    await waitFor(() => expect(result.current.saving).toBe(false));
  });
});

describe('the data consequence: a stale completion cannot count toward the new phase', () => {
  /**
   * An in-memory dailyLogs collection behind the three service calls, so the
   * consistency read sees whatever the completion write actually put there.
   * Merge semantics only: provenance is the service's rule and is pinned in
   * dailyLog.service.test.ts, not re-implemented here.
   */
  function store() {
    const rows = new Map<string, DailyLog>();
    mockUpsertDailyLog.mockImplementation(
      async (_uid: string, date: string, patch: Partial<DailyLog>) => {
        rows.set(date, { ...(rows.get(date) ?? picked()), ...patch, date } as DailyLog);
      }
    );
    mockGetLogsSince.mockImplementation(async (_uid: string, since: string) =>
      [...rows.values()].filter((r) => r.date >= since)
    );
    return rows;
  }

  test('no row the new phase counts carries the previous phase identity', async () => {
    // THE POINT OF THE ROW. The advance day is the new phase's entry day, and
    // deriveConsistentDays counts any completed row dated on or after it. So a
    // W1 completion, pre-fix, landed a REMOVE cell id on a day that counts
    // toward RECOVER's threshold - the one that gates the next advance.
    const rows = store();
    const today = toIsoDate(new Date());
    const { result, held } = await advanceIntoTheWindow({ enteredAtIso: today });

    act(() => result.current.markDone());
    await flush();

    await act(async () => {
      held.resolve(picked());
    });
    await waitFor(() => expect(result.current.protocol?.id).toBe(RECOVER_ID));

    // Nothing was established in the window, so nothing counts yet.
    expect(deriveConsistentDays([...rows.values()], today)).toBe(0);
    expect(result.current.consistentDays).toBe(0);

    // The day counts once the user completes the variant they can now see.
    act(() => result.current.markDone());
    await waitFor(() => expect(rows.get(today)?.protocolCompleted).toBe(true));
    const counted = [...rows.values()].filter(
      (r) => r.protocolCompleted === true && r.date >= today
    );
    expect(counted).toHaveLength(1);
    expect(counted.every((r) => r.protocolCellId === RECOVER_ID)).toBe(true);
  });

  test('the FIRST completing write carries the current identity', async () => {
    // WHY THE GUARD MUST HOLD AT THE FIRST WRITE. stampProvenance clause (c)
    // drops provenance from every write to a row already complete, so a stale
    // first write is permanent: no second tap can correct it. The only defence
    // is that the first completing write is never the stale one.
    const { result, held } = await advanceIntoTheWindow();

    act(() => result.current.markDone());
    await flush();
    await act(async () => {
      held.resolve(picked());
    });
    await waitFor(() => expect(result.current.protocol?.id).toBe(RECOVER_ID));
    act(() => result.current.markDone());
    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());

    const completing = mockUpsertDailyLog.mock.calls.filter(
      ([, , patch]) => patch.protocolCompleted === true
    );
    expect(completing[0][2].protocolCellId).toBe(RECOVER_ID);
    expect(completing.some(([, , patch]) => patch.protocolCellId === REMOVE_ID)).toBe(false);
  });
});
