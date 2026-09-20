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

import { cycleSource, phaseSource, useTodayCard } from '../useTodayCard';
import type { PhaseContext } from '../../journey/resolveJourney';
import { PROTOCOL_MATRIX } from '../../protocolEngine';
import type { DailyLog, WeeklyCycle } from '../../types/models';
import {
  completionWithProvenance,
  dailyLog,
  historicalCompletion,
  identityWithoutCompletion,
  pickedNotCompleted,
} from '../../services/firebase/__tests__/dailyLogFixtures';

/** The one day every case in this suite is about. */
const TODAY = '2026-08-05';

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

/**
 * Today's stored log, as getDailyLog returns it.
 *
 * A two-line alias over the shared fixture (slice 9.1a). The date is fixed
 * here because every case in this suite is about one day.
 */
const log = (over: Partial<DailyLog> = {}): DailyLog => dailyLog(TODAY, over);

async function renderToday(c: WeeklyCycle = cycle()) {
  const view = renderHook(() => useTodayCard('u1', cycleSource(c)));
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
        PROTOCOL_MATRIX.refocus.limited[0].dailyAction
      );
      expect(result.current.protocol?.capacity).toBe('limited');
    });

    test('derives from capacityInitial when a log exists but carries no capacity', async () => {
      // Every row written before this field existed. Absent must read as
      // "not picked", never as a broken day.
      mockGetDailyLog.mockResolvedValue(log({ protocolCompleted: true }));
      const { result } = await renderToday(cycle({ capacityInitial: 'slammed' }));

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.refocus.slammed[0].dailyAction
      );
      expect(result.current.completed).toBe(true);
    });
  });

  describe("the day's own capacity", () => {
    test("a capacity stored on today's log wins over the week's seed", async () => {
      mockGetDailyLog.mockResolvedValue(log({ dailyCapacity: 'slammed' }));
      const { result } = await renderToday(cycle({ capacityInitial: 'normal' }));

      expect(result.current.protocol?.dailyAction).toBe(
        PROTOCOL_MATRIX.refocus.slammed[0].dailyAction
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
        PROTOCOL_MATRIX.refocus.normal[0].dailyAction
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
      //
      // SLICE 9.1a WIDENED THE EXPECTED PATCH AND THE PURPOSE IS UNCHANGED.
      // Completion now carries provenance - source and the served slot - and
      // the assertion stays EXACT so it still fails if a capacity write ever
      // comes back. The `not.toHaveProperty` lines below say that in the form
      // a reader will look for.
      const { result } = await renderToday(cycle({ capacityInitial: 'limited' }));

      act(() => result.current.markDone());

      await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalled());
      const written = mockUpsertDailyLog.mock.calls[0][2];
      expect(written).toEqual({
        protocolCompleted: true,
        practiceIds: [],
        completionSource: 'user_declared',
        protocolCellId: 'refocus-limited',
      });
      expect(written).not.toHaveProperty('dailyCapacity');
      expect(written).not.toHaveProperty('dailyTimeBudget');
      // ABSENT, NOT undefined. Refocus variants carry no family, and
      // ignoreUndefinedProperties is false on this Firestore instance, so the
      // key has to be missing rather than present-and-undefined or the write
      // throws. `toEqual` cannot tell those apart; this can.
      expect(written).not.toHaveProperty('protocolFamily');
    });
  });
});

/**
 * The journey source (slice 2). Mirrors `cycle()` above so the two paths can be
 * asserted against the SAME expectations rather than against a weaker set.
 */
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

describe('useTodayCard sourced from a PhaseContext (journey slice 2)', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetFloor.mockReset().mockResolvedValue(null);
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
  });

  test("an unpicked day falls back to the PHASE's capacitySeed, not a cycle's", async () => {
    mockGetDailyLog.mockResolvedValue(null);
    const view = renderHook(() =>
      useTodayCard('u1', phaseSource(phase({ capacitySeed: 'slammed' })))
    );

    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.capacity).toBe('slammed');
  });

  test("the DAY's stored capacity still wins over the phase seed", async () => {
    // The same precedence the cycle path has. The seed is a fallback on both
    // sides, never an override.
    mockGetDailyLog.mockResolvedValue({
      id: 'u1_x',
      userId: 'u1',
      date: 'x',
      protocolCompleted: false,
      practiceIds: [],
      dailyCapacity: 'limited',
      dailyTimeBudget: 'short',
    });
    const view = renderHook(() =>
      useTodayCard('u1', phaseSource(phase({ capacitySeed: 'normal' })))
    );

    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.capacity).toBe('limited');
  });

  test('THE PHASE REACHES THE MATRIX NATIVELY, with no outcome in between', async () => {
    // Replaces the slice-2 shim tests, which asserted that a destination was
    // mapped to an OutcomeKey on the way in. `legacyOutcomeFor` is gone (slice
    // 3a) and the engine is keyed on PhaseKey, so the assertion is now about
    // WHICH CELL the served protocol came out of.
    mockGetDailyLog.mockResolvedValue(null);
    const view = renderHook(() =>
      useTodayCard('u1', phaseSource(phase({ phaseKey: 'recover', destination: 'calm' })))
    );

    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.phase).toBe('recover');
    expect(view.result.current.protocol?.id).toBe('recover-normal');
  });

  test('every destination serves out of the PHASE cell, not a destination cell', async () => {
    // Destination ORDERS a cell, it never selects one (roadmap 3.2). With no
    // weights authored the four destinations are indistinguishable here, which
    // is exactly the state this pins: if a destination ever started choosing a
    // different cell, that would be membership, and membership can empty a cell.
    mockGetDailyLog.mockResolvedValue(null);
    for (const destination of ['focus', 'calm', 'routines', 'energy'] as const) {
      const view = renderHook(() =>
        useTodayCard('u1', phaseSource(phase({ phaseKey: 'refocus', destination })))
      );
      await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
      expect(view.result.current.protocol?.id).toBe('refocus-normal');
    }
  });

  // -------------------------------------------------------------------------
  // SLICE 7c: THE RECORDED ADJUSTMENT REACHES THE ENGINE.
  //
  // The engine suites prove selectProtocol honours a choice. These prove the
  // choice GETS THERE: a serving path that never passed the field would leave
  // every one of those suites green and every user's day unchanged, which is
  // the shape of vacuity this board has been bitten by three times.
  // -------------------------------------------------------------------------
  test('an honoured choice changes the day, and the same day without it does not', async () => {
    mockGetDailyLog.mockResolvedValue(null);

    // Routines leads the re-anchor mechanism, so its unadjusted normal-capacity
    // day is "Build a recovery anchor". Recorded first, as the control.
    const control = renderHook(() =>
      useTodayCard(
        'u1',
        phaseSource(phase({ phaseKey: 'recover', destination: 'routines' }))
      )
    );
    await waitFor(() => expect(control.result.current.protocol).not.toBeNull());
    expect(control.result.current.protocol?.name).toBe('Build a recovery anchor');

    // The same user, having asked to come down. The downshift mechanism's
    // normal-capacity variant is "Downshift, then unplug".
    const adjusted = renderHook(() =>
      useTodayCard(
        'u1',
        phaseSource(
          phase({
            phaseKey: 'recover',
            destination: 'routines',
            adjustChoice: 'help_me_come_down',
          })
        )
      )
    );
    await waitFor(() => expect(adjusted.result.current.protocol).not.toBeNull());
    expect(adjusted.result.current.protocol?.name).toBe('Downshift, then unplug');
  });

  test('an UNHONOURED choice leaves the day exactly as it was', async () => {
    // The nine are approved and not activated (Jen ruling 1). One that reached a
    // document anyway must not steer the day, and the engine is where that is
    // refused - so this is the plumbing's half of the same claim.
    mockGetDailyLog.mockResolvedValue(null);
    const view = renderHook(() =>
      useTodayCard(
        'u1',
        phaseSource(
          phase({
            phaseKey: 'recover',
            destination: 'routines',
            adjustChoice: 'make_it_smaller',
          })
        )
      )
    );
    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.name).toBe('Build a recovery anchor');
  });

  test('dayCapacity reports the ANSWER, not the tier of the variant served', async () => {
    // The downward search in the serving path, observed at the hook: a Normal
    // answer with five minutes and a downshift preference is served the SLAMMED
    // tier's variant, and `dayCapacity` still says normal. This is what the hero
    // card's summary line reads, and it is why the prop exists.
    mockGetDailyLog.mockResolvedValue({
      dailyCapacity: 'normal',
      dailyTimeBudget: 'short',
    } as never);
    const view = renderHook(() =>
      useTodayCard(
        'u1',
        phaseSource(
          phase({
            phaseKey: 'recover',
            destination: 'calm',
            adjustChoice: 'help_me_come_down',
          })
        )
      )
    );
    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.name).toBe('Lengthen the exhale');
    expect(view.result.current.protocol?.capacity).toBe('slammed');
    expect(view.result.current.dayCapacity).toBe('normal');
  });

  test('the week-1 quick win is gone: nothing is ever flagged active', async () => {
    // applyQuickWin retired in slice 3a. Early-phase gentleness is content Jen
    // authors into the Remove protocols, not an engine rule layered on top.
    mockGetDailyLog.mockResolvedValue(null);
    const view = renderHook(() => useTodayCard('u1', phaseSource(phase())));

    await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
    expect(view.result.current.protocol?.quickWinActive).toBe(false);
  });

  test('a null source yields the empty card and reads nothing', async () => {
    renderHook(() => useTodayCard('u1', null));
    expect(mockGetDailyLog).not.toHaveBeenCalled();
    expect(mockCountForOutcome).not.toHaveBeenCalled();
  });
});

// THE HISTORICAL-READ CONTRACT, at the hook (slice 9.1a).
//
// The hook decides one thing from the stored completion state: whether the
// card shows the done row or the CTA. `useTodayCard.ts` reads it as
// `log?.protocolCompleted === true`, and these cases pin that the four stored
// shapes a real collection now holds all reach the right answer.
//
// WHAT IT MUST NEVER DO, and each has a case below: treat a legacy completed
// row as anything other than complete; read an ABSENT completion key as a
// user's declared "no"; infer completion from the presence of identity; or
// surface provenance it has not been asked to surface.
describe('useTodayCard - the historical-read contract (9.1a)', () => {
  beforeEach(() => {
    mockCountForOutcome.mockReset().mockResolvedValue(2);
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockGetDailyLog.mockReset().mockResolvedValue(null);
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
  });

  test('a legacy completed row reads as COMPLETE with no provenance at all', async () => {
    const row = historicalCompletion(TODAY);
    expect(row.completedAt).toBeUndefined();
    expect(row.completionSource).toBeUndefined();
    expect(row.protocolCellId).toBeUndefined();
    mockGetDailyLog.mockResolvedValue(row);

    const { result } = await renderToday();

    expect(result.current.completed).toBe(true);
    // And the card still has an action to name: an unknown protocol is not a
    // broken day, and nothing about the read degrades.
    expect(result.current.protocol).not.toBeNull();
    expect(result.current.failed).toBe(false);
  });

  test('an ABSENT completion key reads as not-done, never as a declined day', async () => {
    // Sub-shape 3a: a picker confirm writes capacity and time and nothing
    // else, so `protocolCompleted` has no key. `=== true` is what makes this
    // behave like `false`; a `!== false` read would report it complete.
    const row = pickedNotCompleted(TODAY);
    expect(row.protocolCompleted).toBeUndefined();
    mockGetDailyLog.mockResolvedValue(row);

    const { result } = await renderToday();

    expect(result.current.completed).toBe(false);
    // The day WAS answered, which is a different fact and must not be
    // confused with the one above.
    expect(result.current.picked).toBe(true);
  });

  test('an explicit false and an absent key are indistinguishable to the card', async () => {
    mockGetDailyLog.mockResolvedValue(log({ protocolCompleted: false }));
    const explicit = await renderToday();
    expect(explicit.result.current.completed).toBe(false);

    mockGetDailyLog.mockResolvedValue(pickedNotCompleted(TODAY));
    const absent = await renderToday();
    expect(absent.result.current.completed).toBe(false);
  });

  test('identity WITHOUT a completion key does not read as complete', async () => {
    // A state 9.1a's writer cannot produce. Asserted so that a later reader
    // who starts treating `protocolCellId` as evidence of completion fails
    // here rather than in production.
    const row = identityWithoutCompletion(TODAY);
    expect(row.protocolCellId).toBeDefined();
    mockGetDailyLog.mockResolvedValue(row);

    const { result } = await renderToday();

    expect(result.current.completed).toBe(false);
  });

  test('a provenance-bearing row reads exactly like a legacy completed one', async () => {
    mockGetDailyLog.mockResolvedValue(completionWithProvenance(TODAY));
    const withProvenance = await renderToday();

    mockGetDailyLog.mockResolvedValue(historicalCompletion(TODAY));
    const without = await renderToday();

    expect(withProvenance.result.current.completed).toBe(
      without.result.current.completed
    );
    expect(withProvenance.result.current.completed).toBe(true);
  });

  test('nothing from the stored row is re-derived onto a legacy completion', async () => {
    // The engine can always produce today's protocol, which is what makes
    // back-filling tempting. The hook must not write one: a completion read
    // is a read, and `markDone` is the only thing on this hook that writes.
    mockGetDailyLog.mockResolvedValue(historicalCompletion(TODAY));

    await renderToday();

    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
  });
});
