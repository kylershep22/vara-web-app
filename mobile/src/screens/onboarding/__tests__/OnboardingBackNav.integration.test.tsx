/**
 * Pre-protocol back navigation (Commit 3) — exercised over the real native-stack
 * transport (per the repo rule: navigation-chain tests must drive the actual
 * navigator, not a mock).
 *
 * Verifies the back chevron pops to the prior screen and that selections on
 * earlier screens survive back/forward navigation: an earlier screen stays
 * mounted in the stack below the top, so its local selection state is preserved
 * when the user returns to it. Firebase writes + auth are mocked at the module
 * boundary; they sit below the navigation chain and don't affect the transport.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveInitialState: jest.fn().mockResolvedValue(undefined),
  saveStressors: jest.fn().mockResolvedValue(undefined),
  savePeakWindow: jest.fn().mockResolvedValue(undefined),
  saveOnboardingStep: jest.fn().mockResolvedValue(undefined),
}));

// Reflect screen pulls db + firestore for its resume fallback. Route params are
// always present in these tests, so the fallback never fires; stub to keep the
// module graph light and offline.
jest.mock('../../../config/firebase', () => ({ db: null }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));

import OnboardingProblemScreen from '../OnboardingProblemScreen';
import OnboardingStateCheckInScreen from '../OnboardingStateCheckInScreen';
import OnboardingStressorScreen from '../OnboardingStressorScreen';
import OnboardingPeakWindowScreen from '../OnboardingPeakWindowScreen';
import OnboardingReflectScreen from '../OnboardingReflectScreen';

const Stack = createNativeStackNavigator();

function ProtocolStub() {
  const { View, Text } = require('react-native');
  return (
    <View testID="protocol-stub">
      <Text>protocol</Text>
    </View>
  );
}

function renderFlow() {
  return render(
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="OnboardingProblem"
        screenOptions={{ headerShown: false, animation: 'none' }}
      >
        <Stack.Screen name="OnboardingProblem" component={OnboardingProblemScreen} />
        <Stack.Screen name="OnboardingStateCheckIn" component={OnboardingStateCheckInScreen} />
        <Stack.Screen name="OnboardingStressor" component={OnboardingStressorScreen} />
        <Stack.Screen name="OnboardingPeakWindow" component={OnboardingPeakWindowScreen} />
        <Stack.Screen name="OnboardingReflect" component={OnboardingReflectScreen} />
        <Stack.Screen name="OnboardingProtocol" component={ProtocolStub} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// The Continue + Go-back labels repeat across mounted screens; the top (most
// recently pushed) screen renders last, so press the last match.
const pressLast = (els: any[]) => fireEvent.press(els[els.length - 1]);

const ARRIVAL = 'How are you arriving right now?';
const DRIVERS = "What's driving it?";
const PEAK = 'When does it peak?';
const REFLECT = "Here's where you're starting.";

describe('Onboarding pre-protocol back navigation', () => {
  test('arrival back chevron returns to the intro, which itself has no back chevron', async () => {
    const { getByLabelText, getAllByLabelText, queryByLabelText, findByText } = renderFlow();

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);

    pressLast(getAllByLabelText('Go back'));
    await findByText(/When your system is running hot/);
    // Intro is the start of the flow — no back affordance.
    expect(queryByLabelText('Go back')).toBeNull();
  });

  test('back from drivers preserves the arrival selection, and it survives a round trip', async () => {
    const { getByLabelText, getAllByLabelText, getByTestId, findByText } = renderFlow();

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);

    fireEvent.press(getByLabelText('Steady'));
    expect(getByTestId('brain-state-radio-steady')).toBeTruthy();

    pressLast(getAllByLabelText('Continue'));
    await findByText(DRIVERS);

    // Back → arrival; selection preserved.
    pressLast(getAllByLabelText('Go back'));
    await findByText(ARRIVAL);
    expect(getByTestId('brain-state-radio-steady')).toBeTruthy();

    // Forward again, then back again — still preserved.
    pressLast(getAllByLabelText('Continue'));
    await findByText(DRIVERS);
    pressLast(getAllByLabelText('Go back'));
    await findByText(ARRIVAL);
    expect(getByTestId('brain-state-radio-steady')).toBeTruthy();
  });

  test('back from peak preserves the checked drivers', async () => {
    const { getByLabelText, getAllByLabelText, findByText } = renderFlow();

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);
    fireEvent.press(getByLabelText('Steady'));
    pressLast(getAllByLabelText('Continue'));
    await findByText(DRIVERS);

    fireEvent.press(getByLabelText('A racing mind'));
    expect(getByLabelText('A racing mind').props.accessibilityState.checked).toBe(true);

    pressLast(getAllByLabelText('Continue'));
    await findByText(PEAK);

    pressLast(getAllByLabelText('Go back'));
    await findByText(DRIVERS);
    expect(getByLabelText('A racing mind').props.accessibilityState.checked).toBe(true);
  });

  test('back from the starting-point transition preserves the peak selection', async () => {
    const { getByLabelText, getAllByLabelText, findByText } = renderFlow();

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);
    fireEvent.press(getByLabelText('Steady'));
    pressLast(getAllByLabelText('Continue'));
    await findByText(DRIVERS);
    pressLast(getAllByLabelText('Continue'));
    await findByText(PEAK);

    fireEvent.press(getByLabelText('Mornings'));
    expect(getByLabelText('Mornings').props.accessibilityState.checked).toBe(true);

    pressLast(getAllByLabelText('Continue'));
    await findByText(REFLECT);

    pressLast(getAllByLabelText('Go back'));
    await findByText(PEAK);
    expect(getByLabelText('Mornings').props.accessibilityState.checked).toBe(true);
  });
});
