// Home's two Today states — before and after the day is answered (3b-ii-b).
//
// OPTION A: the pick gates the HERO and nothing else. Unpicked, the whole hero
// is the prompt, so there is no protocol title, no quick win and no completion
// control, because there is no day's action to complete until the user says
// what today is. Everything BELOW the hero answers to the week rather than to
// the day and must render identically in both states.
//
// That last part is the regression this file exists for. The gate used to
// include `todayCard.protocol`, so a null protocol blanked the continuity count
// and the weekly close entry along with the hero.

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

const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => ({
  useTodayCard: () => mockTodayCard(),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../weeklyEngine';

/** A live, unclosed week inside its window, so the guard resolves 'today'. */
function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const confirmPick = jest.fn();

function todayCard(over: Record<string, unknown> = {}) {
  return {
    protocol: { ...PROTOCOL_MATRIX.focus.normal[0], quickWinActive: true },
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
    confirmPick,
    pickSaving: false,
    pickFailed: false,
    ...over,
  };
}

async function renderHome(over: Record<string, unknown> = {}) {
  mockGetLatestCycle.mockResolvedValue({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: day(-2),
    weekEnd: day(4),
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
  });
  mockTodayCard.mockReturnValue(todayCard(over));
  const screen = render(<DashboardScreen />);
  await waitFor(() => expect(mockGetLatestCycle).toHaveBeenCalled());
  return screen;
}

describe('Home — before the day is answered', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    confirmPick.mockReset();
    mockUseFocusEffect.mockReset();
    // A floor commitment is REQUIRED for the guard to reach the cycle read at
    // all: useWeeklyLanding short-circuits to 'floor' without one, and the
    // Today surface never mounts.
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockGetLatestCycle.mockReset();
  });

  test('the hero is the prompt', async () => {
    const screen = await renderHome({ picked: false });

    expect(await screen.findByTestId('home-set-today')).toBeTruthy();
    expect(screen.queryByTestId('home-today-hero')).toBeNull();
  });

  test('there is no day action, quick win, or completion control', async () => {
    // The three things that only mean something once today has been said.
    const screen = await renderHome({ picked: false });

    await screen.findByTestId('home-set-today');
    expect(screen.queryByTestId('home-today-action')).toBeNull();
    expect(screen.queryByTestId('home-today-quickwin')).toBeNull();
    expect(screen.queryByTestId('home-today-complete')).toBeNull();
  });

  test('everything BELOW the hero still renders', async () => {
    // The regression guard. These answer to the week, not to the day.
    const screen = await renderHome({ picked: false });

    await screen.findByTestId('home-set-today');
    expect(screen.getByTestId('home-continuity')).toBeTruthy();
    expect(screen.getByTestId('home-close-entry')).toBeTruthy();
  });

  test('stays the prompt even when a protocol has already resolved', async () => {
    // The hook resolves a protocol from the SEEDED capacity whether or not the
    // user has answered. The prompt keys on `picked`, never on the protocol
    // being present, or a seeded day would silently skip the picker.
    const screen = await renderHome({
      picked: false,
      protocol: { ...PROTOCOL_MATRIX.focus.slammed[0], quickWinActive: false },
    });

    expect(await screen.findByTestId('home-set-today')).toBeTruthy();
    expect(screen.queryByTestId('home-today-hero')).toBeNull();
  });

  describe('the sheet', () => {
    test('is closed until the prompt is tapped', async () => {
      const screen = await renderHome({ picked: false });

      await screen.findByTestId('home-set-today');
      expect(screen.queryByTestId('daily-pick-confirm')).toBeNull();
    });

    test('opens on the prompt, and opening it writes nothing', async () => {
      // CONFIRM-WRITES-ONLY, at the surface level. Opening the sheet must not
      // report an answer: hasPickedToday keys on the stored time field, so a
      // write here would mark the day picked because it was looked at.
      const screen = await renderHome({ picked: false });

      fireEvent.press(await screen.findByTestId('home-set-today-open'));

      expect(await screen.findByTestId('daily-pick-confirm')).toBeTruthy();
      expect(confirmPick).not.toHaveBeenCalled();
    });

    test('skipping closes it and still writes nothing', async () => {
      const screen = await renderHome({ picked: false });
      fireEvent.press(await screen.findByTestId('home-set-today-open'));
      await screen.findByTestId('daily-pick-confirm');

      fireEvent.press(screen.getByTestId('daily-pick-skip'));

      await waitFor(() => expect(screen.queryByTestId('daily-pick-confirm')).toBeNull());
      expect(confirmPick).not.toHaveBeenCalled();
      // And the prompt is still there, because the day is still unanswered.
      expect(screen.getByTestId('home-set-today')).toBeTruthy();
    });

    test('confirming reports the answer exactly once', async () => {
      const screen = await renderHome({ picked: false });
      fireEvent.press(await screen.findByTestId('home-set-today-open'));

      fireEvent.press(await screen.findByTestId('daily-pick-confirm'));

      await waitFor(() => expect(confirmPick).toHaveBeenCalledTimes(1));
      // The pre-fill, accepted in one tap.
      expect(confirmPick).toHaveBeenCalledWith('normal', 'medium');
    });

    test('skipping leaves the day unpicked and the prompt standing', async () => {
      // SKIP IS A RESTING STATE, NOT A DEAD END. Nothing is written, nothing is
      // guessed, and the card that invited the answer is still there to invite
      // it again. It is also not a failure: no error affordance appears.
      const screen = await renderHome({ picked: false });
      fireEvent.press(await screen.findByTestId('home-set-today-open'));

      fireEvent.press(await screen.findByTestId('daily-pick-skip'));

      await waitFor(() => expect(screen.queryByTestId('daily-pick-confirm')).toBeNull());
      expect(confirmPick).not.toHaveBeenCalled();
      expect(screen.getByTestId('home-set-today')).toBeTruthy();
      expect(screen.getByTestId('home-set-today-open')).toBeTruthy();
      expect(screen.queryByTestId('home-today-hero')).toBeNull();
    });

    test('reopens after a skip, still pre-filled, and confirms normally', async () => {
      // RE-ENGAGEMENT IS FRICTIONLESS. Skipping touched nothing, so the
      // fast-path pre-fill is exactly what it was: the second visit is the
      // same one-tap confirm the first would have been.
      const screen = await renderHome({
        picked: false,
        prefillCapacity: 'limited',
        prefillTime: 'long',
      });

      fireEvent.press(await screen.findByTestId('home-set-today-open'));
      fireEvent.press(await screen.findByTestId('daily-pick-skip'));
      await waitFor(() => expect(screen.queryByTestId('daily-pick-confirm')).toBeNull());

      // Straight back in.
      fireEvent.press(screen.getByTestId('home-set-today-open'));
      const reopened = await screen.findByTestId('daily-pick-capacity-limited');
      expect(reopened.props.accessibilityState.selected).toBe(true);
      expect(
        screen.getByTestId('daily-pick-time-long').props.accessibilityState.selected
      ).toBe(true);

      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      await waitFor(() => expect(confirmPick).toHaveBeenCalledTimes(1));
      expect(confirmPick).toHaveBeenCalledWith('limited', 'long');
    });

    test('a skipped, reopened sheet forgets what was tapped and abandoned', async () => {
      // The sheet unmounts on skip, so a stray tap the user walked away from
      // does not become the answer they confirm hours later. Reopening always
      // starts from the pre-fill.
      const screen = await renderHome({
        picked: false,
        prefillCapacity: 'normal',
        prefillTime: 'medium',
      });

      fireEvent.press(await screen.findByTestId('home-set-today-open'));
      fireEvent.press(await screen.findByTestId('daily-pick-capacity-slammed'));
      fireEvent.press(screen.getByTestId('daily-pick-skip'));
      await waitFor(() => expect(screen.queryByTestId('daily-pick-confirm')).toBeNull());

      fireEvent.press(screen.getByTestId('home-set-today-open'));
      const reopened = await screen.findByTestId('daily-pick-capacity-normal');
      expect(reopened.props.accessibilityState.selected).toBe(true);
    });

    test('opens pre-filled with what the hook resolved', async () => {
      const screen = await renderHome({
        picked: false,
        prefillCapacity: 'slammed',
        prefillTime: 'short',
      });
      fireEvent.press(await screen.findByTestId('home-set-today-open'));

      const chosen = await screen.findByTestId('daily-pick-capacity-slammed');
      expect(chosen.props.accessibilityState.selected).toBe(true);
      expect(
        screen.getByTestId('daily-pick-time-short').props.accessibilityState.selected
      ).toBe(true);
    });
  });
});

describe('Home — once the day is answered', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    confirmPick.mockReset();
    mockUseFocusEffect.mockReset();
    // A floor commitment is REQUIRED for the guard to reach the cycle read at
    // all: useWeeklyLanding short-circuits to 'floor' without one, and the
    // Today surface never mounts.
    mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
    mockGetLatestCycle.mockReset();
  });

  test('the hero is the day action again', async () => {
    const screen = await renderHome({ picked: true });

    expect(await screen.findByTestId('home-today-hero')).toBeTruthy();
    expect(screen.queryByTestId('home-set-today')).toBeNull();
  });

  test('the quick win and the completion control are back', async () => {
    const screen = await renderHome({ picked: true });

    await screen.findByTestId('home-today-hero');
    expect(screen.getByTestId('home-today-action')).toBeTruthy();
    expect(screen.getByTestId('home-today-quickwin')).toBeTruthy();
    expect(screen.getByTestId('home-today-complete')).toBeTruthy();
  });

  test('everything below the hero is unchanged by the pick', async () => {
    const screen = await renderHome({ picked: true });

    await screen.findByTestId('home-today-hero');
    expect(screen.getByTestId('home-continuity')).toBeTruthy();
    expect(screen.getByTestId('home-close-entry')).toBeTruthy();
  });
});
