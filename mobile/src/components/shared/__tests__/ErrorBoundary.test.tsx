// The app's ErrorBoundary (slice 7f; SCOPES ADDED IN 7g).
//
// THIS HEADER SAID THE OPPOSITE UNTIL SLICE 7g, and the correction is the point
// rather than housekeeping. It read "IT WRAPS EVERYTHING. There is a single
// instance, mounted at App.tsx:114 ABOVE the navigator, so any render throw
// anywhere in the app replaces every tab with this fallback rather than
// degrading one screen." That was true, it was what made slices 7e and 7f worth
// building, and 7g is the slice that stopped it being true.
//
// WHERE THE BOUNDARIES ARE NOW. The App.tsx:114 instance remains as the
// BACKSTOP, at scope 'app': it still covers the providers, NavigationContainer,
// OfflineIndicator and AudioPlayerOverlay, and when it catches, the whole app
// really is gone. Every screen and every tab additionally carries its own
// instance at scope 'surface', installed by `screenLayout` on the two
// navigators - see navigation/screenBoundary.tsx and its suite, which is where
// the CONTAINMENT is proved (a throw in one tab leaving the others alive). This
// file pins the fallback's own contract.
//
// WHAT THIS SUITE PINS: the two scopes render different copy, the debug half
// does not exist in production, and the reset clears everything it should.
// React's own error handling still needs no test.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import ErrorBoundary, { ERROR_BOUNDARY_COPY } from '../ErrorBoundary';

// A component that throws on its first render, which is the shape the journey
// read-boundary defects had: an index into a total record with a key that was
// not in it.
const Boom: React.FC = () => {
  throw new Error('PHASE_DISPLAY[reboot] is undefined');
};

// React logs the caught error and the component stack to console.error. That is
// React's own noise about a deliberately thrown error, not a failure.
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  consoleError.mockRestore();
});

// Read from the component rather than retyped, so a copy edit cannot leave this
// suite asserting a string the app no longer renders.
const MESSAGE = ERROR_BOUNDARY_COPY.appTitle;

describe('ErrorBoundary - the user-facing half, identical in both builds', () => {
  test('catches a render throw and shows the message and the way out', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  test('renders its children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Text>the app</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('the app')).toBeTruthy();
    expect(screen.queryByText(MESSAGE)).toBeNull();
  });
});

describe('ErrorBoundary - the diagnostics are DEV-ONLY', () => {
  const realDev = (global as { __DEV__?: boolean }).__DEV__;
  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = realDev;
  });

  // THE DEFECT THIS CLOSES. The panel rendered `error.toString()` and eight
  // lines of component stack to EVERY user, in production, above the Try Again
  // button: internal component names and module paths, as user-facing copy, on
  // a screen that is already the worst moment of someone's session.
  test('a production build shows NO error text and NO component stack', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/PHASE_DISPLAY/)).toBeNull();
    expect(screen.queryByText(/Component stack/)).toBeNull();
    // And the half the user is meant to read is still there, which is the whole
    // point of gating the panel rather than deleting the screen.
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  // THE ANTI-VACUITY DIRECTION, and it is load bearing here: a boundary that
  // had simply lost its diagnostics would satisfy the test above. A developer
  // must still see on device exactly what they saw before.
  test('a dev build still shows the error text', () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/PHASE_DISPLAY/)).toBeTruthy();
  });
});

/**
 * THE TWO SCOPES (slice 7g).
 *
 * The copy differs because what failed differs, and getting this backwards is
 * the specific mistake the slice exists to avoid: telling someone the app is
 * gone while three of their four tabs are still working underneath the panel.
 */
describe('ErrorBoundary - app scope versus surface scope', () => {
  test('the default scope is app, and it says the app-level thing', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(ERROR_BOUNDARY_COPY.appTitle)).toBeTruthy();
    expect(screen.getByText(ERROR_BOUNDARY_COPY.appMessage)).toBeTruthy();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeNull();
  });

  test('an explicit app scope is the same as the default', () => {
    render(
      <ErrorBoundary scope="app">
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(ERROR_BOUNDARY_COPY.appTitle)).toBeTruthy();
    expect(screen.getByText(ERROR_BOUNDARY_COPY.appMessage)).toBeTruthy();
  });

  test('surface scope shows the surface title and DROPS the second line', () => {
    render(
      <ErrorBoundary scope="surface">
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(ERROR_BOUNDARY_COPY.surfaceTitle)).toBeTruthy();
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.appTitle)).toBeNull();
    // The recovery advice is an app-scope line: at app scope the app is gone
    // and restarting is a real instruction. At surface scope the navigator
    // chrome is the way out and the title carries the whole message.
    expect(screen.queryByText(ERROR_BOUNDARY_COPY.appMessage)).toBeNull();
  });

  test('both scopes keep Try Again', () => {
    const { unmount } = render(
      <ErrorBoundary scope="surface">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(ERROR_BOUNDARY_COPY.tryAgain)).toBeTruthy();
    unmount();

    render(
      <ErrorBoundary scope="app">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(ERROR_BOUNDARY_COPY.tryAgain)).toBeTruthy();
  });
});

/**
 * TWO CLAIMS THAT WERE FALSE, BOTH REMOVED IN SLICE 7g.
 *
 * Nothing reports: crashReporting.service.ts has every Sentry call commented
 * out and an `isInitialized` flag that is never set true, and this boundary is
 * its only caller in the app. Two app-scope strings promised otherwise, on the
 * one screen someone only ever reads at their worst moment.
 *
 *   - the title ended "We've been notified." - a report that is not sent;
 *   - the message read "We'll look into this soon." - THE SAME CLAIM ONE STEP
 *     SOFTER, and the one that is easy to leave behind because it sounds like
 *     sympathy rather than a promise. Nobody will look into it, because nobody
 *     is told.
 *
 * BOTH PINNED AS NEGATIVES so neither can quietly come back while the wiring is
 * still absent. When @sentry/react-native is actually wired (the PRE-LAUNCH
 * Section 5 row), this block is the thing to revisit deliberately - at that
 * point a notification sentence would be TRUE and is a copy decision, not a
 * correctness one.
 */
describe('ErrorBoundary - no unearned reporting claim', () => {
  // Every way the app has claimed, or might re-claim, that someone is on it.
  const REPORTING_CLAIM = /notified|look(ing)? into|we('| ha)?ve been|our team|reported/i;

  test('no string claims a report was sent or that anyone will look', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.queryByText(REPORTING_CLAIM)).toBeNull();
    expect(ERROR_BOUNDARY_COPY.appTitle).not.toMatch(REPORTING_CLAIM);
    expect(ERROR_BOUNDARY_COPY.appMessage).not.toMatch(REPORTING_CLAIM);
    expect(ERROR_BOUNDARY_COPY.surfaceTitle).not.toMatch(REPORTING_CLAIM);

    // ANTI-VACUITY. A regex that matched nothing would satisfy every assertion
    // above, including against the old copy. These are the two strings this
    // slice removed; the pattern must still catch them.
    expect("Something didn't work as expected. We've been notified.").toMatch(
      REPORTING_CLAIM
    );
    expect("We'll look into this soon.").toMatch(REPORTING_CLAIM);
  });
});

/**
 * THE RESET CLEARS ALL THREE FIELDS (slice 7g).
 *
 * `handleReset` used to clear `hasError` and `error` and leave `componentStack`
 * behind, so a second, different error rendered the FIRST one's stack under it
 * in a dev build. Same family as the TS2741 fixed in this slice: a state shape
 * with three fields being handled as though it had two.
 */
describe('ErrorBoundary - Try Again clears the whole error state', () => {
  // ASSERTED ON THE INSTANCE, DELIBERATELY, and the reason is worth stating
  // because reaching into a component's state is normally the wrong move.
  //
  // A STALE `componentStack` IS NOT OBSERVABLE IN A SETTLED RENDER. It shows
  // for exactly one frame: getDerivedStateFromError sets hasError and error,
  // the fallback renders with whatever stack was left over, and then
  // componentDidCatch immediately sets the real one and re-renders. RNTL
  // flushes both, so any rendered-output assertion here would find the CORRECT
  // stack whether the bug was fixed or not - it would be green against the
  // broken code, which is the vacuity this repo keeps catching after the fact.
  //
  // So this pins the state transition itself, which is the thing the slice
  // actually changed, rather than dressing up an assertion that proves nothing.
  test('handleReset clears error, hasError AND componentStack', () => {
    const ref = React.createRef<ErrorBoundary>();

    // The child has to be able to STOP throwing, or the reset immediately
    // re-arms the boundary on the remount and the assertions below read the
    // second error rather than the cleared state. Controlled from outside the
    // component because React 19 retries a failed concurrent render, so a child
    // that heals itself can recover on React's own retry and never reach the
    // boundary at all.
    const child = { broken: true };
    const Toggleable: React.FC = () => {
      if (child.broken) throw new Error('PHASE_DISPLAY[reboot] is undefined');
      return <Text>recovered</Text>;
    };

    render(
      <ErrorBoundary ref={ref}>
        <Toggleable />
      </ErrorBoundary>
    );

    // All three are populated after the catch. The third is the one that used
    // to survive the reset.
    expect(ref.current?.state.hasError).toBe(true);
    expect(ref.current?.state.error).toBeTruthy();
    expect(ref.current?.state.componentStack).toBeTruthy();

    child.broken = false;
    fireEvent.press(screen.getByText(ERROR_BOUNDARY_COPY.tryAgain));

    // The subtree really came back, so the reset is a reset and not just a
    // cleared flag over a still-broken child.
    expect(screen.getByText('recovered')).toBeTruthy();

    expect(ref.current?.state.hasError).toBe(false);
    expect(ref.current?.state.error).toBeNull();
    expect(ref.current?.state.componentStack).toBeNull();
  });
});
