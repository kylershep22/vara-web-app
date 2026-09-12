/**
 * Per-screen / per-tab error boundary — journey slice 7g.
 *
 * WHAT CHANGED AND WHY IT NEEDS ITS OWN SUITE. Before this slice the app had
 * exactly ONE ErrorBoundary, at App.tsx:114, above the navigator, so any render
 * throw replaced Today, Practices, Learn, Community and the tab bar at once.
 * That fact is asserted in components/shared/__tests__/ErrorBoundary.test.tsx,
 * whose header this slice had to correct. `screenLayout` on the two navigators
 * now wraps every screen and every tab, so a throw costs one surface.
 *
 * TWO KINDS OF PROOF, AND NEITHER IS SUFFICIENT ALONE. The behavioural tests
 * below render a REAL bottom-tab navigator using the REAL layout function, so
 * what they exercise is React Navigation's actual descriptor path rather than a
 * description of it. They cannot, however, see whether AppNavigator passes that
 * function to anything — so the last describe block reads AppNavigator's source
 * for the wiring. That split, and the reason for it, follows the precedent set
 * by pillarRoutes.test.ts and practicesToFocus.nav.test.tsx: rendering
 * AppNavigator itself pulls auth, subscriptions, RevenueCat and the onboarding
 * tree, and it mounts one branch of the auth state machine at a time.
 *
 * THE VACUITY TRAP THIS SUITE HAD TO AVOID. A test that mounts a boundary and
 * finds the fallback proves nothing about scoping: the OLD single boundary
 * would pass it too. Every containment test below therefore asserts BOTH halves
 * — the broken surface shows the fallback AND a sibling surface is still
 * rendering its own content. The second half is the one that fails if the
 * boundary is hoisted back above the navigator.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { screenBoundaryLayout } from '../screenBoundary';
import { ERROR_BOUNDARY_COPY } from '../../components/shared/ErrorBoundary';

// A real navigator pulls @react-navigation/elements' SafeAreaProviderCompat,
// which reads the provider, both contexts and initialWindowMetrics. Missing any
// one of them renders as an undefined component rather than a helpful error.
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }: any) => ReactLocal.createElement(View, null, children),
    SafeAreaView: ({ children, style }: any) =>
      ReactLocal.createElement(View, { style }, children),
    SafeAreaInsetsContext: ReactLocal.createContext(insets),
    SafeAreaFrameContext: ReactLocal.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// React logs the caught error and the component stack to console.error. That is
// React's own noise about a deliberately thrown error, not a failure.
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  consoleError.mockRestore();
});

/**
 * A screen whose throwing is controlled from OUTSIDE it, by the test.
 *
 * NOT A SCREEN THAT THROWS ONCE AND THEN HEALS ITSELF, and the difference is
 * not cosmetic: React 19 retries a failed concurrent render synchronously
 * before it gives up and shows the boundary, so a self-flipping "throw on first
 * render only" screen SUCCEEDS on React's own retry and the boundary never
 * appears. The first version of this suite was written that way and two tests
 * failed for that reason rather than for anything about the boundary.
 *
 * Driving it from the test also makes the anti-vacuity proofs sharper: the
 * screen can be made renderable WHILE the boundary is holding its error, so
 * "did this subtree remount" has an unambiguous answer.
 */
function makeToggleableScreen(label: string) {
  const state = { shouldThrow: true };
  const Screen: React.FC = () => {
    if (state.shouldThrow) {
      throw new Error(`boom in ${label}`);
    }
    return <Text>{`${label} content`}</Text>;
  };
  return { Screen, state };
}

/** Throws on every render, like an index into a malformed document. */
function makeAlwaysBrokenScreen(label: string) {
  const Screen: React.FC = () => {
    throw new Error(`boom in ${label}`);
  };
  return Screen;
}

const Healthy: React.FC = () => <Text>healthy content</Text>;

function renderTabs(BrokenScreen: React.FC) {
  const Tabs = createBottomTabNavigator();
  return render(
    <NavigationContainer>
      <Tabs.Navigator screenLayout={screenBoundaryLayout}>
        <Tabs.Screen name="Broken" component={BrokenScreen} />
        <Tabs.Screen name="Healthy" component={Healthy} />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}

/**
 * The tab bar button for a tab.
 *
 * MATCHED ON A PREFIX, NOT THE BARE NAME. React Navigation composes the tab
 * button's accessibility label as "<name>, tab, <n> of <m>", so an exact-match
 * query finds nothing and the failure reads like a missing tab bar rather than
 * a wrong selector.
 */
function tabButton(name: string) {
  return screen.getByLabelText(new RegExp(`^${name}, tab`));
}

/**
 * Switches tabs by pressing the tab bar button, which is what a user does and
 * what keeps the navigator's own state machine in the loop. Tabs are lazy, so
 * a tab's subtree — and therefore its boundary — does not exist until this has
 * been called for it at least once.
 */
function switchToTab(name: string) {
  act(() => {
    fireEvent.press(tabButton(name));
  });
}

describe('screenBoundaryLayout — a throw costs one surface', () => {
  test('the broken tab shows the surface fallback and the healthy tab still renders', () => {
    renderTabs(makeAlwaysBrokenScreen('Broken'));

    // The broken tab is the initial route, so it has already thrown.
    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();

    // THE HALF THAT FAILS IF THE BOUNDARY IS HOISTED. Under the old
    // app-level-only boundary the whole navigator would be replaced, the tab
    // bar would be gone, and there would be no tab to press.
    switchToTab('Healthy');
    expect(screen.getByText('healthy content')).toBeTruthy();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeNull();
  });

  test('the tab bar survives the throw, which is the users way out', () => {
    renderTabs(makeAlwaysBrokenScreen('Broken'));

    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();
    // Both tab buttons are still on screen while a tab is showing its fallback.
    expect(tabButton('Broken')).toBeTruthy();
    expect(tabButton('Healthy')).toBeTruthy();
  });

  test('the surface fallback uses the surface copy, not the whole-app copy', () => {
    renderTabs(makeAlwaysBrokenScreen('Broken'));

    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();
    // The app-scoped line would be wrong here: the app has not gone anywhere.
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.appTitle)).toBeNull();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.appMessage)).toBeNull();
  });
});

/**
 * THE SHARPEST USER-VISIBLE CONSEQUENCE OF THIS SLICE, PINNED AS DELIBERATE
 * BEHAVIOUR RATHER THAN LEFT AS AN ARTEFACT (added to scope by Kyle at the 7g
 * Step 0 review).
 *
 * Bottom tabs are lazy on first focus but STAY MOUNTED afterwards. A boundary
 * is a component with state, so a tab left holding `hasError` is still holding
 * it when the user comes back. The tab is broken until Try Again or an app
 * restart; switching away and back is NOT a reset, and a user will reasonably
 * expect that it is.
 *
 * This is the behaviour a reset key would change. It is being kept: a reset on
 * blur would re-throw instantly for the malformed-document shape these
 * boundaries mostly exist for, turning a stable fallback into a surface that
 * flickers back to broken every time it is looked at.
 */
describe('a tab in its error state STAYS in it across a tab switch', () => {
  test('switching away and back does not clear the fallback', () => {
    const { Screen, state } = makeToggleableScreen('Broken');
    renderTabs(Screen);

    // First render of the broken tab threw.
    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();

    switchToTab('Healthy');
    expect(screen.getByText('healthy content')).toBeTruthy();

    // THE ANTI-VACUITY STEP, AND THE WHOLE REASON THE SCREEN IS TOGGLEABLE.
    // The screen is now perfectly capable of rendering. If coming back to the
    // tab remounted the subtree, the next assertion would find 'Broken content'
    // and this test would fail.
    state.shouldThrow = false;
    switchToTab('Broken');

    // It does not remount. The boundary instance, not the screen, is what is
    // holding the error, and the tab kept that instance alive while it was
    // blurred.
    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();
    expect(screen.queryByText('Broken content')).toBeNull();
  });

  test('Try Again is what clears it, and it remounts the subtree', () => {
    const { Screen, state } = makeToggleableScreen('Broken');
    renderTabs(Screen);

    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();

    // Same setup as the test above - the underlying cause is gone - so the only
    // difference between the two is which gesture is used to recover.
    state.shouldThrow = false;
    act(() => {
      fireEvent.press(screen.getByText(ERROR_BOUNDARY_COPY.tryAgain));
    });

    // The subtree really remounted: the screen rendered its own content rather
    // than the boundary simply hiding itself.
    expect(screen.getByText('Broken content')).toBeTruthy();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeNull();
  });

  test('Try Again does NOT rescue a surface that throws every time', () => {
    renderTabs(makeAlwaysBrokenScreen('Broken'));

    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByText(ERROR_BOUNDARY_COPY.tryAgain));
    });

    // Still broken, which is the honest outcome for a malformed document: the
    // remount re-reads the same bad data. The way out is the tab bar, not this
    // button, and that is why the surface fallback does not promise otherwise.
    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();
    expect(tabButton('Healthy')).toBeTruthy();
  });
});

describe('screenBoundaryLayout passes healthy screens through untouched', () => {
  test('a screen that does not throw renders its own content', () => {
    const Tabs = createBottomTabNavigator();
    render(
      <NavigationContainer>
        <Tabs.Navigator screenLayout={screenBoundaryLayout}>
          <Tabs.Screen name="Healthy" component={Healthy} />
        </Tabs.Navigator>
      </NavigationContainer>
    );

    expect(screen.getByText('healthy content')).toBeTruthy();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeNull();
  });
});

/**
 * THE WIRING GUARD. The behavioural tests above use the real layout function on
 * a navigator this file builds; they would all stay green if AppNavigator
 * stopped passing it. This is what fails in that case.
 *
 * It reads source, with the same reasoning and the same acknowledged limit as
 * pillarRoutes.test.ts: it proves the prop is written, not that it is reached
 * at runtime. The runtime proof is the device walk.
 */
describe('AppNavigator installs the boundary on both live navigators', () => {
  const NAVIGATOR_SOURCE = readFileSync(
    join(__dirname, '..', 'AppNavigator.tsx'),
    'utf8'
  );

  test('it imports the layout', () => {
    expect(NAVIGATOR_SOURCE).toContain(
      "import { screenBoundaryLayout } from './screenBoundary'"
    );
  });

  test('both navigators receive it, and there are exactly two', () => {
    const uses = NAVIGATOR_SOURCE.match(/screenLayout=\{screenBoundaryLayout\}/g) ?? [];

    // AppStack (all 40 registered screens, including `Main`) and the four-tab
    // BottomTabs inside FivePillarTabs. The legacy BottomTabsNavigator is
    // deliberately NOT wired — FOUR_PILLAR_IA has been on since 2026-07-02 so it
    // does not mount, and the retired IA is not something to extend. If that
    // count changes, the change was either the legacy navigator being wired or a
    // live one losing its boundary, and both need saying out loud.
    expect(uses).toHaveLength(2);
  });
});

/**
 * THE WALK SWITCH MUST NOT BE ABLE TO SHIP. `DEV_CRASH_ROUTE` exists so a
 * device walk can aim a throw at one surface, since 7e and 7f closed the two
 * throws that used to be reproducible from a seeded document. It is armed by
 * hand and it is dangerous if it is ever committed armed.
 */
describe('the dev crash switch is disarmed on this branch', () => {
  const BOUNDARY_SOURCE = readFileSync(
    join(__dirname, '..', 'screenBoundary.tsx'),
    'utf8'
  );

  test('DEV_CRASH_ROUTE is null in the committed source', () => {
    expect(BOUNDARY_SOURCE).toContain('const DEV_CRASH_ROUTE: string | null = null;');
  });

  test('the forced throw is behind __DEV__ as well', () => {
    expect(BOUNDARY_SOURCE).toContain('const armed = __DEV__ && DEV_CRASH_ROUTE !== null');
  });
});
