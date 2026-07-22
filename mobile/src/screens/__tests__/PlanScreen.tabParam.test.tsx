// Tests for PlanScreen's `tab` route param — the sub-tab contract that deep
// linkers depend on.
//
// PlanScreen owns a local segmented control ('habits' | 'routines') that is NOT
// a navigator, so callers select a sub-tab by passing `{ tab: 'routines' }` as
// route params (the dashboard routine CTAs, the routine-reminder notification,
// and the check-in flow's plan pointer all do this). The screen falls back to
// 'habits' when no param arrives.
//
// These tests pin both halves so a rename on either side fails loudly:
//   - 'routines' is the exact accepted value (a typo would silently land on
//     Habits, which is the grip_on_day pointer bug this guards against)
//   - the no-param default stays 'habits' for every entry point that passes none

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

jest.mock('../HabitsScreen', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactLib.createElement(View, { testID: 'plan-habits-content' }),
  };
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

describe('PlanScreen — `tab` route param selects the sub-tab', () => {
  it("lands on Routines when navigated with { tab: 'routines' }", () => {
    mockRoute.params = { tab: 'routines' };
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-routines-content')).not.toBeNull();
    expect(queryByTestId('plan-habits-content')).toBeNull();
  });

  it("lands on Habits when navigated with { tab: 'habits' }", () => {
    mockRoute.params = { tab: 'habits' };
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-habits-content')).not.toBeNull();
    expect(queryByTestId('plan-routines-content')).toBeNull();
  });

  it('keeps the habits default for entry points that pass no tab param', () => {
    const { queryByTestId } = render(<PlanScreen />);

    expect(queryByTestId('plan-habits-content')).not.toBeNull();
    expect(queryByTestId('plan-routines-content')).toBeNull();
  });
});
