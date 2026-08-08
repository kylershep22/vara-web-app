// Home's weekly-close entry — does the week read as closed once it is?
//
// THE BUG THIS PINS. closeWeeklyCycle writes closeCompletedAt
// (weeklyCycle.service.ts:340) and, before this slice, nothing in the app read
// it. So after closing, the entry was still on Home and still tappable: the
// close felt like a loop with no completion, and there was no way to tell
// whether it had landed.
//
// Everything below the gate is stubbed. useWeeklyLanding and useTodayCard are
// mocked precisely so the CYCLE'S CLOSED-STATE is the only variable, and the
// swap is the only real logic under test.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { ScrollView: require('react-native').ScrollView },
}));
// db null short-circuits the firstShiftAt subscription, which would otherwise
// reach for `doc` — a member the global firebase/firestore mock does not carry.
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

// Everything on Home that is not the weekly surface.
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

const mockLanding = jest.fn();
jest.mock('../../hooks/useWeeklyLanding', () => ({
  useWeeklyLanding: () => mockLanding(),
}));
const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => ({
  useTodayCard: () => mockTodayCard(),
}));
const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../weeklyEngine';

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'cycle-1',
  userId: 'u1',
  weekStart: '2026-08-03',
  outcome: 'focus',
  capacityInitial: 'normal',
  capacityCurrent: 'normal',
  protocolId: 'focus-normal',
  ...over,
});

/** Render Home on a resolved 'today' week, open or closed. */
function renderHome(over: Record<string, unknown> = {}) {
  mockLanding.mockReturnValue({
    target: 'today',
    cycle: cycle(over),
    loading: false,
    failed: false,
    refresh: jest.fn(),
  });
  mockTodayCard.mockReturnValue({
    protocol: { ...PROTOCOL_MATRIX.focus.normal, quickWinActive: false },
    floorCommitment: null,
    completed: false,
    loading: false,
    failed: false,
    markDone: jest.fn(),
    saving: false,
    saveFailed: false,
    continuity: 0,
    changeTier: jest.fn(),
    resetting: false,
    resetFailed: false,
  });
  return render(<DashboardScreen />);
}

describe('Home — the weekly-close entry', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogEvent.mockReset();
    mockUseFocusEffect.mockReset();
  });

  describe('while the week is open', () => {
    test('offers the close as a tappable entry', () => {
      const screen = renderHome();

      expect(screen.getByTestId('home-close-entry')).toBeTruthy();
      expect(screen.queryByTestId('home-week-closed')).toBeNull();
    });

    test('opening it fires the intent event and then navigates', () => {
      const order: string[] = [];
      mockLogEvent.mockImplementation(() => order.push('event'));
      mockNavigate.mockImplementation(() => order.push('navigate'));
      const screen = renderHome();

      fireEvent.press(screen.getByTestId('home-close-entry'));

      expect(order).toEqual(['event', 'navigate']);
      expect(mockNavigate).toHaveBeenCalledWith('WeeklyClose');
    });
  });

  describe('once the week is closed', () => {
    const closedAt = { seconds: 1, nanoseconds: 0 };

    test('the entry is replaced by an acknowledgment', () => {
      const screen = renderHome({ closeCompletedAt: closedAt });

      expect(screen.getByTestId('home-week-closed')).toBeTruthy();
      expect(screen.queryByTestId('home-close-entry')).toBeNull();
    });

    test('the week cannot be closed a second time from Home', () => {
      // A second close is a legal re-updateDoc that overwrites the first with a
      // fresh closeCompletedAt. Nothing on Home may offer it.
      const screen = renderHome({ closeCompletedAt: closedAt });

      expect(screen.queryByTestId('home-close-entry')).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('the day is still completable, so the closed week is not a dead end', () => {
      // The close is a weekly ritual; today's action is a daily one and does
      // not stop because the week has been reviewed.
      const screen = renderHome({ closeCompletedAt: closedAt });

      expect(screen.getByTestId('home-today-complete')).toBeTruthy();
    });
  });
});
