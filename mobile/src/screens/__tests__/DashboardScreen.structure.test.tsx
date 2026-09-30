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
//   3. CONTRACT (d) CANNOT TELL A LITERAL FROM THE TOKEN AT RUNTIME. A
//      hard-coded 'rgba(255,255,255,0.72)' flattens to the same string. The
//      source guard in (d) is what closes that; the runtime half only proves
//      the elements that render carry the value.

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => mockUseFocusEffect(cb),
  // Nothing on the surviving Today tree reads it: its one reader here was
  // InsightsLookbackCard, which left Today in TODAY-LEGACY-REMOVAL.
  useNavigation: () => ({ navigate: jest.fn() }),
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
jest.mock('../../components/dashboard/FirstShiftFooter', () => ({
  FirstShiftFooter: () => null,
}));
jest.mock('../../components/events/EventCodeCard', () => ({ EventCodeCard: () => null }));
jest.mock('../../components/events/EventCodeSheet', () => ({ EventCodeSheet: () => null }));
// The routine player imports expo-notifications, which cannot load under jest.
// A stand-in that keeps its visibility and its Edit handler, so the suite can
// see that Begin mounts it and where Edit goes. The real player is the walk's.
jest.mock('../Time/ActiveRoutinePlayer', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    ActiveRoutinePlayer: (props: { visible: boolean; onEditRoutine: () => void }) =>
      props.visible ? (
        <Pressable testID="routine-player-edit" onPress={props.onEditRoutine} />
      ) : null,
  };
});

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
let mockDataErrors: string[] = [];
// The routine card's inputs (ROUTINES-RESTORE). null is unresolved; primeHome
// resets to [] so every render shows the known-empty card after the anchor.
let mockRoutines: unknown[] | null = [];
let mockRoutineCompletions: Record<string, boolean> = {};
let mockActivePlayerRoutine: unknown = null;
const mockHandleBeginRoutine = jest.fn();
const mockHandleCloseRoutinePlayer = jest.fn();
jest.mock('../../hooks/useDashboard', () => ({
  useDashboard: () => ({
    navigation: { navigate: mockNavigate },
    dataLoading: mockDataLoading,
    dataErrors: mockDataErrors,
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
    dashboardRoutines: mockRoutines,
    routineCompletions: mockRoutineCompletions,
    activePlayerRoutine: mockActivePlayerRoutine,
    routinePlayerVisible: mockActivePlayerRoutine !== null,
    handleBeginRoutine: mockHandleBeginRoutine,
    handleCloseRoutinePlayer: mockHandleCloseRoutinePlayer,
    handleRoutineComplete: jest.fn(),
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
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '../DashboardScreen';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PROTOCOL_MATRIX } from '../../protocolEngine';
import { Colors } from '../../constants';
import { ColorTokens } from '../../constants/designTokens';
import { DASHBOARD_SUPPRESS } from '../../constants/dashboardConfig';
import { NAV_TARGETS } from '../../navigation/navTargets';

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

/** One active routine for the routine card (ROUTINES-RESTORE). */
const ROUTINE = {
  id: 'r1',
  name: 'The Essentials',
  activities: [{ id: 1, name: 'Hydration', duration: 1, icon: 'water', order: 0 }],
  active: true,
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
  mockDataErrors = [];
  mockRoutines = [];
  mockRoutineCompletions = {};
  mockActivePlayerRoutine = null;
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
const hasTestId = (id: string) => (n: any) => n.props?.testID === id;
/** A rendered JSON node, as far as contracts (f) and (g) read it. */
type TreeNode = { type?: string; props?: Record<string, unknown>; children?: unknown[] | null };

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

describe('(d) every surface on the ground reads the token', () => {
  beforeEach(primeHome);

  const fill = (el: any) => StyleSheet.flatten(el.props.style)?.backgroundColor;

  test('the date line, journey line, close entry and remainder rows carry it', async () => {
    const screen = await renderToday();
    for (const id of [
      'home-date-surface',
      'home-journey-line',
      'home-close-surface',
      'home-good-moment-surface',
      // The routine card carries the tier itself (ROUTINES-RESTORE); primeHome
      // gives it no routines, so it renders its known-empty state.
      'dashboard-routine-empty',
    ]) {
      expect([id, fill(screen.getByTestId(id))]).toEqual([id, Colors.surfaceImmersive]);
    }
  });

  test('the error banner carries it', async () => {
    mockDataErrors = ['journal'];
    const screen = await renderToday();
    expect(fill(screen.getByTestId('home-error-banner'))).toBe(Colors.surfaceImmersive);
  });

  test('the loading text carries it, on the spinner Today renders', () => {
    const screen = render(<LoadingSpinner message="x" transparentGround />);
    expect(fill(screen.getByTestId('loading-surface'))).toBe(Colors.surfaceImmersive);
  });

  test('StartHereRow is handed the tier, for the day it renders', () => {
    // It renders nothing today (a null path), so there is no element to read.
    // The contract is that Today hands it the tier; the row applies it only
    // when it renders.
    expect(SOURCE).toMatch(/<StartHereRow[\s\S]*?containerStyle=\{\[surfaceTierStyle, \{ backgroundColor: surfaceFill \}\]\}/);
  });

  const ALLOWLIST: Record<string, string> = {
    'components/insights/HeroSummaryCard.tsx':
      'A TEXT colour, not a surface, on the Insights hero; predates the token and is not on Today. Same numbers by coincidence.',
  };

  test('SOURCE GUARD: the value is written once, in colors.ts, and nowhere else in src/', () => {
    // A literal equal to the token is indistinguishable from the token at
    // runtime, so the runtime assertions above cannot catch one. This can.
    const root = path.join(__dirname, '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.72\s*\)/.test(text)) {
            offenders.push(path.relative(root, full).split(path.sep).join('/'));
          }
        }
      }
    };
    walk(root);
    // brandCompliance's contract: every waiver carries its reason, and a
    // waiver naming a file that no longer exists fails, so none can rot.
    for (const file of Object.keys(ALLOWLIST)) {
      expect([file, fs.existsSync(path.join(root, file))]).toEqual([file, true]);
    }
    expect(offenders.filter((f) => !(f in ALLOWLIST))).toEqual(['constants/colors.ts']);
    expect(ColorTokens.surfaceImmersive).toBe(Colors.surfaceImmersive);
  });
});

describe('secondary text on the ground is Soft Charcoal, never Muted Sage Gray', () => {
  beforeEach(primeHome);

  // Ruled 2026-09-29: sage reaches only 3.75 to 4.24:1 on the surface token over
  // the darkest art, and the fix is the colour, not the token. Pinned so a
  // restyle cannot quietly put sage back. Teal stays allowed: it is the label
  // and action colour, with its own measured floor.
  const ALLOWED = [Colors.softCharcoal, Colors.evergreenTeal];
  const textColours = (el: any) =>
    flatten(el.children)
      .filter((n: any) => n.type === 'Text')
      .map((n: any) => StyleSheet.flatten(n.props.style)?.color);

  test('the date line, journey line and closed week note', async () => {
    mockGetLatestCycle.mockResolvedValue({ ...liveCycle, closeCompletedAt: { seconds: 1 } });
    const screen = await renderToday();
    await waitFor(() => expect(screen.getByTestId('home-week-closed')).toBeTruthy());

    expect(StyleSheet.flatten(screen.getByTestId('home-date').props.style).color).toBe(
      Colors.softCharcoal
    );
    for (const id of [
      'home-date-surface',
      'home-journey-line',
      'home-close-surface',
    ]) {
      const colours = textColours(screen.getByTestId(id));
      expect(colours.length).toBeGreaterThan(0);
      for (const c of colours) expect([id, ALLOWED.includes(c)]).toEqual([id, true]);
    }
  });

  test('the routine card, in each of its three states', async () => {
    // ROUTINES-RESTORE, ruling C. Reads what renders, so a restyle that puts
    // sage back on any card Text fails here, not only on a named testID.
    const states: Array<[string, unknown[], Record<string, boolean>]> = [
      ['dashboard-routine-empty', [], {}],
      ['dashboard-routine', [ROUTINE], {}],
      ['dashboard-routine', [ROUTINE], { r1: true }],
    ];
    for (const [id, routines, completions] of states) {
      mockRoutines = routines;
      mockRoutineCompletions = completions;
      const screen = await renderToday();
      const colours = textColours(screen.getByTestId(id));
      expect(colours.length).toBeGreaterThan(0);
      for (const c of colours) expect([id, c, ALLOWED.includes(c)]).toEqual([id, c, true]);
      screen.unmount();
    }
  });

  test('the loading message, on the ground and only there', () => {
    const colourOf = (el: React.ReactElement) =>
      StyleSheet.flatten(render(el).getByText('x').props.style).color;
    expect(colourOf(<LoadingSpinner message="x" transparentGround />)).toBe(Colors.softCharcoal);
    // Every other caller keeps its sage message.
    expect(colourOf(<LoadingSpinner message="x" />)).toBe(Colors.textSecondary);
  });
});

describe('Reduce Transparency makes the surfaces opaque', () => {
  // SWAPPED BY ASSIGNMENT AND PUT BACK, NOT SPIED. React Native's jest preset
  // already makes these jest.fn()s, and jest.spyOn on an existing mock returns
  // that same mock: mockRestore then strips the preset's implementation and
  // every later render in this file throws. Found by exactly that failure.
  const restores: Array<() => void> = [];
  const swap = <K extends keyof typeof AccessibilityInfo>(key: K, value: any) => {
    const original = AccessibilityInfo[key];
    (AccessibilityInfo as any)[key] = value;
    restores.push(() => {
      (AccessibilityInfo as any)[key] = original;
    });
  };
  beforeEach(primeHome);
  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
  });

  const fill = (el: any) => StyleSheet.flatten(el.props.style)?.backgroundColor;
  const SURFACES = [
    'home-date-surface',
    'home-journey-line',
    'home-error-banner',
    'dashboard-routine-empty',
  ];

  test('read at mount: on, the tier is opaque White', async () => {
    swap('isReduceTransparencyEnabled', () => Promise.resolve(true));
    mockDataErrors = ['journal'];
    const screen = await renderToday();
    await waitFor(() => expect(fill(screen.getByTestId('home-date-surface'))).toBe(Colors.white));
    for (const id of SURFACES) expect([id, fill(screen.getByTestId(id))]).toEqual([id, Colors.white]);
  });

  test('toggled with the screen open: the tier follows without a remount', async () => {
    // Every subscriber, as iOS notifies every listener: each surface reads the
    // setting through its own hook instance.
    const listeners: Array<(enabled: boolean) => void> = [];
    const onChange = (enabled: boolean) => listeners.forEach((l) => l(enabled));
    swap('addEventListener', (event: string, handler: (enabled: boolean) => void) => {
      if (event === 'reduceTransparencyChanged') listeners.push(handler);
      return { remove: jest.fn() };
    });
    mockDataErrors = ['journal'];
    const screen = await renderToday();
    for (const id of SURFACES) {
      expect([id, fill(screen.getByTestId(id))]).toEqual([id, Colors.surfaceImmersive]);
    }

    expect(listeners.length).toBeGreaterThan(0);
    act(() => onChange(true));
    for (const id of SURFACES) expect([id, fill(screen.getByTestId(id))]).toEqual([id, Colors.white]);

    act(() => onChange(false));
    expect(fill(screen.getByTestId('home-date-surface'))).toBe(Colors.surfaceImmersive);
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

/**
 * The worst case the screen can produce today: hero, journey-action card and an
 * open close entry all at once. Shared by (f) and (g).
 */
async function renderWorstCase() {
  mockResolveJourney.mockResolvedValue({
    target: 'today',
    phase: { ...PHASE, hasRemoveCapture: false },
  });
  const screen = await renderToday();
  await waitFor(() => expect(screen.getByTestId('home-remove-capture')).toBeTruthy());
  expect(screen.getByTestId('home-close-entry')).toBeTruthy();
  return screen;
}

describe('(f) the three-surface rule, as ORDER not position', () => {
  beforeEach(primeHome);

  // N = 3 ACTIONABLE SURFACES before the ANCHOR, the good-moment row.
  //
  // WHAT IT COUNTS (TODAY-LEGACY-REMOVAL, closing R3A-CONTRACT-F-MOCK-BLIND).
  // The path from the ScrollView's content container down to the anchor is
  // walked, and at EVERY level the siblings that come before the path node and
  // contain an actionable element are counted. The R3a version counted only
  // top-level blocks, so an action rendered inside the anchor's own block, ahead
  // of the anchor, was invisible to it. The removed habit and routine cards sat
  // exactly there, and were also mocked to null.
  //
  // ACTIONABLE means accessibilityRole button or link, OR a function onClick. A
  // TouchableOpacity with no role exposes onClick on its host view, not onPress,
  // so the second clause is what catches a role-less pressable.
  //
  // CHROME is exactly two elements, excluded by identity and asserted present:
  // the Guide pill (testID home-guide) and the Settings cog (accessibilityLabel
  // Settings). They are excluded as elements, not as blocks, so an action added
  // beside them in the header row is still counted.
  //
  // WHAT IS MOCKED, AND WHY NONE OF IT CAN HIDE A SURFACE. Every component mock
  // in this file is for something that does not render in the content
  // container: LoadingSpinner (the loading path only), ScreenHeader (not
  // imported, contract (c)), EventCodeSheet and ActiveRoutinePlayer (siblings
  // of the ScrollView), and
  // NotificationOptInCard, FirstShiftFooter and EventCodeCard, which are
  // suppressed by the three flags asserted below. The one stand-in inside the
  // content container is the Guide pill, which is chrome: it keeps its testID
  // and its button role, and its presence is asserted. TodayHeroCard renders for
  // real under its recorder.
  //
  // The fold is the walk's; what is falsifiable here is the order.
  const N = 3;
  const ANCHOR = 'good-moment-row';

  const isActionable = (n: TreeNode) =>
    n.props?.accessibilityRole === 'button' ||
    n.props?.accessibilityRole === 'link' ||
    typeof n.props?.onClick === 'function';
  const isGuide = hasTestId('home-guide');
  const isSettings = (n: TreeNode) => n.props?.accessibilityLabel === 'Settings';
  const isChrome = (n: TreeNode) => isGuide(n) || isSettings(n);

  /** The chain of nodes from `node` down to the first node matching `pred`. */
  function pathTo(node: unknown, pred: (n: TreeNode) => boolean): TreeNode[] | null {
    if (!node || typeof node !== 'object') return null;
    const n = node as TreeNode;
    if (pred(n)) return [n];
    for (const child of n.children ?? []) {
      const rest = pathTo(child, pred);
      if (rest) return [n, ...rest];
    }
    return null;
  }

  test('at most three actionable surfaces precede the calm remainder', async () => {
    // The suppressed cards behind the remaining mocks are still suppressed. If
    // a flag flips, its card renders in the content container and its mock
    // would hide it, so this goes red first and the mock goes with the flag.
    expect(DASHBOARD_SUPPRESS.notifOptIn).toBe(true);
    expect(DASHBOARD_SUPPRESS.firstShiftFooter).toBe(true);
    expect(DASHBOARD_SUPPRESS.eventCode).toBe(true);

    const screen = await renderWorstCase();
    const tree = screen.toJSON();

    // Both chrome elements are present and actionable, so a rename cannot
    // silently turn the exclusion into a hiding place.
    const all = flatten(tree);
    const guide = all.filter(isGuide);
    const settings = all.filter(isSettings);
    expect(guide).toHaveLength(1);
    expect(settings).toHaveLength(1);
    expect(isActionable(guide[0])).toBe(true);
    expect(isActionable(settings[0])).toBe(true);

    const scroll = all.find((n) => n.type === 'RCTScrollView');
    // The ScrollView's children are the RefreshControl and the content
    // container.
    const content = (scroll.children as TreeNode[]).find((c) => c.type === 'View');
    const path = pathTo(content, hasTestId(ANCHOR));
    expect(path).not.toBeNull();

    const surfaces: unknown[] = [];
    for (let i = 0; i < path!.length - 1; i++) {
      const siblings: unknown[] = path![i].children ?? [];
      const at = siblings.indexOf(path![i + 1]);
      for (const sibling of siblings.slice(0, at)) {
        if (contains(sibling, (n) => isActionable(n) && !isChrome(n))) surfaces.push(sibling);
      }
    }

    // Non-vacuous: the worst case really does reach the ceiling.
    expect(surfaces.length).toBe(N);
    expect(surfaces.length).toBeLessThanOrEqual(N);
  });
});

describe('(g) the legacy block is gone from Today', () => {
  beforeEach(primeHome);

  // Scope: Today's surviving tree and DashboardScreen.tsx only, not the app.
  // AMENDED AT ROUTINES-RESTORE (ruling C of the V1 SCOPE REVISION block): the
  // routine card, the routine player and the plan route are back on Today, so
  // their testIDs and modules are allowed. Check habits stays gone, and so do
  // the habit grid, the insight card, the Look back card, HabitNoteSheet,
  // HabitDetail and Insights.
  const REMOVED_TEST_IDS = [
    'dashboard-insight',
    'weekly-habit-grid',
    'weekly-habit-grid-empty',
    'weekly-habit-grid-title',
    'weekly-habit-grid-add',
    'dashboard-routine-check-habits',
    'insights-lookback-card',
    'home-lookback-surface',
  ];

  test('none of the removed testIDs renders, in the worst case', async () => {
    const screen = await renderWorstCase();
    const ids = new Set(flatten(screen.toJSON()).map((n: TreeNode) => n.props?.testID));
    expect(REMOVED_TEST_IDS.filter((id) => ids.has(id))).toEqual([]);
  });

  test('Check habits is absent from the all-done routine card', async () => {
    // Rendered in the one state that used to carry it, or the pin is vacuous.
    mockRoutines = [ROUTINE];
    mockRoutineCompletions = { r1: true };
    const screen = await renderToday();
    expect(screen.getByTestId('dashboard-routine')).toBeTruthy();
    expect(screen.getByText('All done for today.')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-routine-check-habits')).toBeNull();
    expect(screen.queryByText(/Check habits/)).toBeNull();
  });

  test('SOURCE GUARD: Home imports none of it and names no route into it', () => {
    // Matches imports, JSX and route usage, never prose: a journey label such
    // as the hero's Routines phase comes from data and is not a route.
    const MODULES = ['InsightCard', 'WeeklyHabitGrid', 'InsightsLookbackCard', 'HabitNoteSheet'];
    for (const m of MODULES) {
      expect([m, new RegExp(`from\\s+['"][^'"]*/${m}['"]`).test(SOURCE)]).toEqual([m, false]);
      expect([m, new RegExp(`<${m}\\b`).test(SOURCE)]).toEqual([m, false]);
    }
    expect(SOURCE).not.toMatch(/['"]HabitDetail['"]|ROUTES\.HabitDetail\b/);
    expect(SOURCE).not.toMatch(/['"]Insights['"]|ROUTES\.Insights\b/);
    // The only plan route Today names is NAV_TARGETS.plan: no literal tab route
    // name, and no other NAV_TARGETS destination.
    expect(SOURCE).not.toMatch(/ROUTES\.(PillarTime|Rhythms)\b|['"](PillarTime|Rhythms)['"]/);
    const targets = SOURCE.match(/NAV_TARGETS\.\w+/g) ?? [];
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets)).toEqual(new Set(['NAV_TARGETS.plan']));
  });
});

describe('the routine card sits below the good moments, as a supporting surface', () => {
  beforeEach(primeHome);

  // ROUTINES-RESTORE, rulings B and C of the V1 SCOPE REVISION block. HIERARCHY
  // AND TREE ORDER ONLY: the fold is the walk's.
  const ANCHOR = 'good-moment-row';
  const CARD_IDS = ['dashboard-routine', 'dashboard-routine-empty'];
  const isCard = (n: TreeNode) => CARD_IDS.includes(n.props?.testID as string);

  function pathTo(node: unknown, pred: (n: TreeNode) => boolean): TreeNode[] | null {
    if (!node || typeof node !== 'object') return null;
    const n = node as TreeNode;
    if (pred(n)) return [n];
    for (const child of n.children ?? []) {
      const rest = pathTo(child, pred);
      if (rest) return [n, ...rest];
    }
    return null;
  }

  test('after the anchor, sharing the wrapper View with it', async () => {
    const screen = await renderToday();
    const tree = screen.toJSON();
    const all = flatten(tree);
    const anchorAt = all.findIndex(hasTestId(ANCHOR));
    const cardAt = all.findIndex(isCard);
    expect(anchorAt).toBeGreaterThanOrEqual(0);
    expect(cardAt).toBeGreaterThan(anchorAt);

    // Nearest common ancestor: the wrapper View holding the good-moments tier.
    const toAnchor = pathTo(tree, hasTestId(ANCHOR))!;
    const toCard = pathTo(tree, isCard)!;
    let i = 0;
    while (i < toAnchor.length && i < toCard.length && toAnchor[i] === toCard[i]) i++;
    const common = toAnchor[i - 1];
    expect(common.type).toBe('View');
    expect(toAnchor[i].props?.testID).toBe('home-good-moment-surface');
    // The card is the wrapper's own child, not buried in another block.
    expect(toCard[i]).toBe(toCard[toCard.length - 1]);
  });

  test('keeps the row gap below the good moments, with no negative margin', async () => {
    // Walk FAIL of 2026-09-30, step B: the card touched the row above it. The
    // neighbouring row's own top gap is the measure, read from the render.
    const screen = await renderToday();
    type Box = { marginTop?: unknown; margin?: unknown; marginVertical?: unknown; top?: unknown };
    const flat = (id: string) =>
      StyleSheet.flatten(screen.getByTestId(id).props.style as never) as Box;
    const row = flat('home-good-moment-surface');
    const card = flat('dashboard-routine-empty');
    expect(typeof row.marginTop).toBe('number');
    expect(row.marginTop).toBeGreaterThan(0);
    expect(card.marginTop).toBe(row.marginTop);
    for (const key of Object.keys(card) as Array<keyof Box>) {
      if (/^margin|^top$/.test(key) && typeof card[key] === 'number') {
        expect([key, (card[key] as number) >= 0]).toEqual([key, true]);
      }
    }
  });

  test('absent while the routine state is unresolved', async () => {
    mockRoutines = null;
    const screen = await renderToday();
    expect(screen.getByTestId(ANCHOR)).toBeTruthy();
    for (const id of CARD_IDS) expect(screen.queryByTestId(id)).toBeNull();
  });

  const TEAL = Colors.evergreenTeal;
  const isActionable = (n: TreeNode) =>
    n.props?.accessibilityRole === 'button' ||
    n.props?.accessibilityRole === 'link' ||
    typeof n.props?.onClick === 'function';

  test('no filled primary: nothing actionable in the card, above it or inside it, is teal', async () => {
    expect(TEAL).toBe('#1B5E57');
    const states: Array<[unknown[], Record<string, boolean>]> = [
      [[], {}],
      [[ROUTINE], {}],
      [[ROUTINE], { r1: true }],
    ];
    let actionables = 0;
    for (const [routines, completions] of states) {
      mockRoutines = routines;
      mockRoutineCompletions = completions;
      const screen = await renderToday();
      const card = flatten(screen.toJSON()).find(isCard);
      expect(card).toBeTruthy();
      for (const node of flatten(card).filter(isActionable)) {
        actionables++;
        // The actionable node, every ancestor of it inside the card (the card
        // root excepted: its fill is the surface tier, contract (d)), and
        // everything it contains, so a fill on the label is caught too.
        const chain = [...pathTo(card, (n) => n === node)!.slice(1), ...flatten(node).slice(1)];
        for (const n of chain) {
          const flat = StyleSheet.flatten(n.props?.style as never) as { backgroundColor?: unknown } | undefined;
          expect(flat?.backgroundColor).not.toBe(TEAL);
        }
      }
      screen.unmount();
    }
    // Non-vacuous: Create a routine and Begin were both reached.
    expect(actionables).toBeGreaterThanOrEqual(2);
  });

  test('SOURCE GUARD: RoutineCard imports no Button', () => {
    const card = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'dashboard', 'RoutineCard.tsx'),
      'utf8'
    );
    expect(card).not.toMatch(/import[^;]*\bButton\b[^;]*from/);
    expect(card).not.toMatch(/from\s+['"][^'"]*\/Button['"]/);
  });

  test('Begin hands the routine to the player, which mounts on Today; Edit goes to the plan route', async () => {
    mockRoutines = [ROUTINE];
    const screen = await renderToday();
    fireEvent.press(screen.getByTestId('dashboard-routine-begin'));
    expect(mockHandleBeginRoutine).toHaveBeenCalledWith(ROUTINE);
    expect(screen.queryByTestId('routine-player-edit')).toBeNull();

    // The hook owns the player state; with it set, Today mounts the player.
    mockActivePlayerRoutine = ROUTINE;
    screen.rerender(<DashboardScreen />);
    fireEvent.press(screen.getByTestId('routine-player-edit'));
    expect(mockHandleCloseRoutinePlayer).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(NAV_TARGETS.plan, undefined);
  });

  test('Create a routine goes to the plan route', async () => {
    const screen = await renderToday();
    fireEvent.press(screen.getByTestId('dashboard-routine-create'));
    expect(mockNavigate).toHaveBeenCalledWith(NAV_TARGETS.plan, undefined);
  });
});
