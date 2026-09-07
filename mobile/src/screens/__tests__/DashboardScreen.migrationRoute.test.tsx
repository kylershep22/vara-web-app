// Home shows A2 to a just-migrated user, ONCE, and to nobody else.
//
// THE ONCE-ONLY GUARD IS THE RESOLVER'S, and resolveJourney.test.ts pins it
// directly: `migratedFrom` is set only on the resolve that CREATES
// journeyStates. What this file pins is the other half, that Home actually
// branches on the signal, stops when it clears, and never shows the screen to a
// user who is not migrating.
//
// resolveJourney is mocked and useJourneyLanding is NOT. Mocking the hook would
// let the two disagree about the field's name or its null-vs-undefined shape
// and still pass; running the real hook is what makes this a wiring test.
//
// The mock harness below is the sibling DashboardScreen suites' harness.

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
import { render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';

jest.mock('../journey/MigrationRouteScreen', () => ({
  MigrationRouteScreen: ({ destination, phaseKey, onContinue }: any) => {
    const { Text, TouchableOpacity, View } = require('react-native');
    return (
      <View>
        <Text testID="mig-destination">{destination}</Text>
        <Text testID="mig-phase">{phaseKey}</Text>
        <TouchableOpacity testID="mig-continue" onPress={onContinue}>
          <Text>start</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
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
};

const PHASE = {
  phaseKey: 'remove',
  destination: 'calm',
  capacitySeed: 'limited',
  revisionToken: 99,
  enteredAtIso: '',
  hasRemoveCapture: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFocusEffect.mockImplementation(() => {});
  mockGetFloor.mockResolvedValue('ten minutes outside');
  mockGetUserPrivate.mockResolvedValue({ uid: 'u1', capacitySeed: 'limited' });
  mockGetLatestCycle.mockResolvedValue(liveCycle);
  mockEnsureCycle.mockResolvedValue(liveCycle);
  mockTodayCard.mockReturnValue({
    picked: false,
    protocol: null,
    completed: false,
    saving: false,
    floorCommitment: null,
    loading: false,
  });
});

describe('the post-migration route explanation', () => {
  test('renders in place of Home when the resolver reports a migration', async () => {
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: PHASE,
      migratedFrom: 'migration_cycle',
    });

    const screen = render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByTestId('mig-destination')).toBeTruthy());
    expect(screen.getByTestId('mig-destination').props.children).toBe('calm');
    expect(screen.getByTestId('mig-phase').props.children).toBe('remove');
  });

  test('the destination comes from the journey, not from the legacy cycle', async () => {
    // The seeded cycle says outcome 'focus'. The created journey says
    // destination 'calm'. Home must render what the journey says: reading the
    // cycle here would show a user the wrong route, in the exact vocabulary the
    // journey model replaced.
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: PHASE,
      migratedFrom: 'migration_cycle',
    });

    const screen = render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByTestId('mig-destination')).toBeTruthy());
    expect(screen.getByTestId('mig-destination').props.children).not.toBe('focus');
  });

  test('does NOT render for a user already on the journey', async () => {
    // The overwhelming majority of launches. If this ever renders, every
    // journey user meets the explanation every time they open the app.
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });

    const screen = render(<DashboardScreen />);

    await waitFor(() => expect(mockResolveJourney).toHaveBeenCalled());
    expect(screen.queryByTestId('mig-destination')).toBeNull();
  });

  test('does NOT render on the legacy path, where there is no phase', async () => {
    mockResolveJourney.mockResolvedValue({ target: 'legacy' });

    const screen = render(<DashboardScreen />);

    await waitFor(() => expect(mockResolveJourney).toHaveBeenCalled());
    expect(screen.queryByTestId('mig-destination')).toBeNull();
  });
});
