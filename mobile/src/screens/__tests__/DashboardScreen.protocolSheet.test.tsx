// Home's protocol sheet (slice 9.1b): the entry on the card, the pin, and the
// three things the delta read found a naive sheet would get wrong.
//
//   1. MOUNT. A new day is normally unpicked, so at midnight the hero swaps to
//      the prompt. A sheet mounted inside the picked branch would vanish.
//   2. DONE. The live card's `completed` belongs to whatever day it now shows,
//      so the sheet's done state cannot be read from it.
//   3. SUBSTITUTION. After a reload commits, the live card holds a different
//      protocol. The sheet keeps showing, and completing, what it pinned - or
//      says the plan moved and refuses.
//
// The hook is a fixture here, so the flags are stated rather than lived; the
// real lifecycle runs in usePinnedProtocol.test.ts. EVERY FIXTURE STATES BOTH
// FLAGS, and divergence cases override them rather than rely on a default.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => {
    const { View } = jest.requireActual('react-native');
    return <View>{children}</View>;
  },
  // R2: the screen now reads the safe-area CONTEXT (via useTabBarInset), not
  // only the hook, so a stub of this module has to carry it. Passed through
  // from the real module rather than re-created, so the default value is the
  // library's own null - which is the honest reading here, since this test
  // renders the screen with no SafeAreaProvider above it.
  SafeAreaInsetsContext: jest.requireActual('react-native-safe-area-context').SafeAreaInsetsContext,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { ScrollView: jest.requireActual('react-native').ScrollView },
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
jest.mock('../../components/dashboard/FirstShiftFooter', () => ({
  FirstShiftFooter: () => null,
}));
jest.mock('../../components/events/EventCodeCard', () => ({ EventCodeCard: () => null }));
jest.mock('../../components/events/EventCodeSheet', () => ({ EventCodeSheet: () => null }));

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
  }),
}));

const mockGetFloor = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: unknown[]) => mockGetFloor(...a),
}));
const mockGetLatestCycle = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: unknown[]) => mockGetLatestCycle(...a),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => ({
  // The two source builders are passed through REAL: Home calls them before it
  // calls the hook, and stubbing them out would make this suite pass on wiring
  // that could not run. Only the hook itself is replaced.
  cycleSource: jest.requireActual('../../hooks/useTodayCard').cycleSource,
  phaseSource: jest.requireActual('../../hooks/useTodayCard').phaseSource,
  useTodayCard: () => mockTodayCard(),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));
const mockUpsertDailyLog = jest.fn();
jest.mock('../../services/firebase/dailyLog.service', () => ({
  ...jest.requireActual('../../services/firebase/dailyLog.service'),
  upsertDailyLog: (...a: unknown[]) => mockUpsertDailyLog(...a),
}));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../protocolEngine';

/** A live, unclosed week inside its window, so the guard resolves 'today'. */
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

const confirmPick = jest.fn();

const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';
const REMOVE = { ...PROTOCOL_MATRIX.remove.normal[0], quickWinActive: false };
const REMOVE_OTHER = { ...PROTOCOL_MATRIX.remove.slammed[0], quickWinActive: false };

function todayCard(over: Record<string, unknown> = {}) {
  return {
    protocol: REMOVE,
    todayIso: MONDAY,
    consistentDays: 0,
    floorCommitment: null,
    completed: false,
    loading: false,
    // Rollover safety. The card reads it, so a fixture that omitted it would
    // pass on undefined rather than on a stated value.
    staleDate: false,
    // STALE-SOURCE-COMPLETION. Also read by the card, and stated for the same reason.
    variantStale: false,
    failed: false,
    markDone: jest.fn(),
    saving: false,
    saveFailed: false,
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

/** Re-render Home with the hook now returning something else. */
function rerenderWith(screen: ReturnType<typeof render>, over: Record<string, unknown>) {
  mockTodayCard.mockReturnValue(todayCard(over));
  screen.rerender(<DashboardScreen />);
}

async function openSheet(over: Record<string, unknown> = {}) {
  const screen = await renderHome(over);
  fireEvent.press(await screen.findByTestId('home-today-open-detail'));
  await screen.findByTestId('protocol-sheet');
  return screen;
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockUseFocusEffect.mockReset();
  mockGetFloor.mockReset().mockResolvedValue('ten minutes outside');
  mockGetLatestCycle.mockReset();
  mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
});

describe('the entry', () => {
  test('a Remove protocol opens the sheet, showing why it can help', async () => {
    const screen = await openSheet();
    expect(screen.getByTestId('protocol-sheet-why').props.children).toBe(REMOVE.whyItWorks);
    // Opening writes nothing.
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
  });

  test('a non-Remove protocol has no entry: row 9 is Remove-only', async () => {
    const screen = await renderHome({
      protocol: { ...PROTOCOL_MATRIX.refocus.normal[0], quickWinActive: false },
    });
    await screen.findByTestId('home-today-hero');
    expect(screen.queryByTestId('home-today-open-detail')).toBeNull();
  });

  test.each([['staleDate'], ['variantStale']])(
    'no sheet can be opened while %s is already true',
    async (flag) => {
      const screen = await renderHome({ [flag]: true });
      fireEvent.press(await screen.findByTestId('home-today-open-detail'));
      expect(screen.queryByTestId('protocol-sheet')).toBeNull();
    }
  );
});

describe('the sheet across midnight', () => {
  test('does not vanish when the new day arrives unpicked', async () => {
    const screen = await openSheet();

    // The new day's load has committed: unpicked, a different variant, both
    // flags down. The hero is the prompt now.
    rerenderWith(screen, { todayIso: TUESDAY, picked: false, protocol: REMOVE_OTHER });

    expect(screen.getByTestId('home-set-today')).toBeTruthy();
    expect(screen.getByTestId('protocol-sheet')).toBeTruthy();
    expect(screen.getByTestId('protocol-sheet-action').props.children).toBe(REMOVE.dailyAction);
  });

  test("completes MONDAY with Monday's identity", async () => {
    const screen = await openSheet();
    rerenderWith(screen, { todayIso: TUESDAY, picked: false, protocol: REMOVE_OTHER });

    fireEvent.press(screen.getByTestId('protocol-sheet-complete'));

    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    const [, iso, patch] = mockUpsertDailyLog.mock.calls[0];
    expect(iso).toBe(MONDAY);
    expect(patch.protocolCellId).toBe(REMOVE.id);
    await screen.findByTestId('protocol-sheet-done');
  });

  test('a Monday already done stays done when Tuesday arrives undone', async () => {
    const screen = await openSheet({ completed: true });
    expect(screen.getByTestId('protocol-sheet-done')).toBeTruthy();

    rerenderWith(screen, { todayIso: TUESDAY, completed: false, protocol: REMOVE_OTHER });

    expect(screen.getByTestId('protocol-sheet-done')).toBeTruthy();
    expect(screen.queryByTestId('protocol-sheet-complete')).toBeNull();
  });

  test("a Monday completion does not mark Tuesday's card done", async () => {
    const screen = await openSheet();
    rerenderWith(screen, { todayIso: TUESDAY, protocol: REMOVE_OTHER });

    fireEvent.press(screen.getByTestId('protocol-sheet-complete'));
    await screen.findByTestId('protocol-sheet-done');
    fireEvent.press(screen.getByTestId('protocol-sheet-dismiss'));

    expect(screen.queryByTestId('protocol-sheet')).toBeNull();
    expect(screen.getByTestId('home-today-complete')).toBeTruthy();
    expect(screen.queryByTestId('home-today-done')).toBeNull();
  });
});

describe('the sheet across a same-day variant change', () => {
  test('after the reload commits: the content stays, completion is replaced by the explanation', async () => {
    const screen = await openSheet();

    // THE WINDOW FIRST, then the commit: flag up, then down with a new cell.
    rerenderWith(screen, { variantStale: true });
    expect(screen.getByTestId('protocol-sheet-complete').props.accessibilityState).toEqual({
      disabled: true,
    });
    rerenderWith(screen, { variantStale: false, protocol: REMOVE_OTHER });

    expect(screen.getByTestId('protocol-sheet-diverged')).toBeTruthy();
    expect(screen.queryByTestId('protocol-sheet-complete')).toBeNull();
    expect(screen.getByTestId('protocol-sheet-action').props.children).toBe(REMOVE.dailyAction);
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();

    // Not dismissed automatically; the user closes it.
    fireEvent.press(screen.getByTestId('protocol-sheet-dismiss'));
    expect(screen.queryByTestId('protocol-sheet')).toBeNull();
  });
});

describe('completion on the same day', () => {
  test('shows on the card underneath without a reload', async () => {
    const screen = await openSheet();
    fireEvent.press(screen.getByTestId('protocol-sheet-complete'));
    await screen.findByTestId('protocol-sheet-done');
    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    expect(mockUpsertDailyLog.mock.calls[0][1]).toBe(MONDAY);

    fireEvent.press(screen.getByTestId('protocol-sheet-dismiss'));
    // The hook fixture still says not completed; the card is done anyway.
    expect(screen.getByTestId('home-today-done')).toBeTruthy();
  });

  test('a failed write leaves neither the sheet nor the card falsely done', async () => {
    mockUpsertDailyLog.mockRejectedValueOnce(new Error('offline'));
    const screen = await openSheet();
    await act(async () => {
      fireEvent.press(screen.getByTestId('protocol-sheet-complete'));
    });

    await screen.findByTestId('protocol-sheet-error');
    expect(screen.queryByTestId('protocol-sheet-done')).toBeNull();
    fireEvent.press(screen.getByTestId('protocol-sheet-dismiss'));
    expect(screen.queryByTestId('home-today-done')).toBeNull();
    expect(screen.getByTestId('home-today-complete')).toBeTruthy();
  });
});
