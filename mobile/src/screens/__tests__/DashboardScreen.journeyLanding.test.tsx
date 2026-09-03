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
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
const mockGetLatestCycle = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
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
import { render, waitFor } from '@testing-library/react-native';

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

  test('OMITS the summary and the close entry when there is no live week', async () => {
    // A journey user whose week expired: phase, no cycle. The day still
    // renders; the week-shaped furniture does not name a week that is over.
    mockGetLatestCycle.mockResolvedValue({ ...liveCycle, weekEnd: day(-1) });
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-hero')).toBeTruthy());
    expect(queryByTestId('home-today-summary')).toBeNull();
    expect(queryByTestId('home-close-entry')).toBeNull();
  });

  test('DOES NOT PUSH to the weekly open on an expired week', async () => {
    // The one place behavior differs under the flag, asserted rather than
    // discovered on device.
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

  test("a 'legacy' resolution falls back to the CYCLE source", async () => {
    // Rung (d). A user with no derivable destination keeps the surface they
    // already had, sourced from the week exactly as before.
    mockResolveJourney.mockResolvedValue({ target: 'legacy' });
    render(<DashboardScreen />);

    await waitFor(() => expect(lastSource()?.kind).toBe('cycle'));
    expect(lastSource().cycle.id).toBe('c1');
  });
});
