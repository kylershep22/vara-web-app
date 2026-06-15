// AppStack-boundary integration test for the pointer hand-off back-button
// behavior.
//
// When a check-in plan hands off to a focus-session pointer, CheckInFlowScreen
// uses navigation.replace('FocusTimer') so the dead CheckInFlow frame is
// removed from the stack. Back from FocusTimer must land on the launching
// surface (Dashboard), NOT a blank CheckInFlow frame.
//
// CheckInFlow is mocked at the module boundary so the test can fire a synthetic
// pointer-only terminal directly; the mock is below the navigation chain, so
// this still exercises the real navigation transport.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/flowSessionMarker', () => ({
  readMarkerForRecoveryOffer: jest.fn().mockResolvedValue(null),
  clearMarker: jest.fn().mockResolvedValue(undefined),
  writeMarker: jest.fn().mockResolvedValue(undefined),
}));

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

let lastOnComplete: ((terminal: Record<string, unknown>) => void) | null = null;

jest.mock('../../../components/checkin/flow/CheckInFlow', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    CheckInFlow: (props: {
      onComplete: (terminal: Record<string, unknown>) => void;
    }) => {
      lastOnComplete = props.onComplete;
      return ReactLib.createElement(
        View,
        { testID: 'mock-checkin-flow-stub' },
        ReactLib.createElement(Text, null, 'CheckInFlow stub')
      );
    },
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CheckInFlowScreen } from '../CheckInFlowScreen';

const Stack = createNativeStackNavigator();

function DashboardStub() {
  const { View, Text } = jest.requireActual('react-native');
  return (
    <View testID="dashboard-stub">
      <Text>Dashboard root</Text>
    </View>
  );
}

// FocusTimer stub exposes a back trigger so we can simulate the user leaving
// the focus screen.
function FocusTimerStub() {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const nav = useNavigation();
  return (
    <View testID="mock-focus-timer-stub">
      <Text>Focus stub</Text>
      <TouchableOpacity testID="mock-focus-timer-back" onPress={() => nav.goBack()}>
        <Text>back</Text>
      </TouchableOpacity>
    </View>
  );
}

const STACK_AFTER_CHIP_TAP = {
  index: 1,
  routes: [
    { key: 'Dashboard-1', name: 'Dashboard' },
    { key: 'CheckInFlow-1', name: 'CheckInFlow', params: { entrySource: 'standard' } },
  ],
};

function renderAppStack() {
  return render(
    <NavigationContainer initialState={STACK_AFTER_CHIP_TAP}>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={DashboardStub} />
        <Stack.Screen name="CheckInFlow" component={CheckInFlowScreen} />
        <Stack.Screen name="FocusTimer" component={FocusTimerStub} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
  lastOnComplete = null;
});

function pointerHandoffTerminal() {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    situation: 'get_through_hard',
    arousal: 'revved',
    valence: 'good',
    quadrant: 'Activated',
    timeWindow: 5,
    plan: { situation: 'get_through_hard', quadrant: 'Activated', slots: [] },
    completion: {
      kind: 'pointer_only',
      pointerLaunched: { pillar: 'focus', type: 'focus-session' },
    },
  };
}

describe('CheckInFlowScreen — focus-session pointer hand-off back-button', () => {
  it('back from FocusTimer after a hand-off lands on Dashboard, not a blank CheckInFlow', async () => {
    const { findByTestId, queryByTestId } = renderAppStack();

    await findByTestId('mock-checkin-flow-stub');
    expect(lastOnComplete).not.toBeNull();

    // Fire the pointer-only terminal the plan would produce on hand-off.
    lastOnComplete!(pointerHandoffTerminal());

    // replace('FocusTimer') → stack becomes [Dashboard, FocusTimer].
    await findByTestId('mock-focus-timer-stub');
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();

    // Back from FocusTimer pops to Dashboard (CheckInFlow was replaced out).
    fireEvent.press(await findByTestId('mock-focus-timer-back'));

    await waitFor(() => expect(queryByTestId('dashboard-stub')).not.toBeNull());
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();
    expect(queryByTestId('mock-focus-timer-stub')).toBeNull();
  });
});
