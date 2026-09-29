// Today's STRUCTURAL contracts (R3a): the immersive ground, and the render-time
// semantics the redesign must not disturb.
//
// READ THIS BEFORE ADDING AN ASSERTION, on the ConversationsScreen.geometry
// precedent. RNTL has no layout engine: no Yoga pass, no frame, no pixels.
// Nothing here can see that the artwork is visible, that a surface is legible
// over it, or where the fold falls. THE PROOF OF THOSE IS THE WALK, at
// docs/walks/r3a/WALK.md. What this file pins is the structure the walked
// result is built from, so an edit that would undo it goes red in CI rather
// than surviving to a device.
//
// THE SIX SIBLING SUITES ARE UNCHANGED, deliberately. This harness differs from
// theirs in exactly the places a structural assertion needs:
//   - SafeAreaView FORWARDS style and edges (theirs drops both).
//   - ScreenHeader is a SPY, not a null stub.
//   - TodayHeroCard renders for real THROUGH a recorder, so every commit's
//     props are captured alongside the hook state that produced them.
//   - LoadingSpinner is a recorder, and useDashboard's loading flag is settable.
//   - GuidePill is a pressable stand-in, so it counts as the actionable chrome
//     it is.
//
// COVERAGE LIMITS, NAMED RATHER THAN IMPLIED:
//   1. HERO-INTERNAL MIRRORING IS OUT OF COVERAGE. The per-commit checks below
//      prove Home passes the hook's stale flags through on every commit. They
//      cannot see a TodayHeroCard that copies those props into effect-driven
//      local state: RNTL wraps render and rerender in act(), which flushes
//      effects, so a mirror has converged before any assertion runs. Closing
//      that needs instrumentation inside the card, and the card's internals
//      belong to TODAYCARD-EXTRACTION, not R3a.
//   2. MEMOIZATION OVER AN UNENUMERATED INPUT IS OUT OF COVERAGE. The
//      single-input rerenders below cover staleDate, variantStale and
//      completed. A useMemo, useCallback or React.memo comparator that omits
//      any other input, in the card or in Home, passes here. Also
//      TODAYCARD-EXTRACTION's.
//   3. CONTRACT (d), SURFACES READ THE TOKEN, IS NOT HERE YET. It lands with
//      the token, which is held on the standards 3.3 ownership question.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
}));
jest.mock('react-native-safe-area-context', () => ({
  // FORWARDS style AND edges, unlike the sibling suites. Contract (b) reads
  // both off this node.
  SafeAreaView: ({ children, style, edges }: any) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View testID="today-safe-area" style={style} edges={edges}>
        {children}
      </View>
    );
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

const mockSpinnerProps = jest.fn();
jest.mock('../../components', () => ({
  LoadingSpinner: (props: any) => {
    mockSpinnerProps(props);
    return null;
  },
}));
jest.mock('../../components/ai/GuidePill', () => ({
  // A pressable stand-in, so contract (f) sees the header chrome as the
  // actionable element it is on device.
  GuidePill: () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return <TouchableOpacity accessibilityRole="button" testID="home-guide" />;
  },
}));
// Contract (c)'s runtime half. The source-boundary half below is the one that
// carries weight: a spy on a module Home does not import is trivially uncalled.
const mockScreenHeader = jest.fn();
jest.mock('../../components/shared/ScreenHeader', () => ({
  ScreenHeader: (props: any) => {
    mockScreenHeader(props);
    return null;
  },
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

// Every render of the hero, with the hook state Home read on that same render.
// The card itself renders for real underneath the recorder.
const mockHeroRenders: Array<{ props: any; hook: any }> = [];
let mockCurrentHook: any = null;
jest.mock('../../components/dashboard/TodayHeroCard', () => {
  const actual = jest.requireActual('../../components/dashboard/TodayHeroCard');
  const ReactModule = jest.requireActual('react');
  return {
    ...actual,
    TodayHeroCard: (props: any) => {
      mockHeroRenders.push({ props, hook: mockCurrentHook });
      return ReactModule.createElement(actual.TodayHeroCard, props);
    },
  };
});

const mockNavigate = jest.fn();
let mockDataLoading = false;
jest.mock('../../hooks/useDashboard', () => ({
  useDashboard: () => ({
    navigation: { navigate: mockNavigate },
    dataLoading: mockDataLoading,
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
  getFloorCommitment: (...a: unknown[]) => mockGetFloor(...a),
  getUserPrivate: (...a: unknown[]) => mockGetUserPrivate(...a),
}));
const mockGetLatestCycle = jest.fn();
const mockEnsureCycle = jest.fn();
const mockGetCyclesSince = jest.fn(async () => [] as any[]);
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

// The hook is a fixture. What it returned on each render is kept, so the hero
// recorder can pair every commit's props with the state that produced them.
const mockTodayCard = jest.fn();
jest.mock('../../hooks/useTodayCard', () => {
  const actual = jest.requireActual('../../hooks/useTodayCard');
  return {
    cycleSource: actual.cycleSource,
    phaseSource: actual.phaseSource,
    useTodayCard: () => {
      mockCurrentHook = mockTodayCard();
      return mockCurrentHook;
    },
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
import fs from 'fs';
import path from 'path';
import { StyleSheet } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PROTOCOL_MATRIX } from '../../protocolEngine';
import { Colors } from '../../constants';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'DashboardScreen.tsx'), 'utf8');

/** LOCAL date parts, on the sibling suites' reasoning. */
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
  advanceDeclined: false,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  adjustArmedFromIso: null,
  adjustDeclines: 0,
  adjustOffered: false,
};

/** Every fixture states both stale flags; none relies on a default. */
function todayCard(over: Record<string, unknown> = {}) {
  return {
    protocol: { ...PROTOCOL_MATRIX.refocus.normal[0], quickWinActive: false },
    floorCommitment: null,
    completed: false,
    loading: false,
    staleDate: false,
    variantStale: false,
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
    consistentDays: 0,
    todayIso: day(0),
    ...over,
  };
}

function primeHome() {
  jest.clearAllMocks();
  mockHeroRenders.length = 0;
  mockCurrentHook = null;
  mockDataLoading = false;
  mockUseFocusEffect.mockImplementation(() => {});
  mockTodayCard.mockReturnValue(todayCard());
  mockGetFloor.mockResolvedValue('Ten minutes of quiet');
  mockGetLatestCycle.mockResolvedValue(liveCycle);
  mockGetUserPrivate.mockResolvedValue({ weekStartDay: null });
  mockEnsureCycle.mockResolvedValue({ ...liveCycle, id: 'cycle-rolled' });
  mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });
  mockGetCyclesSince.mockResolvedValue([]);
}

/** Depth-first, in render order: the order the user reads down the screen. */
function flatten(node: any, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out));
    return out;
  }
  out.push(node);
  (node.children ?? []).forEach((n: any) => flatten(n, out));
  return out;
}

const contains = (node: any, pred: (n: any) => boolean) => flatten(node).some(pred);
const isButton = (n: any) => n.props?.accessibilityRole === 'button';
const hasTestId = (id: string) => (n: any) => n.props?.testID === id;

async function renderToday() {
  const screen = render(<DashboardScreen />);
  await waitFor(() => expect(screen.getByTestId('home-today-hero')).toBeTruthy());
  return screen;
}

const completeDisabled = (screen: ReturnType<typeof render>) =>
  screen.getByTestId('home-today-complete').props.accessibilityState?.disabled;

describe('the immersive ground', () => {
  beforeEach(primeHome);

  test('(a) the layer exists, comes before the ScrollView, and fills the screen', async () => {
    const screen = await renderToday();
    const nodes = flatten(screen.toJSON());
    const ground = nodes.findIndex(hasTestId('today-ground'));
    const scroll = nodes.findIndex((n) => n.type === 'RCTScrollView');

    // Both present, so a -1 cannot make the ordering pass.
    expect(ground).toBeGreaterThan(-1);
    expect(scroll).toBeGreaterThan(-1);
    expect(ground).toBeLessThan(scroll);

    const layer = nodes[ground];
    expect(layer.type).toBe('Image');
    expect(StyleSheet.flatten(layer.props.style)).toEqual(StyleSheet.absoluteFillObject);
    expect(layer.props.contentFit).toBe('cover');
    expect(layer.props.transition).toBe(0);
  });

  test('(a) the layer sits OUTSIDE the safe-area container (Option B)', async () => {
    const screen = await renderToday();
    const safeArea = screen.getByTestId('today-safe-area');
    // Not a descendant: whatever the safe area's padding does, the layer is not
    // inside the box it pads.
    expect(contains(safeArea, hasTestId('today-ground'))).toBe(false);
  });

  test('(b) the content container is transparent and keeps edges top', async () => {
    const screen = await renderToday();
    const safeArea = screen.getByTestId('today-safe-area');
    const bg = StyleSheet.flatten(safeArea.props.style)?.backgroundColor;
    expect(bg === undefined || bg === 'transparent').toBe(true);
    expect(safeArea.props.edges).toEqual(['top']);
  });

  test('(c) no ScreenHeader on Today: not imported, and never rendered', async () => {
    // The source half is the real assertion. A band is removed from this
    // screen by construction, not by a render that happened not to reach it.
    expect(SOURCE).not.toMatch(/ScreenHeader/);
    expect(SOURCE).not.toMatch(/homeHeader/);
    await renderToday();
    expect(mockScreenHeader).not.toHaveBeenCalled();
  });

  test('the cold-load path is on the ground, with a spinner that paints no fill', () => {
    mockDataLoading = true;
    const screen = render(<DashboardScreen />);
    expect(screen.getByTestId('today-ground')).toBeTruthy();
    expect(mockSpinnerProps).toHaveBeenCalledWith(
      expect.objectContaining({ transparentGround: true })
    );
  });
});

describe('LoadingSpinner keeps its fill for every caller that does not opt out', () => {
  test('default: the Mist White full-screen ground, as before R3a', () => {
    const tree: any = render(<LoadingSpinner message="x" />).toJSON();
    expect(StyleSheet.flatten(tree.props.style).backgroundColor).toBe(
      Colors.background.default
    );
  });

  test('transparentGround: no fill', () => {
    const tree: any = render(<LoadingSpinner message="x" transparentGround />).toJSON();
    expect(StyleSheet.flatten(tree.props.style).backgroundColor).toBe('transparent');
  });
});

describe('(e) render-time semantics survive the redesign', () => {
  beforeEach(primeHome);

  test('staleDate: no commit passes an actionable hero while the hook is stale', async () => {
    const screen = await renderToday();
    mockTodayCard.mockReturnValue(todayCard({ staleDate: true, completed: true }));
    screen.rerender(<DashboardScreen />);

    // The element staleDate owns: the control is disabled AND the done state is
    // suppressed, because a date change makes `completed` untrue.
    expect(completeDisabled(screen)).toBe(true);
    expect(screen.queryByTestId('home-today-done')).toBeNull();

    mockTodayCard.mockReturnValue(todayCard());
    screen.rerender(<DashboardScreen />);

    const staleCommits = mockHeroRenders.filter((r) => r.hook?.staleDate);
    expect(staleCommits.length).toBeGreaterThan(0);
    for (const r of mockHeroRenders) {
      expect(r.props.staleDate).toBe(!!r.hook?.staleDate);
    }
  });

  test('variantStale: no commit passes an actionable hero while the hook is stale', async () => {
    const screen = await renderToday();
    mockTodayCard.mockReturnValue(todayCard({ variantStale: true }));
    screen.rerender(<DashboardScreen />);

    // The element variantStale owns: the control, and only the control. It is
    // deliberately NOT asserted against the done state, which it leaves alone.
    expect(completeDisabled(screen)).toBe(true);

    mockTodayCard.mockReturnValue(todayCard());
    screen.rerender(<DashboardScreen />);

    const staleCommits = mockHeroRenders.filter((r) => r.hook?.variantStale);
    expect(staleCommits.length).toBeGreaterThan(0);
    for (const r of mockHeroRenders) {
      expect(r.props.variantStale).toBe(!!r.hook?.variantStale);
    }
  });

  test('the hero mounts with the background load still pending', async () => {
    // THIS DEPENDS ON THE expo-image MOCK, ON PURPOSE. jest.setup.js maps
    // expo-image's Image to a host string, which never fires onLoad. So the
    // hero rendering here proves nothing waits for the image. If that mock ever
    // starts firing onLoad, this test stops proving it; re-pin it then.
    const screen = await renderToday();
    const layer = screen.getByTestId('today-ground');
    expect(layer.props.onLoad).toBeUndefined();
    expect(screen.getByTestId('home-today-hero')).toBeTruthy();
  });

  test('Home imports no asset preloader, which a mock would resolve instantly', () => {
    // A gate on expo-asset would pass the test above: under jest it resolves at
    // once. So the boundary is checked at the source instead.
    expect(SOURCE).not.toMatch(/expo-asset|useAssets|loadAsync|Image\.prefetch/);
  });

  test.each([
    ['staleDate', { staleDate: true }],
    ['variantStale', { variantStale: true }],
  ])('memo: changing ONLY %s flips the control', async (_name, change) => {
    const base = todayCard();
    mockTodayCard.mockReturnValue(base);
    const screen = await renderToday();
    expect(completeDisabled(screen)).toBe(false);

    mockTodayCard.mockReturnValue({ ...base, ...change });
    screen.rerender(<DashboardScreen />);
    expect(completeDisabled(screen)).toBe(true);

    // Every other input the hero took is the SAME reference, so the flip
    // cannot have been caused by anything but the one change.
    const [before, after] = mockHeroRenders.slice(-2).map((r) => r.props);
    expect(after.protocol).toBe(before.protocol);
    expect(after.onMarkDone).toBe(before.onMarkDone);
  });

  test('memo: changing ONLY completed flips the done state', async () => {
    const base = todayCard();
    mockTodayCard.mockReturnValue(base);
    const screen = await renderToday();
    expect(screen.queryByTestId('home-today-done')).toBeNull();

    mockTodayCard.mockReturnValue({ ...base, completed: true });
    screen.rerender(<DashboardScreen />);
    expect(screen.getByTestId('home-today-done')).toBeTruthy();
  });
});

describe('(f) the three-surface rule, as ORDER not position', () => {
  beforeEach(primeHome);

  // N = 3 ACTIONABLE BLOCKS, counted before the ANCHOR: the calm-remainder
  // block, the first top-level block that holds the good-moment row. The fold
  // is the walk's; what is falsifiable here is that no fourth actionable block
  // is added above the remainder. The header row (the Guide pill and Settings)
  // is persistent chrome, not a surface competing for the day, and is excluded
  // by name. The fixture is the WORST CASE the screen can produce today: hero,
  // journey-action card and an open close entry all at once.
  const N = 3;
  const ANCHOR = 'good-moment-row';

  test('at most three actionable blocks precede the calm remainder', async () => {
    mockResolveJourney.mockResolvedValue({
      target: 'today',
      phase: { ...PHASE, hasRemoveCapture: false },
    });
    const screen = await renderToday();
    await waitFor(() => expect(screen.getByTestId('home-remove-capture')).toBeTruthy());
    expect(screen.getByTestId('home-close-entry')).toBeTruthy();

    const scroll = flatten(screen.toJSON()).find((n) => n.type === 'RCTScrollView');
    // The ScrollView's children are the RefreshControl and the content
    // container; the content container's children are the top-level blocks.
    const content = scroll.children.find((c: any) => c.type === 'View');
    const blocks: any[] = content.children;
    const anchorAt = blocks.findIndex((b) => contains(b, hasTestId(ANCHOR)));
    expect(anchorAt).toBeGreaterThan(-1);

    const chrome = (b: any) => contains(b, hasTestId('home-guide'));
    const actionable = blocks
      .slice(0, anchorAt)
      .filter((b) => !chrome(b) && contains(b, isButton));

    // Non-vacuous: the worst case really does reach the ceiling.
    expect(actionable.length).toBe(N);
    expect(actionable.length).toBeLessThanOrEqual(N);
  });
});
