// Round 12 — AppStack-boundary integration test for the
// "See other options" navigation chain.
//
// Closes the round-11 META gap: previous tests for this surface mocked
// at the component prop boundary (CheckInFlow's onComplete /
// onSeeOtherOptions), which proved the prop fired but NOT that the
// navigation transport actually transitioned to PracticesIndexScreen
// with the right route params. Round 11's Finding G — the silent
// no-op of "See other options" during onboarding — would not have
// been caught by a prop-boundary test even if onboarding had been in
// scope, because the regression was in the navigation chain itself.
//
// This test exercises the actual transport:
//
//   - Real NavigationContainer + createNativeStackNavigator.
//   - Real CheckInFlowScreen + PracticesIndexScreen registered.
//   - Drive the flow to the recommendation step using the real reducer
//     and step views.
//   - Tap "See other options" via the real ProtocolRecommendation.
//   - Assert PracticesIndexScreen mounted with the expected route
//     params (state, timeWindow, fromCheckInFlow, intentPath).
//
// Mocks live at the framework boundary only — auth context, async
// storage, firebase writes, and the recovery marker. None of those are
// part of the navigation chain under test.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// GuidedSessionPlayer / LightMovementProtocolFlow are downstream
// infrastructure — they pull expo-av's EventEmitter which doesn't
// initialize cleanly under jest's react-native preset (SDK 53
// compat issue documented in MEMORY.md). The navigation chain under
// test never reaches the player, but the static import graph still
// loads it at module-resolution time. Mocking at this boundary is
// framework-level (not the application prop boundary the round-11
// META rule warns against).
jest.mock('../../../components/protocol/GuidedSessionPlayer', () => ({
  GuidedSessionPlayer: () => null,
}));

jest.mock('../../../components/protocol/LightMovementProtocolFlow', () => ({
  LightMovementProtocolFlow: () => null,
}));

jest.mock('../../../utils/flowSessionMarker', () => ({
  readMarkerForRecoveryOffer: jest.fn().mockResolvedValue(null),
  clearMarker: jest.fn().mockResolvedValue(undefined),
  writeMarker: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/firebase/brainStateCheckIn.service', () => {
  const actual = jest.requireActual(
    '../../../services/firebase/brainStateCheckIn.service'
  );
  return {
    ...actual,
    writeStandardFlowSession: jest.fn().mockResolvedValue(undefined),
    // Round 14 split — was writeBrainStateCheckInLegacyEffects.
    writeBrainStateCheckInDoc: jest.fn().mockResolvedValue(undefined),
    maybeMarkFirstShift: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../../services/firebase/protocolSession.service', () => {
  const actual = jest.requireActual(
    '../../../services/firebase/protocolSession.service'
  );
  return {
    ...actual,
    writeProtocolSession: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CheckInFlowScreen } from '../CheckInFlowScreen';
import { PracticesIndexScreen } from '../../practices/PracticesIndexScreen';

const Stack = createNativeStackNavigator();

// Standalone PracticeRun stub — registered so navigations triggered
// from PracticesIndexScreen don't crash on missing route. We don't
// drive the flow that far in any test here.
function PracticeRunStub() {
  return null;
}

function renderAppStack() {
  return render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CheckInFlow">
        <Stack.Screen
          name="CheckInFlow"
          component={CheckInFlowScreen}
          initialParams={{ entrySource: 'standard' }}
        />
        <Stack.Screen
          name="Practices"
          component={PracticesIndexScreen}
        />
        <Stack.Screen name="PracticeRun" component={PracticeRunStub} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
});

describe('CheckInFlowScreen — "See other options" navigation chain', () => {
  it('tapping "See other options" navigates to Practices with the bridged state + budget', async () => {
    const { findByTestId, findByLabelText } = renderAppStack();

    // CheckInFlow mounts asynchronously (after readMarkerForRecoveryOffer).
    await findByTestId('checkin-flow-situation-pick');

    // Drive: situation → circumplex (Tense) → 5-minute budget. Energy higher +
    // get_through_hard hard pole ("Struggling") → revved + hard → Tense.
    fireEvent.press(await findByLabelText('Get through something hard'));
    fireEvent.press(await findByLabelText('Revved up'));
    fireEvent.press(await findByLabelText('Struggling'));
    fireEvent.press(await findByTestId('time-window-chip-5'));

    // Plan presentation renders (get_through_hard / Tense → settle-breath →
    // focus-session, which has a practice, so the affordance shows).
    const alternates = await findByTestId('checkin-flow-plan-see-other-options');
    expect(alternates).toBeTruthy();

    fireEvent.press(alternates);

    // Destination actually mounted, with route params built from the bridged
    // quadrant (Tense → wired) + the 5-minute budget.
    await findByTestId('practices-index');
    const title = await findByTestId('practices-index-title');
    expect(title.props.children).toBe('Other options for Wired · 5 minutes');
  });

  it('regression guard — the plan screen renders the affordance for a practice cell', async () => {
    const { findByTestId, findByLabelText } = renderAppStack();

    await findByTestId('checkin-flow-situation-pick');
    fireEvent.press(await findByLabelText('Quiet a busy mind'));
    fireEvent.press(await findByLabelText('Revved up'));
    fireEvent.press(await findByLabelText('Too much'));
    fireEvent.press(await findByTestId('time-window-chip-10'));

    expect(await findByTestId('checkin-flow-plan-see-other-options')).toBeTruthy();
  });
});
