// Good moments on Home (journey slice 8).
//
// THE SUBJECT IS PLACEMENT, AND IT IS THE DECISION THE SLICE MADE. The row sits
// in the unconditional content block, not inside the journey block, which is
// gated on `weeklyLanding.target === 'today' && (cycle || phase)`. The four
// sibling DashboardScreen suites assert nothing below the fold at all, so this
// file is also the first assertion that the region renders.
//
// THE FRESH-ACCOUNT TEST IS THE ONE THAT MATTERS. It renders Home with no
// cycle and no phase, proves the journey block is genuinely ABSENT, and then
// finds the row anyway. Without the absence half it would pass just as well
// against the placement this slice rejected.
//
// The harness is the sibling suites' harness.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => {
    const { View } = jest.requireActual('react-native');
    return <View>{children}</View>;
  },
  SafeAreaInsetsContext: jest.requireActual('react-native-safe-area-context')
    .SafeAreaInsetsContext,
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

// The row and the sheet are NOT mocked: they are the subject. The service
// underneath them is, so no test here can reach Firestore.
//
// The sheet IS wrapped in a render spy, and the reason is a mutation that
// survived without it. `{open && <Sheet visible />}` and
// `<Sheet visible={open} />` are indistinguishable from the rendered output,
// because RN's Modal renders nothing at all when `visible` is false. The spy
// is the only thing that can tell "not mounted" from "mounted and invisible",
// and mounted-always is what the slice was asked not to do.
const mockSheetRendered = jest.fn();
jest.mock('../../components/dashboard/GoodMomentSheet', () => {
  const actual = jest.requireActual('../../components/dashboard/GoodMomentSheet');
  const ReactModule = jest.requireActual('react');
  return {
    ...actual,
    GoodMomentSheet: (props: Record<string, unknown>) => {
      mockSheetRendered(props);
      return ReactModule.createElement(actual.GoodMomentSheet, props);
    },
  };
});

const mockCreateMoment = jest.fn(async () => 'new-moment-id');
jest.mock('../../services/firebase/moments.service', () => ({
  createMoment: (...a: unknown[]) => mockCreateMoment(...(a as [])),
}));

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
    notifOptInCard: null, handleNotifOptIn: jest.fn(),
    handleNotifDismiss: jest.fn(), showEventCodeCard: false,
    eventCodeSheetVisible: false, setEventCodeSheetVisible: jest.fn(),
    handleEventCodeDismiss: jest.fn(), handleEventCodeSuccess: jest.fn(),
    dashboardRoutines: [], routineCompletions: {}, activePlayerRoutine: null,
    routinePlayerVisible: false, handleBeginRoutine: jest.fn(),
    handleCloseRoutinePlayer: jest.fn(), handleRoutineComplete: jest.fn(),
    habits: [], allCompletions: {}, weeklyCompletions: {}, processingHabits: {},
    handleHabitToggle: jest.fn(), noteTarget: null, saveNote: jest.fn(),
    dismissNote: jest.fn(),
  }),
}));

const mockGetFloor = jest.fn();
const mockGetUserPrivate = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: unknown[]) => mockGetFloor(...a),
  getUserPrivate: (...a: unknown[]) => mockGetUserPrivate(...a),
}));
const mockGetLatestCycle = jest.fn();
const mockEnsureCycle = jest.fn();
const mockGetCyclesSince = jest.fn(async () => [] as unknown[]);
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: unknown[]) => mockGetLatestCycle(...a),
  ensureCurrentWeeklyCycle: (...a: unknown[]) => mockEnsureCycle(...a),
  getWeeklyCyclesSince: (...a: unknown[]) => mockGetCyclesSince(...(a as [])),
}));
jest.mock('../../services/firebase/journeyState.service', () => ({
  recordAdvanceExposure: jest.fn(async () => {}),
  recordAdjustOffered: jest.fn(async () => {}),
  recordAdvanceDeclined: jest.fn(async () => {}),
  recordAdjustDeclined: jest.fn(async () => {}),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => {
  const actual = jest.requireActual('../../hooks/useTodayCard');
  return {
    cycleSource: actual.cycleSource,
    phaseSource: actual.phaseSource,
    useTodayCard: () => mockTodayCard(),
  };
});

const mockResolveJourney = jest.fn();
jest.mock('../../journey/resolveJourney', () => ({
  ...jest.requireActual('../../journey/resolveJourney'),
  resolveJourney: (...a: unknown[]) => mockResolveJourney(...a),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import { PROTOCOL_MATRIX } from '../../protocolEngine';

function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const date = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${date}`;
}

const liveCycle = {
  id: 'c1', userId: 'u1', weekStart: day(-2), weekEnd: day(4), outcome: 'focus',
  capacityInitial: 'normal', capacityCurrent: 'normal', protocolId: 'focus-normal',
};

const PHASE = {
  phaseKey: 'remove', destination: 'calm', capacitySeed: 'limited',
  revisionToken: 99, enteredAtIso: '', hasRemoveCapture: true,
  advanceDeclined: false, advanceExposures: 0, advanceFirstOfferedOn: null,
  advanceLastExposedOn: null, adjustArmedFromIso: null, adjustDeclines: 0,
  adjustOffered: false,
};

function todayCard(over: Record<string, unknown> = {}) {
  return {
    protocol: { ...PROTOCOL_MATRIX.refocus.normal[0], quickWinActive: true },
    floorCommitment: null, completed: false, loading: false, failed: false,
    // Rollover safety. The card reads it, so a fixture that omitted it would
    // pass on undefined rather than on a stated value.
    staleDate: false,
    markDone: jest.fn(), saving: false, saveFailed: false, picked: true,
    prefillCapacity: 'normal', prefillTime: 'medium', confirmPick: jest.fn(),
    pickSaving: false, pickFailed: false, consistentDays: 0,
    todayIso: '2026-09-10',
    ...over,
  };
}

/** A journeyed account: live week, resolved phase, the Today block up. */
function primeJourneyed() {
  jest.clearAllMocks();
  mockUseFocusEffect.mockImplementation(() => {});
  mockTodayCard.mockReturnValue(todayCard());
  mockGetFloor.mockResolvedValue('Ten minutes of quiet');
  mockGetLatestCycle.mockResolvedValue(liveCycle);
  mockGetUserPrivate.mockResolvedValue({ weekStartDay: null });
  mockEnsureCycle.mockResolvedValue({ ...liveCycle, id: 'cycle-rolled' });
  mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });
  mockGetCyclesSince.mockResolvedValue([]);
  mockCreateMoment.mockResolvedValue('new-moment-id');
}

/**
 * A SYNTHETIC state: `target === 'today'` with neither a cycle nor a phase, so
 * the journey block's second gate clause is what excludes it.
 *
 * PRODUCTION CANNOT REACH THIS, AND THE NAME SAYS SO BECAUSE THE FIRST NAME DID
 * NOT. It was called "primeFresh" and described as "a fresh account", which is
 * wrong twice over. The landing target here is **`today`**, not `legacy` -
 * `resolveJourney` returns legacy, and `useJourneyLanding:193` then passes the
 * WEEKLY target through unchanged. And `weekly.cycle` is null only because
 * `mockEnsureCycle` returns null, which the real function never does:
 * `ensureCurrentWeeklyCycle` is `Promise<WeeklyCycle>` and THROWS rather than
 * returning null on an absent read-back (`weeklyCycle.service.ts:315`). Every
 * other path to `target === 'today'` requires a non-null `latest`. So in
 * production, `weekly.target === 'today'` always carries a cycle.
 *
 * KEPT ANYWAY, because the clause it pins is real: the gate is
 * `target === 'today' && (cycle || phase)`, and nothing else in the suite
 * exercises the second half. A test asserting an impossible world is fine when
 * it says so and dangerous when it does not.
 *
 * The production-reachable version of "journey block absent" is the fixture
 * below. That is the one that justifies the placement.
 */
function primeSyntheticNoCycleNoPhase() {
  primeJourneyed();
  mockGetLatestCycle.mockResolvedValue(null);
  mockEnsureCycle.mockResolvedValue(null);
  mockResolveJourney.mockResolvedValue({ target: 'legacy' });
}

/**
 * THE PRODUCTION-REACHABLE STATE THIS PLACEMENT EXISTS FOR: the weekly read
 * fails.
 *
 * `useWeeklyLanding`'s catch sets `target: null, cycle: null, failed: true`;
 * `useJourneyLanding` sees a null weekly target, clears its own resolution, and
 * reports `target: null`. The journey block is gated on `target === 'today'`, so
 * it is absent - and Home carries on rendering its ordinary content around it,
 * which is the documented behaviour on a failed read rather than an error
 * screen.
 *
 * Mounted inside the journey block, the Good moments row would vanish for
 * exactly this user. Outside it, it survives. That is the whole argument for
 * the placement, and unlike the synthetic fixture above it is a state a real
 * device can be in.
 */
function primeFailedWeeklyRead() {
  primeJourneyed();
  mockGetFloor.mockRejectedValue(new Error('weekly read failed'));
}

describe('the Good moments row is below the fold, not inside the journey block', () => {
  test('renders in the SYNTHETIC no-cycle-no-phase state (pins the second gate clause)', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);

    // The absence half. Without it this test would pass against the placement
    // the slice rejected, which is the whole point of writing it this way.
    await waitFor(() => expect(queryByTestId('home-today-hero')).toBeNull());
    expect(queryByTestId('home-set-today')).toBeNull();
    expect(queryByTestId('home-start-here')).toBeNull();
    expect(queryByTestId('home-close-entry')).toBeNull();

    // And the row is there anyway.
    expect(getByTestId('good-moment-row')).toBeTruthy();
  });

  test('renders when the weekly read FAILS, which is the reachable case', async () => {
    primeFailedWeeklyRead();
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);

    // The absence half, same shape as above: prove the journey block is
    // genuinely gone before claiming the row survived it.
    await waitFor(() => expect(queryByTestId('good-moment-row')).toBeTruthy());
    expect(queryByTestId('home-today-hero')).toBeNull();
    expect(queryByTestId('home-set-today')).toBeNull();
    expect(queryByTestId('home-start-here')).toBeNull();
    expect(queryByTestId('home-close-entry')).toBeNull();

    // And the row is there anyway. Inside the journey block it would not be,
    // and this user - offline, or with a failed read - is the one who would
    // lose it.
    expect(getByTestId('good-moment-row')).toBeTruthy();
  });

  test('renders on a journeyed account too, alongside the Today block', async () => {
    primeJourneyed();
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('home-today-hero')).toBeTruthy());
    expect(getByTestId('good-moment-row')).toBeTruthy();
  });

  test('is identical on both accounts', async () => {
    primeSyntheticNoCycleNoPhase();
    const fresh = render(<DashboardScreen />);
    await waitFor(() => expect(fresh.getByTestId('good-moment-row')).toBeTruthy());
    const freshLabel = fresh.getByTestId('good-moment-row-label').props.children;
    fresh.unmount();

    primeJourneyed();
    const journeyed = render(<DashboardScreen />);
    await waitFor(() =>
      expect(journeyed.getByTestId('good-moment-row')).toBeTruthy()
    );

    expect(journeyed.getByTestId('good-moment-row-label').props.children).toBe(
      freshLabel
    );
  });
});

describe('the row opens the sheet, and opening writes nothing', () => {
  test('the sheet is not mounted until the row is tapped', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    expect(queryByTestId('good-moment-sheet')).toBeNull();
    // The half that a rendered-output check cannot see: the component was
    // never constructed, not merely constructed and hidden.
    expect(mockSheetRendered).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('good-moment-row'));
    expect(mockSheetRendered).toHaveBeenCalled();
  });

  test('tapping the row opens it', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    fireEvent.press(getByTestId('good-moment-row'));

    expect(getByTestId('good-moment-sheet')).toBeTruthy();
    expect(getByTestId('good-moment-sheet-prompt')).toBeTruthy();
  });

  test('opening the sheet writes NOTHING', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    fireEvent.press(getByTestId('good-moment-row'));

    expect(mockCreateMoment).not.toHaveBeenCalled();
  });

  test('dismissing unmounts the sheet and still writes nothing', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId, queryByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    fireEvent.press(getByTestId('good-moment-row'));
    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'abandoned');
    fireEvent.press(getByTestId('good-moment-sheet-cancel'));

    expect(queryByTestId('good-moment-sheet')).toBeNull();
    expect(mockCreateMoment).not.toHaveBeenCalled();
  });

  test('Save writes once, with the uid and the trimmed text', async () => {
    primeSyntheticNoCycleNoPhase();
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    fireEvent.press(getByTestId('good-moment-row'));
    fireEvent.changeText(getByTestId('good-moment-sheet-input'), '  the good bit  ');
    fireEvent.press(getByTestId('good-moment-sheet-save'));

    await waitFor(() =>
      expect(mockCreateMoment).toHaveBeenCalledWith('u1', 'the good bit')
    );
    expect(mockCreateMoment).toHaveBeenCalledTimes(1);
  });

  test('a failed save keeps the sheet open with the text intact', async () => {
    primeSyntheticNoCycleNoPhase();
    mockCreateMoment.mockRejectedValueOnce(new Error('offline'));
    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('good-moment-row')).toBeTruthy());
    fireEvent.press(getByTestId('good-moment-row'));
    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'the good bit');
    fireEvent.press(getByTestId('good-moment-sheet-save'));

    await waitFor(() => expect(getByTestId('good-moment-sheet-error')).toBeTruthy());
    expect(getByTestId('good-moment-sheet')).toBeTruthy();
    expect(getByTestId('good-moment-sheet-input').props.value).toBe('the good bit');
  });
});
