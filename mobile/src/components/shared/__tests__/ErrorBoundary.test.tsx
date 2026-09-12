// The app's one and only ErrorBoundary (slice 7f).
//
// IT WRAPS EVERYTHING. There is a single instance, mounted at App.tsx:114 ABOVE
// the navigator, so any render throw anywhere in the app replaces every tab
// with this fallback rather than degrading one screen. That fact is what made
// slices 7e and 7f worth building, and it is asserted nowhere else, so this
// file is where it is written down.
//
// WHAT THIS SUITE PINS is the fallback's contract, not the boundary mechanism:
// React's own error handling needs no test. The user-facing half must be the
// same in both builds, and the DEBUG half must not exist in production.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import ErrorBoundary from '../ErrorBoundary';

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

const MESSAGE = "Something didn't work as expected. We've been notified.";

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
