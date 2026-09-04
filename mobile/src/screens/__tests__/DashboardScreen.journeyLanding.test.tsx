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
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  ensureCurrentWeeklyCycle: (...a: any[]) => mockEnsureCycle(...a),
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
import { act, render, waitFor } from '@testing-library/react-native';

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
    continuity: 3,
    picked: true,
    prefillCapacity: 'normal',
    prefillTime: 'medium',
    confirmPick: jest.fn(),
    pickSaving: false,
    pickFailed: false,
    ...over,
  };
}

/** The source argument Home most recently handed useTodayCard. */
const lastSource = () => mockUseTodayCard.mock.calls.at(-1)?.[1];

describe('DashboardScreen under JOURNEY_IA', () => {
  beforeEach(() => {
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
  });

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
    // Suppressed while the card is up, per the card-ceiling decision.
    expect(queryByTestId('home-continuity')).toBeNull();

    // The capture lands.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: true },
    });
    await act(async () => {
      focusCb?.();
    });

    await waitFor(() => expect(queryByTestId('home-remove-capture')).toBeNull());
    expect(getByTestId('home-continuity')).toBeTruthy();
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
