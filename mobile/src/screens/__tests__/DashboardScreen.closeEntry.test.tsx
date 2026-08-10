// Home's weekly-close entry — does the week read as closed once it is?
//
// THE BUG THIS PINS. closeWeeklyCycle writes closeCompletedAt
// (weeklyCycle.service.ts:340) and, before this slice, nothing in the app read
// it. So after closing, the entry was still on Home and still tappable: the
// close felt like a loop with no completion, and there was no way to tell
// whether it had landed.
//
// THE REAL GUARD RUNS IN THIS FILE. useWeeklyLanding used to be mocked here,
// which meant the tests asserted what Home draws for a target rather than
// whether Home can ever REACH that target — and during the boundary rework
// that gap briefly hid a real regression: a closed cycle resolved to 'open',
// making the acknowledgment below unreachable on a device while every test
// here stayed green. The hook and resolveWeeklyEntry now run for real, and the
// Firestore reads underneath them are what is stubbed instead. useTodayCard
// stays mocked: the day's action is not what these cover.
//
// So a closed cycle reaching the acknowledgment is now evidence about the app,
// not about the mock.

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

// The two reads useWeeklyLanding performs. Mocking HERE rather than mocking the
// hook is what keeps the real guard in the loop.
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

const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => ({
  useTodayCard: () => mockTodayCard(),
}));
const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../weeklyEngine';
import { addDaysIso, toIsoDate } from '../../utils/weekStart';

// The guard reads the real clock, so windows are built relative to today.
const TODAY = toIsoDate(new Date());
const day = (offset: number) => addDaysIso(TODAY, offset);

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'cycle-1',
  userId: 'u1',
  // A live window by default: started two days ago, ends in four.
  weekStart: day(-2),
  weekEnd: day(4),
  outcome: 'focus',
  capacityInitial: 'normal',
  capacityCurrent: 'normal',
  protocolId: 'focus-normal',
  ...over,
});

/**
 * Render Home and let the real guard resolve. Async because the two reads it
 * makes are, which is itself part of what this now covers.
 */
async function renderHome(over: Record<string, unknown> = {}) {
  mockGetLatestCycle.mockResolvedValue(cycle(over));
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
  const screen = render(<DashboardScreen />);
  // The weekly surface only mounts once the guard has answered.
  await waitFor(() => expect(mockGetLatestCycle).toHaveBeenCalled());
  return screen;
}

const CLOSED_AT = { seconds: 1, nanoseconds: 0 };

describe('Home — the weekly-close entry', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogEvent.mockReset();
    mockUseFocusEffect.mockReset();
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockGetLatestCycle.mockReset();
  });

  describe('while the week is open', () => {
    test('offers the close as a tappable entry', async () => {
      const screen = await renderHome();

      expect(await screen.findByTestId('home-close-entry')).toBeTruthy();
      expect(screen.queryByTestId('home-week-closed')).toBeNull();
    });

    test('offers the capacity re-set', async () => {
      // The control for the retirement assertion below: the re-set is present
      // on an open week, so its absence on a closed one is the close acting and
      // not the card failing to render.
      const screen = await renderHome();

      expect(await screen.findByTestId('home-reset')).toBeTruthy();
    });

    test('opening it fires the intent event and then navigates', async () => {
      const order: string[] = [];
      mockLogEvent.mockImplementation(() => order.push('event'));
      mockNavigate.mockImplementation(() => order.push('navigate'));
      const screen = await renderHome();

      fireEvent.press(await screen.findByTestId('home-close-entry'));

      expect(order).toEqual(['event', 'navigate']);
      expect(mockNavigate).toHaveBeenCalledWith('WeeklyClose');
    });
  });

  describe('once the week is closed, still inside its window', () => {
    test('the real guard still resolves Today, so the acknowledgment is reachable', async () => {
      // The assertion the mocked version could not make. Home renders
      // CloseWeekEntry only under target === 'today', so this passing means
      // resolveWeeklyEntry genuinely returned 'today' for a CLOSED cycle.
      const screen = await renderHome({ closeCompletedAt: CLOSED_AT });

      expect(await screen.findByTestId('home-week-closed')).toBeTruthy();
      expect(screen.queryByTestId('home-close-entry')).toBeNull();
    });

    test('does NOT push the user into the weekly open', async () => {
      // Home's focus latch (DashboardScreen.tsx) navigates on any non-'today'
      // target. Closing must not trip it: the user would be shoved into next
      // week's setup the instant they finished reviewing this one.
      await renderHome({ closeCompletedAt: CLOSED_AT });

      await waitFor(() => expect(mockGetLatestCycle).toHaveBeenCalled());
      expect(mockNavigate).not.toHaveBeenCalledWith('WeeklyOpen');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('the week cannot be closed a second time from Home', async () => {
      // A second close is a legal re-updateDoc that overwrites the first with a
      // fresh closeCompletedAt. Nothing on Home may offer it.
      const screen = await renderHome({ closeCompletedAt: CLOSED_AT });

      await screen.findByTestId('home-week-closed');
      expect(screen.queryByTestId('home-close-entry')).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('the capacity re-set RETIRES', async () => {
      // Re-planning a week the user has already reviewed is the one control
      // that contradicts "closed": the close records how the week went, and
      // changing its capacity afterwards rewrites the thing just reported on.
      const screen = await renderHome({ closeCompletedAt: CLOSED_AT });

      await screen.findByTestId('home-week-closed');
      expect(screen.queryByTestId('home-reset')).toBeNull();
    });

    test('the day is still completable, so the closed week is not a dead end', async () => {
      // The close is a weekly ritual; today's action is a daily one and does
      // not stop because the week has been reviewed.
      const screen = await renderHome({ closeCompletedAt: CLOSED_AT });

      expect(await screen.findByTestId('home-today-complete')).toBeTruthy();
    });
  });

  describe('once the week has EXPIRED', () => {
    test('a closed, expired week offers the open instead of the acknowledgment', async () => {
      // The other half of the split: expiry is what routes the user onward.
      const screen = await renderHome({
        weekStart: day(-9),
        weekEnd: day(-1),
        closeCompletedAt: CLOSED_AT,
      });

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('WeeklyOpen')
      );
      expect(screen.queryByTestId('home-week-closed')).toBeNull();
      expect(screen.queryByTestId('home-close-entry')).toBeNull();
    });

    test('an unclosed, expired week behaves identically', async () => {
      // Closed-ness changes nothing once the window has passed.
      await renderHome({ weekStart: day(-9), weekEnd: day(-1) });

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('WeeklyOpen')
      );
    });
  });
});
