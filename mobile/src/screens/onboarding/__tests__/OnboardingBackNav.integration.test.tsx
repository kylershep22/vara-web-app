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

// Screen 2 is now the two-tap circumplex read (StatePickStepView), rendered bare
// with its own "Back" affordance and the arousal question as its title.
const ARRIVAL = "How's your body right now?";
// The two-tap read auto-advances on the feeling tap. low + good = Calm, which
// bridges to Steady (positive valence), so the driver screen shows the positive
// stem + options and the peak screen shows the neutral title.
const arriveAsSteady = (u: {
  getByLabelText: any;
  getAllByTestId: any;
  findByText: any;
}) => {
  pressLast(u.getAllByTestId('checkin-flow-arousal-low'));
  pressLast(u.getAllByTestId('checkin-flow-valence-good'));
};
const DRIVERS = "What's behind it?";
const POSITIVE_DRIVER = "A good night's sleep";
const PEAK = 'When would a daily moment fit best?';
const REFLECT = "Here's where you're starting.";

describe('Onboarding pre-protocol back navigation', () => {
  test('arrival back chevron returns to the intro, which itself has no back chevron', async () => {
    const { getByLabelText, getAllByLabelText, queryByLabelText, findByText } = renderFlow();

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);

    // Screen 2's own back affordance is labelled "Back" (not the scaffold "Go back").
    pressLast(getAllByLabelText('Back'));
    await findByText(/When your system is running hot/);
    // Intro is the start of the flow — no back affordance of either kind.
    expect(queryByLabelText('Back')).toBeNull();
    expect(queryByLabelText('Go back')).toBeNull();
  });

  test('back from drivers returns to arrival with the energy read retained', async () => {
    const u = renderFlow();
    const { getByLabelText, getAllByLabelText, getAllByTestId, queryByTestId, findByText } = u;

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);

    arriveAsSteady(u);
    await findByText(DRIVERS);

    // Back → arrival; the mounted read retained its energy answer, so the feeling
    // block is still revealed without re-tapping (native-stack mount retention).
    pressLast(getAllByLabelText('Go back'));
    await findByText(ARRIVAL);
    expect(queryByTestId('checkin-flow-feeling-block')).toBeTruthy();

    // Forward again (re-tap the feeling) — drivers still reachable, still positive.
    pressLast(getAllByTestId('checkin-flow-valence-good'));
    await findByText(DRIVERS);
  });

  test('back from peak preserves the checked drivers', async () => {
    const u = renderFlow();
    const { getByLabelText, getAllByLabelText, findByText } = u;

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);
    arriveAsSteady(u);
    await findByText(DRIVERS);

    fireEvent.press(getByLabelText(POSITIVE_DRIVER));
    expect(getByLabelText(POSITIVE_DRIVER).props.accessibilityState.checked).toBe(true);

    pressLast(getAllByLabelText('Continue'));
    await findByText(PEAK);

    pressLast(getAllByLabelText('Go back'));
    await findByText(DRIVERS);
    expect(getByLabelText(POSITIVE_DRIVER).props.accessibilityState.checked).toBe(true);
  });

  test('back from the starting-point transition preserves the peak selection', async () => {
    const u = renderFlow();
    const { getByLabelText, getAllByLabelText, findByText } = u;

    fireEvent.press(getByLabelText('Begin'));
    await findByText(ARRIVAL);
    arriveAsSteady(u);
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
