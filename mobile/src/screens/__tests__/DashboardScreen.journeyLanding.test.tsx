// Home under JOURNEY_IA (journey slice 2).
//
// The harness is the sibling DashboardScreen suites' harness. What differs is
// that useTodayCard is CAPTURED rather than stubbed blind: which source Home
// hands it is the entire subject of this slice, so the argument is the
// assertion and a stub that ignored it would pass on the wrong wiring.
//
// JOURNEY_IA is not mocked here. It ships ON, and this file asserts the
// shipped configuration; the flag-off path is covered by
// useJourneyLanding.flagOff.test.ts against the hook directly.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { ScrollView: require('react-native').ScrollView },
}));
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../components', () => ({ LoadingSpinner: () => null }));
jest.mock('../../components/ai/GuidePill', () => ({ GuidePill: () => null }));
jest.mock('../../components/shared/ScreenHeader', () => ({
  ScreenHeader: () => null,
  BAND_STRONG_SCRIM: [0, 0.05, 0.82, 1],
}));
jest.mock('../../components/dashboard/NotificationOptInCard', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/dashboard/InsightCard', () => ({ InsightCard: () => null }));
jest.mock('../../components/dashboard/RoutineCard', () => ({ RoutineCard: () => null }));
jest.mock('../../components/dashboard/WeeklyHabitGrid', () => ({
  WeeklyHabitGrid: () => null,
}));
jest.mock('../../components/dashboard/InsightsLookbackCard', () => ({
  InsightsLookbackCard: () => null,
}));
jest.mock('../../components/dashboard/FirstShiftFooter', () => ({
  FirstShiftFooter: () => null,
}));
jest.mock('../../components/habits/HabitNoteSheet', () => ({ HabitNoteSheet: () => null }));
jest.mock('../../components/events/EventCodeCard', () => ({ EventCodeCard: () => null }));
jest.mock('../../components/events/EventCodeSheet', () => ({ EventCodeSheet: () => null }));
jest.mock('../Time/ActiveRoutinePlayer', () => ({ ActiveRoutinePlayer: () => null }));

const mockNavigate = jest.fn();
jest.mock('../../hooks/useDashboard', () => ({
  useDashboard: () => ({
    navigation: { navigate: mockNavigate },
    dataLoading: false,
    dataErrors: [],
    refreshing: false,
    greeting: 'Good morning',
    formattedDate: 'Monday 3 August',
    handleRefresh: jest.fn(),
    notifOptInCard: null,
    handleNotifOptIn: jest.fn(),
    handleNotifDismiss: jest.fn(),
    showEventCodeCard: false,
    eventCodeSheetVisible: false,
    setEventCodeSheetVisible: jest.fn(),
    handleEventCodeDismiss: jest.fn(),
    handleEventCodeSuccess: jest.fn(),
    dashboardRoutines: [],
    routineCompletions: {},
    activePlayerRoutine: null,
    routinePlayerVisible: false,
    handleBeginRoutine: jest.fn(),
    handleCloseRoutinePlayer: jest.fn(),
    handleRoutineComplete: jest.fn(),
    habits: [],
    allCompletions: {},
    weeklyCompletions: {},
    processingHabits: {},
    handleHabitToggle: jest.fn(),
    noteTarget: null,
    saveNote: jest.fn(),
    dismissNote: jest.fn(),
  }),
}));

const mockGetFloor = jest.fn();
const mockGetUserPrivate = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
  getUserPrivate: (...a: any[]) => mockGetUserPrivate(...a),
}));
const mockGetLatestCycle = jest.fn();
const mockEnsureCycle = jest.fn();
const mockGetCyclesSince = jest.fn(async () => [] as any[]);
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  ensureCurrentWeeklyCycle: (...a: any[]) => mockEnsureCycle(...a),
  // Slice 7b. useAdjustOffer reads the weekly phase reads through this, and it
  // is the ONE read on Home the resolver cannot supply from state in hand.
  getWeeklyCyclesSince: (...a: any[]) => mockGetCyclesSince(...(a as [])),
}));
// SLICE 7d. THIS MOCK IS THE POINT OF THE 7d SCREEN TESTS, and its absence is
// why the exposure defect was invisible to this suite for two slices.
//
// Until now `journeyState.service` was left unmocked here. The real module
// loads, `requireDb()` throws on the `db: null` mock above, both slot writes
// reject, and every `.catch` swallows it. So the suite could not observe the
// writes AT ALL: a screen that spent an exposure behind the capture card and a
// screen that spent none were indistinguishable, and every test stayed green.
// That is the `reference_rules_test_harness` vacuous-green shape in a third
// place - the assertions were real, and the thing they asserted was not the
// thing that breaks.
const mockRecordExposure = jest.fn(async () => {});
const mockRecordAdjustOffered = jest.fn(async () => {});
jest.mock('../../services/firebase/journeyState.service', () => ({
  recordAdvanceExposure: (...a: any[]) => mockRecordExposure(...(a as [])),
  recordAdjustOffered: (...a: any[]) => mockRecordAdjustOffered(...(a as [])),
  recordAdvanceDeclined: jest.fn(async () => {}),
  recordAdjustDeclined: jest.fn(async () => {}),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// useTodayCard is captured rather than stubbed blind: this suite's whole point
// is WHICH source Home hands it, so the argument is the assertion.
const mockTodayCard = jest.fn();
const mockUseTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => {
  const actual = jest.requireActual('../../hooks/useTodayCard');
  return {
    cycleSource: actual.cycleSource,
    phaseSource: actual.phaseSource,
    useTodayCard: (...a: any[]) => {
      mockUseTodayCard(...a);
      return mockTodayCard();
    },
  };
});

const mockResolveJourney = jest.fn();
jest.mock('../../journey/resolveJourney', () => ({
  ...jest.requireActual('../../journey/resolveJourney'),
  resolveJourney: (...a: any[]) => mockResolveJourney(...a),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../protocolEngine';

/** A live, unclosed week inside its window, so the weekly guard resolves 'today'. */
function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  // LOCAL date parts, not toISOString(). The app frames "today" through
  // toIsoDate(), which reads getFullYear/getMonth/getDate, so a UTC-formatted
  // fixture disagrees with it by a day whenever the machine sits west of UTC
  // late in the day. That made day(-1) render as today's local date, and an
  // "expired" cycle read as live: a clock-dependent failure that only appears
  // on some machines at some hours.
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const date = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${date}`;
}

const liveCycle = {
  id: 'c1',
  userId: 'u1',
  weekStart: day(-2),
  weekEnd: day(4),
  outcome: 'focus',
  capacityInitial: 'normal',
  capacityCurrent: 'normal',
  protocolId: 'focus-normal',
};

const PHASE = {
  phaseKey: 'remove',
  destination: 'calm',
  capacitySeed: 'limited',
  revisionToken: 99,
  enteredAtIso: '',
  hasRemoveCapture: true,
  // Slice 7a. Cleared values: a phase nobody has been offered anything in, so
  // the tests that predate the slot see exactly what they saw before it.
  advanceDeclined: false,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  // Slice 7b, on the same terms: a phase in which no adjustment has been
  // offered, declined or acted on.
  adjustArmedFromIso: null,
  adjustDeclines: 0,
  adjustOffered: false,
};

function todayCard(over: Record<string, unknown> = {}) {
  return {
    protocol: { ...PROTOCOL_MATRIX.refocus.normal[0], quickWinActive: true },
    floorCommitment: null,
    completed: false,
    loading: false,
    failed: false,
    markDone: jest.fn(),
    saving: false,
    saveFailed: false,
    picked: true,
    prefillCapacity: 'normal',
    prefillTime: 'medium',
    confirmPick: jest.fn(),
    pickSaving: false,
    pickFailed: false,
    // Slice 7a. Home feeds both to useAdvanceOffer, and `todayIso` in
    // particular is load bearing: it is the ONE definition of today on this
    // screen, and the offer's day gate compares against it. Omitted, the
    // calendar derivation reads NaN and the ceiling door never opens, which
    // silently makes every advancement assertion pass for the wrong reason.
    consistentDays: 0,
    todayIso: '2026-09-10',
    ...over,
  };
}

/** The source argument Home most recently handed useTodayCard. */
const lastSource = () => mockUseTodayCard.mock.calls.at(-1)?.[1];

/**
 * The default world every describe in this file starts from.
 *
 * EXTRACTED IN SLICE 7a, and the reason is a bug it caught rather than tidiness.
 * This body lived inline in the describe below, so the describes added by 7a
 * inherited nothing and ran against whatever mock state the previous block
 * happened to leave behind. Two of them passed on that residue and one crashed,
 * which is the order-dependent, vacuous-green shape: the passes were as wrong as
 * the failure, they just did not say so. Every describe now primes explicitly.
 */
function primeHome() {
  jest.clearAllMocks();
  mockUseFocusEffect.mockImplementation(() => {});
  mockTodayCard.mockReturnValue(todayCard());
  mockGetFloor.mockResolvedValue('Ten minutes of quiet');
  mockGetLatestCycle.mockResolvedValue(liveCycle);
  mockGetUserPrivate.mockResolvedValue({ weekStartDay: null });
  // Rollover returns the week it just made. Distinct id, so an assertion can
  // tell the rolled week apart from the expired one it replaced.
  mockEnsureCycle.mockResolvedValue({ ...liveCycle, id: 'cycle-rolled' });
  mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });
  // Slice 7b. No weekly reads by default, so every test that predates the
  // adjust card sees exactly what it saw before: an offer that is not due.
  mockGetCyclesSince.mockResolvedValue([]);
}

describe('DashboardScreen under JOURNEY_IA', () => {
  beforeEach(primeHome);

  test('HANDS useTodayCard THE PHASE, not the cycle', async () => {
    // The whole slice in one assertion. Home still HAS a cycle here (the weekly
    // guard resolved one), and must hand the phase anyway.
    render(<DashboardScreen />);

    await waitFor(() => expect(lastSource()?.kind).toBe('phase'));
    expect(lastSource().phase).toEqual(PHASE);
  });

  test('renders the Today block from a phase', async () => {
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-hero')).toBeTruthy());
  });

  test('renders the pre-pick prompt from a phase when the day is unpicked', async () => {
    mockTodayCard.mockReturnValue(todayCard({ picked: false, protocol: null }));
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-set-today')).toBeTruthy());
  });

  test('KEEPS THE WEEK SUMMARY while a cycle is still carried', async () => {
    // The close entry and the summary line still read the cycle this slice.
    // If this goes quiet, the flag has taken more than the day with it.
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-summary')).toBeTruthy());
    expect(getByTestId('home-close-entry')).toBeTruthy();
  });

  test('HANDS THE RESET THE PHASE when it opens it (slice 6)', async () => {
    // The reset asks a destination-flavoured question and stores which phase
    // the answer was about, and Home is the only place that has resolved
    // either. Params rather than a second getJourneyState read on the reset
    // screen: that read would answer even with JOURNEY_IA off, because the
    // documents outlive the flag.
    //
    // ASSERTED AGAINST THE FIXTURE'S OWN VALUES, not against 'remove'/'focus'
    // spelled twice. PHASE is destination 'calm', so a wiring that passed the
    // hero's destination, or a hard-coded default, fails here.
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-close-entry')).toBeTruthy());
    fireEvent.press(getByTestId('home-close-entry'));

    expect(mockNavigate).toHaveBeenCalledWith('WeeklyClose', {
      phase: PHASE.phaseKey,
      destination: PHASE.destination,
    });
  });

  test('ROLLS AN EXPIRED WEEK OVER and shows the week furniture for the new one', async () => {
    // BEFORE ROLLOVER this asserted the opposite: an expired week meant no
    // cycle, so the summary and the close entry were both suppressed and Home
    // sat there with no week until the user opened one by hand. There is no
    // hand-open any more (journey slice 3b), so the expired week becomes the
    // next week and the furniture describes that one.
    mockGetLatestCycle.mockResolvedValue({ ...liveCycle, weekEnd: day(-1) });
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-hero')).toBeTruthy());
    expect(mockEnsureCycle).toHaveBeenCalledTimes(1);
    expect(getByTestId('home-close-entry')).toBeTruthy();
  });

  test('DOES NOT PUSH ANYWHERE on an expired week', async () => {
    // There is nowhere left to push: the weekly open is deleted and the
    // rollover happens in place. A navigation here would mean a dead route.
    mockGetLatestCycle.mockResolvedValue({ ...liveCycle, weekEnd: day(-1) });
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-hero')).toBeTruthy());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('the FLOOR gate still pushes, and the resolver never runs', async () => {
    mockGetFloor.mockResolvedValue(null);
    render(<DashboardScreen />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockResolveJourney).not.toHaveBeenCalled();
  });

  test('THE ENTRY CARD RELEASES ON A COMPLETED CAPTURE, WITHOUT A REMOUNT', async () => {
    // The re-walk failure. A capture completes, the flow pops back to Today,
    // and Today re-resolves on focus. Before this fix the resolver effect never
    // re-fired on a refresh, so the card sat there, re-enterable, until the app
    // was killed.
    //
    // The focus callback is captured from the mocked useFocusEffect and invoked
    // by hand, which is exactly what returning to the tab does.
    let focusCb: (() => void) | undefined;
    mockUseFocusEffect.mockImplementation((cb: () => void) => {
      focusCb = cb;
    });
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: false },
    });

    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
    // THE SUPPRESSION ASSERTION THAT STOOD HERE HAS NO SUCCESSOR, and that is
    // the honest outcome rather than a gap: it checked that the capture card
    // hid ContinuityCard, and the count retired in slice 6 (roadmap section 9
    // R4). Nothing renders in that slot now, so there is nothing to suppress
    // and nothing to assert. The card's own appear/disappear behaviour is what
    // this test is really about and is asserted in full below.

    // The capture lands.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: true },
    });
    await act(async () => {
      focusCb?.();
    });

    await waitFor(() => expect(queryByTestId('home-remove-capture')).toBeNull());
  });

  test('the card stays up while the capture is still outstanding', async () => {
    // Guards the test above against passing for the wrong reason: if the card
    // hid on any refresh regardless of state, this would go red.
    let focusCb: (() => void) | undefined;
    mockUseFocusEffect.mockImplementation((cb: () => void) => {
      focusCb = cb;
    });
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: false },
    });

    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());

    await act(async () => {
      focusCb?.();
    });

    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
  });

  test("a 'legacy' resolution falls back to the CYCLE source", async () => {
    // Rung (d). A user with no derivable destination keeps the surface they
    // already had, sourced from the week exactly as before.
    mockResolveJourney.mockResolvedValue({ target: 'legacy' });
    render(<DashboardScreen />);

    await waitFor(() => expect(lastSource()?.kind).toBe('cycle'));
    expect(lastSource().cycle.id).toBe('c1');
  });
});

// ---------------------------------------------------------------------------
// The ONE journey-action slot, the journey line and the Start here mount
// (slice 7a).
//
// THESE ARE SCREEN-LEVEL ASSERTIONS AND THE UNIT TESTS DO NOT COVER THEM.
// journeyActionFor's priority is pinned in journey/__tests__/journeyAction.test.ts
// against the pure function; what is asserted here is that Home actually ASKS it
// and renders the single answer. A screen that computed the right action and
// then rendered two cards anyway would pass every unit test in the slice.
// ---------------------------------------------------------------------------
describe('DashboardScreen - the journey-action slot', () => {
  beforeEach(primeHome);

  const dueForAdvance = {
    ...PHASE,
    // Captured, so the capture card yields, and entered long enough ago that
    // the ceiling door is open.
    hasRemoveCapture: true,
    enteredAtIso: '2026-01-01',
    advanceDeclined: false,
    advanceExposures: 0,
    advanceFirstOfferedOn: null,
    advanceLastExposedOn: null,
  };

  test('renders the capture card and NOT the advancement card', async () => {
    // Capture beats advance, asserted with both live. This is the pair that a
    // screen rendering siblings rather than one slot would fail.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdvance, phaseKey: 'remove', hasRemoveCapture: false },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
  });

  test('renders the advancement card once the capture is done', async () => {
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdvance });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-advancement')).toBeTruthy());
    expect(queryByTestId('home-remove-capture')).toBeNull();
  });

  test('renders NEITHER when nothing is due', async () => {
    // The slot is absent, not an empty card. Today keeps one primary action.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: true, enteredAtIso: '2026-09-10' },
    });
    const { queryByTestId, getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
    expect(queryByTestId('home-remove-capture')).toBeNull();
  });

  test('a DEMOTED advancement offer leaves the slot empty', async () => {
    // Three exposures spent. R3: the map is where it lives now, and Today must
    // not re-promote it.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: {
        ...dueForAdvance,
        advanceExposures: 3,
        advanceFirstOfferedOn: '2026-09-08',
        advanceLastExposedOn: '2026-09-09',
      },
    });
    const { queryByTestId, getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // C2 on Today (slice 7b). THE WIRING, not the rule.
  //
  // `journeyActionFor` already settles the priority and its own suite asserts
  // every boundary. What THESE tests prove is that Home passes a real placement
  // where 7a passed the literal 'hidden', which is the one thing a pure-function
  // suite cannot see. Without them the adjust branch could stay unreachable and
  // every existing test would still be green.
  // -------------------------------------------------------------------------
  const dueForAdjust = {
    ...PHASE,
    hasRemoveCapture: true,
    enteredAtIso: '2026-08-01',
    adjustArmedFromIso: '2026-08-01',
  };

  /** Two consecutive not_moving reads about this phase. */
  const twoNotMoving = [
    {
      id: 'w1',
      userId: 'u1',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
    {
      id: 'w2',
      userId: 'u1',
      weekStart: '2026-08-31',
      weekEnd: '2026-09-06',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
  ];

  test('renders the C2 card when two not_moving reads are in', async () => {
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdjust });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());
  });

  test('C2 BEATS B2 when both are due', async () => {
    // The decision that costs something, asserted through the real wiring. This
    // user has satisfied the advancement ceiling AND told us twice that nothing
    // is moving. Offering to move forward would contradict what they said
    // outright: what the user TELLS us beats what we INFER from taps.
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdjust, enteredAtIso: '2026-01-01' },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
  });

  test('a CAPPED adjust offer leaves the slot to the advancement card', async () => {
    // Two declines, so Vara stops knocking about adjusting. Demotion is about
    // WHERE an offer lives, not about which offer is right to make, so a due
    // advance takes the slot. The adjust door is still on the phase page.
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdjust, enteredAtIso: '2026-01-01', adjustDeclines: 2 },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-advancement')).toBeTruthy());
    expect(queryByTestId('home-adjustment')).toBeNull();
  });

  test('the capture card still beats C2', async () => {
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdjust, hasRemoveCapture: false },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
    expect(queryByTestId('home-adjustment')).toBeNull();
  });

  test('one not_moving read is not enough for a card', async () => {
    mockGetCyclesSince.mockResolvedValue([twoNotMoving[1]] as any);
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdjust });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());
    expect(queryByTestId('home-adjustment')).toBeNull();
  });

  test('"Try a different approach" opens THIS phase, and mutates nothing', async () => {
    // The current phase, not the next one: the alternatives are per-phase. The
    // destination travels with it so the page renders even if its own read
    // fails, exactly as the advancement preview's navigation does.
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdjust });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());

    fireEvent.press(getByTestId('home-adjustment-try-different'));

    expect(mockNavigate).toHaveBeenCalledWith('JourneyPhase', {
      phase: 'remove',
      destination: 'calm',
    });
  });

  test('"See what\'s next" opens the NEXT phase and mutates nothing', async () => {
    // PHASE_ORDER is remove -> recover, and the destination travels with it so
    // the page renders even if its own read fails.
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdvance });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-advancement')).toBeTruthy());

    fireEvent.press(getByTestId('home-advancement-see-next'));
    expect(mockNavigate).toHaveBeenCalledWith('JourneyPhase', {
      phase: 'recover',
      destination: PHASE.destination,
    });
  });
});

// ---------------------------------------------------------------------------
// SLICE 7d. THE EXPOSURE IS SPENT ON THE RENDERED SLOT.
//
// THESE ARE THE TESTS THAT WOULD HAVE CAUGHT IT, and they have to live at the
// screen because the defect is in the WIRING. The hooks' own suites can only
// prove that each honours the action it is handed; only Home decides what that
// action is, and only Home runs the async weekly read that produced the
// first-frame race. The hook suites and this one are both necessary and
// neither is sufficient.
//
// EVERY TEST BELOW HAS AN ELIGIBLE ADVANCEMENT OFFER. That is what makes them
// mean anything: `placement` is 'today' throughout, so a test that sees no
// exposure is seeing the slot gate work and not an offer that was never due.
// ---------------------------------------------------------------------------
describe('DashboardScreen - the exposure spends on the slot (slice 7d)', () => {
  beforeEach(primeHome);

  /** Advance is due: captured, and entered long enough ago for the ceiling. */
  const dueForAdvance = {
    ...PHASE,
    hasRemoveCapture: true,
    enteredAtIso: '2026-01-01',
  };

  /** Adjust is due too: two consecutive not_moving reads in this phase. */
  const dueForBoth = { ...dueForAdvance, adjustArmedFromIso: '2026-01-01' };

  const twoNotMoving = [
    {
      id: 'w1',
      userId: 'u1',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
    {
      id: 'w2',
      userId: 'u1',
      weekStart: '2026-08-31',
      weekEnd: '2026-09-06',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
  ];

  test('NO exposure while the capture card holds the slot', async () => {
    // Observed on device during 7b's walk: advanceOfferedAt stamped at
    // 13:30:39 while the capture card was on screen at 13:41.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdvance, hasRemoveCapture: false },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('NO exposure while C2 holds the slot', async () => {
    // The half 7b widened. Adjust outranks advance, so the budget drained
    // behind the adjustment card as well as behind the capture card.
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForBoth });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('EXACTLY ONE exposure on a day the advancement card actually draws', async () => {
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdvance });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-advancement')).toBeTruthy());
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
    expect(mockRecordExposure).toHaveBeenCalledWith('u1', '2026-09-10', null);
  });

  test('THE SLOT IS EMPTY WHILE THE WEEKLY READ IS IN FLIGHT, then draws ONE card', async () => {
    // THE FIRST-FRAME RACE, and it is the test a slot gate alone would not
    // pass. With the read deferred, adjust's placement is 'hidden' because it
    // does not know yet - indistinguishable from 'not due' - so before 7d
    // `journeyActionFor` answered 'advance', B2 painted, an exposure was spent,
    // and C2 replaced it a render later. Home now withholds the question until
    // adjust settles: nothing draws, then C2 draws, and B2 never appears at
    // all. NO SWAP is the assertion, and the exposure count is how we know the
    // frame did not happen invisibly.
    let release: (rows: unknown[]) => void = () => {};
    mockGetCyclesSince.mockReturnValue(
      new Promise((resolve) => {
        release = resolve as (rows: unknown[]) => void;
      }) as any
    );
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForBoth });

    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    // The journey line proves Home has rendered the Today block: the slot is
    // empty because it is withheld, not because nothing has mounted yet.
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
    expect(queryByTestId('home-adjustment')).toBeNull();
    expect(queryByTestId('home-remove-capture')).toBeNull();
    expect(mockRecordExposure).not.toHaveBeenCalled();

    await act(async () => {
      release(twoNotMoving);
    });
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());
    expect(queryByTestId('home-advancement')).toBeNull();
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('a FAILED weekly read still releases the slot', async () => {
    // The flag settles on rejection too. Otherwise one dropped request would
    // withhold Today's journey-action card for the rest of the session.
    mockGetCyclesSince.mockRejectedValue(new Error('offline'));
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdvance });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-advancement')).toBeTruthy());
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// SLICE 7d. THE DOOR OPENS ON THE CARD DRAWING, NOT ON ELIGIBILITY.
//
// `adjustOfferedAt` is the phase page's qualification key: JourneyPhaseScreen
// renders "Try a different approach" for the rest of the phase on the strength
// of it. Stamped on eligibility, it unlocked that page for a user who had never
// been shown C2 at all.
// ---------------------------------------------------------------------------
describe('DashboardScreen - the door stamps on the slot (slice 7d)', () => {
  beforeEach(primeHome);

  const dueForAdjust = {
    ...PHASE,
    hasRemoveCapture: true,
    enteredAtIso: '2026-08-01',
    adjustArmedFromIso: '2026-08-01',
  };

  const twoNotMoving = [
    {
      id: 'w1',
      userId: 'u1',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
    {
      id: 'w2',
      userId: 'u1',
      weekStart: '2026-08-31',
      weekEnd: '2026-09-06',
      phaseRead: 'not_moving',
      phaseKeyAtRead: 'remove',
    },
  ];

  test('stamps when C2 draws', async () => {
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: dueForAdjust });
    const { getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-adjustment')).toBeTruthy());
    await waitFor(() => expect(mockRecordAdjustOffered).toHaveBeenCalledWith('u1'));
  });

  test('DOES NOT stamp while the capture card holds the slot', async () => {
    // The reachable case, not a contrived one: a user in `remove` who never
    // made the capture and has told us not_moving twice. Before 7d this
    // unlocked the phase page's door without C2 ever drawing.
    mockGetCyclesSince.mockResolvedValue(twoNotMoving as any);
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...dueForAdjust, hasRemoveCapture: false },
    });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-remove-capture')).toBeTruthy());
    expect(queryByTestId('home-adjustment')).toBeNull();
    expect(mockRecordAdjustOffered).not.toHaveBeenCalled();
  });
});

describe('DashboardScreen - the journey line', () => {
  beforeEach(primeHome);

  test('renders ABOVE the hero, as a text row', async () => {
    // The order is "where am I" then "what should I do today". Asserted by
    // position in the tree rather than by presence, because presence alone
    // would pass for a line rendered underneath the day's action.
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });
    const { getByTestId, toJSON } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());

    // Walked rather than JSON.stringify'd: the rendered tree carries a
    // RefreshControl whose props close a cycle back to their own fiber, so
    // serialising it throws. The walk is depth-first in render order, which is
    // the order the user reads down the screen.
    const ids: string[] = [];
    const walk = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      const id = node.props?.testID;
      if (typeof id === 'string') ids.push(id);
      (node.children ?? []).forEach(walk);
    };
    walk(toJSON());

    const line = ids.indexOf('home-journey-line');
    const hero = ids.indexOf('home-today-hero');
    // Both present, so a -1 from either cannot make the comparison pass.
    expect(line).toBeGreaterThan(-1);
    expect(hero).toBeGreaterThan(-1);
    expect(line).toBeLessThan(hero);
  });

  test('is absent on the legacy path, where there is no phase to name', async () => {
    mockResolveJourney.mockResolvedValue({ target: 'legacy' });
    const { queryByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(queryByTestId('home-journey-line')).toBeNull());
  });
});

describe('DashboardScreen - the Start here Today mount', () => {
  beforeEach(primeHome);

  test('renders nothing while the Today video does not exist', async () => {
    // START_HERE_PATHS.today is null and slice 5c decision 1 makes a null path
    // and a failed resolve the same outcome. The mount is here so that the day
    // the file lands the only change is a string in constants/startHere.ts;
    // until then this is deliberately invisible, and this test says so rather
    // than leaving a reader to wonder whether the mount is wired.
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });
    const { queryByTestId, getByTestId } = render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('home-journey-line')).toBeTruthy());
    expect(queryByTestId('home-start-here')).toBeNull();
  });
});
