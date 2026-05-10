// Round 14 — AppStack-boundary integration test for the try_longer
// back-button behavior fix.
//
// Round 13 device verification surfaced: Daily check-in → state → time
// → recommendation → run → re-check (not_shifted) → response → "Try
// something longer" → Practices → BACK BUTTON → blank white screen
// with FAB visible. Root cause: try_longer's handleComplete used
// navigation.navigate('Practices', ...) which pushes Practices on top
// of CheckInFlow. CheckInFlow at this moment is in flow_complete
// terminal state, with render returning null. Back from Practices
// pops to CheckInFlow's dead frame.
//
// Fix: navigation.replace removes CheckInFlow from the stack at the
// moment of transition. Back from Practices/PracticeRun lands on
// Dashboard (whatever was below CheckInFlow).
//
// This test exercises the actual transport per the round-11 META
// rule "Tests for navigation chains must exercise the actual
// transport." Real NavigationContainer + native-stack + back-button
// trigger. CheckInFlow is mocked at the module boundary so we can
// drive onComplete with a synthetic try_longer terminal directly —
// the mock is below the navigation chain (CheckInFlow's internal
// flow doesn't touch the navigator), so this doesn't violate the
// META rule. PracticeRun is mocked because it pulls expo-av through
// the player tree, and we don't drive into it in any test here.

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

const mockGetLateNightNSDRSwap = jest.fn();
jest.mock('../../../services/lateNightNSDRSwap', () => ({
  getLateNightNSDRSwap: (...args: unknown[]) => mockGetLateNightNSDRSwap(...args),
}));

// Capture the onComplete handler so tests can fire a synthetic
// try_longer terminal directly. The full state-pick → ... →
// response → try_longer drive is exhaustively covered by other
// suites; this test focuses narrowly on the navigation transport
// outcome. The CheckInFlow stub renders a marker testID so we can
// assert it is/isn't present after navigation events.
let lastOnComplete:
  | ((terminal: Record<string, unknown>) => void)
  | null = null;

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

// PracticeRun stub — the integration test asserts the screen mounts;
// it does not exercise BrowseRunFlow internals (which would pull
// expo-av and crash under jest's react-native preset). The stub
// exposes a "go back" trigger via testID so the override-branch
// back-button test can simulate the user's goBack from PracticeRun.
jest.mock('../../practices/PracticeRunScreen', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const { useNavigation } = jest.requireActual('@react-navigation/native');
  return {
    PracticeRunScreen: () => {
      const nav = useNavigation();
      return ReactLib.createElement(
        View,
        { testID: 'mock-practice-run-stub' },
        ReactLib.createElement(Text, null, 'PracticeRun stub'),
        ReactLib.createElement(
          TouchableOpacity,
          {
            testID: 'mock-practice-run-back',
            onPress: () => nav.goBack(),
          },
          ReactLib.createElement(Text, null, 'back')
        )
      );
    },
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CheckInFlowScreen } from '../CheckInFlowScreen';
import { PracticesIndexScreen } from '../../practices/PracticesIndexScreen';
import { PracticeRunScreen } from '../../practices/PracticeRunScreen';

const Stack = createNativeStackNavigator();

// Dashboard stub — distinguishable testID so the test can assert
// "back from Practices/PracticeRun lands here, not on the dead
// CheckInFlow frame."
function DashboardStub() {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return ReactLib.createElement(
    View,
    { testID: 'dashboard-stub' },
    ReactLib.createElement(Text, null, 'Dashboard root')
  );
}

// Initial navigation state representing the production stack shape
// after a dashboard chip-tap: Dashboard at index 0, CheckInFlow at
// index 1 (active). The user runs a protocol, re-checks, taps "Try
// something longer," and the test asserts what happens next.
const STACK_AFTER_CHIP_TAP = {
  index: 1,
  routes: [
    { key: 'Dashboard-1', name: 'Dashboard' },
    {
      key: 'CheckInFlow-1',
      name: 'CheckInFlow',
      params: { entrySource: 'standard' },
    },
  ],
};

function renderAppStack() {
  return render(
    <NavigationContainer initialState={STACK_AFTER_CHIP_TAP}>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={DashboardStub} />
        <Stack.Screen
          name="CheckInFlow"
          component={CheckInFlowScreen}
        />
        <Stack.Screen name="Practices" component={PracticesIndexScreen} />
        <Stack.Screen name="PracticeRun" component={PracticeRunScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
  mockGetLateNightNSDRSwap.mockReset();
  mockGetLateNightNSDRSwap.mockReturnValue(null);
  lastOnComplete = null;
});

function tryLongerTerminal(stateBefore: 'wired' | 'foggy') {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    stateBefore,
    timeWindow: 2,
    protocol: { id: 'cyclic-sighing-2' },
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: stateBefore, // same-state in negative zone → not_shifted
    outcome: 'not_shifted',
    userChosenNextStep: 'try_longer',
  };
}

describe('CheckInFlowScreen — try_longer no_override back-button (Round 14)', () => {
  it('back from Practices after try_longer lands on Dashboard, not blank CheckInFlow', async () => {
    const { findByTestId, queryByTestId } = renderAppStack();

    // Stack starts as [Dashboard, CheckInFlow]. CheckInFlow stub
    // captures onComplete.
    await findByTestId('mock-checkin-flow-stub');
    expect(lastOnComplete).not.toBeNull();

    // Fire the terminal that the response screen would dispatch
    // when the user taps "Try something longer."
    lastOnComplete!(tryLongerTerminal('wired'));

    // After the round-14 fix: replace('Practices', ...) executes →
    // stack becomes [Dashboard, Practices]. Practices renders.
    await findByTestId('practices-index');
    // CheckInFlow stub MUST be gone (replace removed it from the stack).
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();

    // Tap Practices' back button. The PracticesIndexScreen's
    // useLayoutEffect installs a custom headerLeft via
    // navigation.setOptions, which native-stack's mocked headerLeft
    // does not surface in the test tree. The test container's
    // navigation.goBack call simulates the same outcome.
    //
    // PracticesIndexScreen's back button implementation (lines
    // 105-120) calls navigation.goBack(). Find the rendered back
    // button — it's exposed via testID 'practices-back-button'.
    const backButton = await findByTestId('practices-back-button');
    fireEvent.press(backButton);

    // After back: stack should be [Dashboard]. Dashboard stub
    // visible; mock-checkin-flow-stub still absent (the round-14
    // fix removed it from the stack before back was even pressed).
    await waitFor(() => {
      expect(queryByTestId('dashboard-stub')).not.toBeNull();
    });
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();
    expect(queryByTestId('practices-index')).toBeNull();
  });
});

describe('CheckInFlowScreen — try_longer late_night_nsdr_override back-button (Round 14)', () => {
  it('back from PracticeRun (NSDR-20 override) after try_longer lands on Dashboard, not blank CheckInFlow', async () => {
    // Pin the override branch so try_longer routes to PracticeRun
    // (not Practices) per the late-night NSDR override.
    mockGetLateNightNSDRSwap.mockReturnValue({ protocolId: 'nsdr-20' });

    const { findByTestId, queryByTestId } = renderAppStack();
    await findByTestId('mock-checkin-flow-stub');
    expect(lastOnComplete).not.toBeNull();

    lastOnComplete!(tryLongerTerminal('wired'));

    // After the round-14 fix: replace('PracticeRun', ...) executes →
    // stack becomes [Dashboard, PracticeRun].
    await findByTestId('mock-practice-run-stub');
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();

    // Press the stub's goBack trigger. With the round-14 fix in
    // place, stack should pop to [Dashboard]. With the bug
    // (navigate), stack would have been [Dashboard, CheckInFlow,
    // PracticeRun] and back would surface the dead CheckInFlow
    // frame — mock-checkin-flow-stub would re-appear instead of
    // dashboard-stub.
    fireEvent.press(await findByTestId('mock-practice-run-back'));

    await waitFor(() => {
      expect(queryByTestId('dashboard-stub')).not.toBeNull();
    });
    expect(queryByTestId('mock-checkin-flow-stub')).toBeNull();
    expect(queryByTestId('mock-practice-run-stub')).toBeNull();
  });
});
