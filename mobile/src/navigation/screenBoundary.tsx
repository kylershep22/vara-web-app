/**
 * Per-screen and per-tab error boundary, installed via React Navigation's
 * `screenLayout` prop (slice 7g).
 *
 * WHY A NAVIGATOR PROP RATHER THAN 44 HAND-WRITTEN WRAPPERS. Before this slice
 * the app had exactly ONE ErrorBoundary, at App.tsx:114, above the navigator,
 * so any render throw anywhere replaced Today, Practices, Learn, Community and
 * the tab bar at once. AppNavigator registers 40 screens on AppStack (one of
 * which, `Main`, is the four-tab navigator) plus the 4 tabs themselves. A
 * per-tab-only design would have covered 4 surfaces and missed 39. `screenLayout`
 * on a Navigator wraps EVERY screen in it, including screens added later, so
 * the coverage cannot rot the way a hand-maintained list does.
 *
 * WHERE THE BOUNDARY SITS RELATIVE TO THE CHROME, which is the whole reason
 * this shape works: `screenLayout` wraps the SceneView only
 * (@react-navigation/core useDescriptors.js). The native-stack header and its
 * back button are rendered outside it, and BottomTabView renders the tab bar
 * outside the scenes. So a caught throw leaves the user a structural way out
 * on every surface, and the surface-scoped fallback does not need copy that
 * offers one.
 *
 * BOUNDARIES NEST INNERMOST-FIRST. A throw inside a tab is caught by that
 * tab's boundary (the tab bar survives); a throw in a pushed AppStack screen is
 * caught by that screen's (the header survives); a throw in a provider, in
 * NavigationContainer itself, in OfflineIndicator or in AudioPlayerOverlay is
 * outside every screen and still falls through to the App.tsx backstop, which
 * is why that one stays.
 *
 * SCREEN FREEZING IS OFF IN THIS APP TODAY, and the check matters because a
 * boundary inside a frozen subtree is a different question. react-native-screens
 * defaults ENABLE_FREEZE to false and `enableFreeze()` is called nowhere in the
 * app; `freezeOnBlur` and `detachInactiveScreens` are set nowhere in
 * AppNavigator. IF SOMEONE CALLS `enableFreeze()` LATER, reopen that question
 * deliberately rather than assuming this comment still holds.
 *
 * WHAT THIS SLICE DOES NOT DO: report. crashReporting.service.ts is a stub with
 * every Sentry call commented out, so a caught throw renders and console-logs
 * and goes nowhere else. Scoping the boundaries makes failures quieter, and
 * nothing is listening. That trade is stated in the 7g Section 13 entry and the
 * wiring is a PRE-LAUNCH Section 5 row.
 */

import React from 'react';

import ErrorBoundary from '../components/shared/ErrorBoundary';

/**
 * ARMED BY HAND FOR A DEVICE WALK, AND INERT IN EVERY SHIPPED BUILD.
 *
 * Slices 7e and 7f closed the two throws that used to be reproducible from a
 * seeded document, so there is no longer any malformed row that crashes
 * anything. A walk that has to prove "a throw costs one surface, not the app"
 * therefore needs a throw it can aim.
 *
 * Set this to a route name - 'Home', 'PillarPractices', 'PillarLearn',
 * 'Community', 'Insights', 'FocusTimer', or any other registered route - and
 * that surface throws on render. Set it back to null when the walk is done.
 *
 * TWO GUARDS, because a crash switch must not be able to ship: the constant is
 * null on every committed line of this file, AND every read of it is behind
 * `__DEV__`, so a production bundle cannot reach the throw even if the constant
 * were edited.
 *
 * WHAT IT PROVES AND WHAT IT DOES NOT. The throw originates inside the boundary
 * wrapper rather than inside the screen's own code, so it demonstrates the
 * boundary's PLACEMENT and CONTAINMENT - which chrome survives, which surfaces
 * keep working - and not that any particular screen is guarded. Keeping it out
 * of screen bodies is also what holds this slice to its fence.
 */
const DEV_CRASH_ROUTE: string | null = null;

/** Throws on render. Only ever mounted when `__DEV__` and the switch match. */
const DevForcedThrow: React.FC<{ routeName: string }> = ({ routeName }) => {
  throw new Error(
    `[slice 7g walk] Forced render throw on route "${routeName}". ` +
      'This is DEV_CRASH_ROUTE in navigation/screenBoundary.tsx, not a real defect.'
  );
};

/**
 * The argument shape React Navigation passes to `screenLayout`, narrowed to the
 * two fields this needs. Declared structurally rather than imported as
 * `ScreenLayoutArgs` so this module stays free of the navigator's generics.
 */
interface ScreenBoundaryArgs {
  route: { name: string };
  children: React.ReactNode;
}

/**
 * Pass as `screenLayout` on a Navigator to wrap every one of its screens.
 *
 * NOT a hook and not a component: React Navigation calls it as a plain function
 * during descriptor construction, so it must not use hooks.
 */
export function screenBoundaryLayout({
  route,
  children,
}: ScreenBoundaryArgs): React.ReactElement {
  const armed = __DEV__ && DEV_CRASH_ROUTE !== null && DEV_CRASH_ROUTE === route.name;

  return (
    <ErrorBoundary scope="surface">
      {armed ? <DevForcedThrow routeName={route.name} /> : children}
    </ErrorBoundary>
  );
}
