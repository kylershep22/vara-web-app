/**
 * What the capture navigator actually mounts (journey slices 3c-i and 3c-ii).
 *
 * WHY THIS EXISTS. The screens navigate by name, and a name that no navigator
 * registers is a press that does nothing. Asserting the route CONSTANT alone
 * would prove nothing about what mounts, which is a failure mode this project
 * has already paid for once. So this renders the real navigator against a
 * recording stack and reads back the names and options it declared, while the
 * screen suites assert ARRIVAL at those same names. Registration and arrival
 * together are the claim; either alone is not.
 */
const registered: { name: string; options?: Record<string, unknown> }[] = [];

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: any) => React.createElement(React.Fragment, null, children),
      Screen: ({ name, options }: any) => {
        registered.push({ name, options });
        return null;
      },
    }),
  };
});

// The provider and every screen are irrelevant here; only the registration is.
jest.mock('../RemoveCaptureContext', () => ({
  RemoveCaptureProvider: ({ children }: any) => children,
}));
jest.mock('../IdentifyScreen', () => ({ IdentifyScreen: () => null }));
jest.mock('../ClarifyScreen', () => ({ ClarifyScreen: () => null }));
jest.mock('../SleepScreen', () => ({ SleepScreen: () => null }));
jest.mock('../TimingScreen', () => ({ TimingScreen: () => null }));
jest.mock('../FirstMoveScreen', () => ({ FirstMoveScreen: () => null }));
jest.mock('../ReplacementScreen', () => ({ ReplacementScreen: () => null }));
jest.mock('../SupportScreen', () => ({ SupportScreen: () => null }));

import React from 'react';
import { render } from '@testing-library/react-native';

import { RemoveCaptureNavigator } from '../RemoveCaptureNavigator';
import { REMOVE_CAPTURE_ROUTES } from '../routes';

beforeEach(() => {
  registered.length = 0;
});

describe('the capture navigator', () => {
  test('registers every route in the table, and nothing that is not in it', () => {
    render(<RemoveCaptureNavigator />);

    // Anti-vacuity: if the recording stack ever stopped receiving screens this
    // would be empty and every assertion below would pass for free.
    expect(registered.length).toBeGreaterThan(0);
    expect(registered.map((s) => s.name).sort()).toEqual(
      Object.values(REMOVE_CAPTURE_ROUTES).slice().sort()
    );
  });

  test('THE REPLACEMENT SCREEN IS MOUNTED, so the first-move fork can arrive', () => {
    render(<RemoveCaptureNavigator />);
    expect(registered.map((s) => s.name)).toContain(REMOVE_CAPTURE_ROUTES.Replacement);
  });

  test('the replacement and support screens both refuse the dismiss gesture', () => {
    // Support: swiping back would return the user to the text they typed.
    // Replacement: the capture is already written by the time it mounts, so a
    // swipe lands on a first-move screen whose work is done.
    render(<RemoveCaptureNavigator />);
    const gestureless = registered
      .filter((s) => s.options?.gestureEnabled === false)
      .map((s) => s.name)
      .sort();
    expect(gestureless).toEqual(
      [REMOVE_CAPTURE_ROUTES.Replacement, REMOVE_CAPTURE_ROUTES.Support].sort()
    );
  });
});
