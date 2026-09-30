// Tests for PlanScreen's `tab` route param after V1-HABITS-RETIREMENT.
//
// PlanScreen is routines only (ruling B of the V1 SCOPE REVISION block). Its
// callers still pass `{ tab: 'routines' }` (the Journey Routines card, the
// routine-reminder tap, the check-in hand-off), and a stale `{ tab: 'habits' }`
// could still arrive from anything written before habits left. The contract is
// that the param is IGNORED: every entry lands on the routines list, and there
// is no Habits label and no tab switch to reach habits from.
//
// The route mock below still carries params, so each case really does hand the
// screen the param it names; the screen simply has nothing to select with it.

const mockNavigate = jest.fn();
const mockRoute: { params?: { tab?: string } } = {};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

jest.mock('../Time/RoutinesTab', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    RoutinesTab: () => ReactLib.createElement(View, { testID: 'plan-routines-content' }),
  };
});

jest.mock('../Time/ActiveRoutinePlayer', () => ({
  ActiveRoutinePlayer: () => null,
}));

jest.mock('../../components/ai/GuidePill', () => ({
  GuidePill: () => null,
}));

jest.mock('../../hooks/useNotificationOptIn', () => ({
  useNotificationOptIn: () => ({
    shouldShowPrompt: false,
    markPromptShown: jest.fn(),
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';

import PlanScreen from '../PlanScreen';

beforeEach(() => {
  mockNavigate.mockClear();
  delete mockRoute.params;
});

describe('PlanScreen: routines only, whatever `tab` param arrives', () => {
  it("lands on Routines when navigated with { tab: 'routines' }", () => {
    mockRoute.params = { tab: 'routines' };
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-routines-content')).not.toBeNull();
  });

  it("lands on Routines when a stale { tab: 'habits' } arrives", () => {
    mockRoute.params = { tab: 'habits' };
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-routines-content')).not.toBeNull();
  });

  it('lands on Routines for entry points that pass no tab param', () => {
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-routines-content')).not.toBeNull();
  });

  it('renders no Habits label, no tab switch and no habit filters', () => {
    const { queryByText, getByText } = render(<PlanScreen />);

    // RoutinesTab is mocked to a bare View, so any "Habits" or "Routines" text
    // on screen could only come from PlanScreen's own (removed) tab switch.
    expect(queryByText('Habits')).toBeNull();
    expect(queryByText('Routines')).toBeNull();
    for (const label of ['All', 'Active', 'Complete']) {
      expect(queryByText(label)).toBeNull();
    }
    expect(queryByText(/habit/i)).toBeNull();
    expect(getByText("Routines you've built")).toBeTruthy();
  });
});
