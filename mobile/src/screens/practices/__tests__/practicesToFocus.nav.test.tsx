// Restore-Focus path — IA restructure step 4a.
//
// THE point of this slice, asserted end to end through a REAL navigator rather
// than a mocked `navigate` spy:
//
//   Practices tab → "Focus & Time" card → FocusHubScreen → "Focus rhythms" row
//                                                        → FocusRhythmsScreen
//
// Every hop in that chain was dark from step 2 until now. FocusHubScreen was
// registered nowhere (nothing navigated to ROUTES.PillarFocus), and
// FocusRhythmsScreen — whose only entry point is a row inside the hub — was
// unreachable behind it, while both screens' own unit suites stayed green the
// whole time. A spy asserting `navigate('PillarFocus')` would have stayed green
// too. Only actually arriving on the screen proves the route is registered, so
// this suite renders the stack and looks for what lands.
//
// The three pillar hubs are registered here with the SAME options they carry in
// AppNavigator (headerShown, empty title) so the pushed-not-tab shape is what is
// exercised. Deliberately a small local stack and not AppNavigator itself:
// AppNavigator pulls auth, subscriptions, RevenueCat and the whole onboarding
// tree. The complementary guard that these route names are the ones AppNavigator
// really registers lives in navigation/__tests__/pillarRoutes.test.ts.

// A fuller safe-area stub than the pillar screens' own suites use. Those only
// need SafeAreaView; a real navigator also pulls @react-navigation/elements'
// SafeAreaProviderCompat, which reads the provider, both contexts, and
// initialWindowMetrics. Missing any one of them renders as an undefined
// component rather than as a helpful error.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    SafeAreaView: ({ children, style }: any) =>
      React.createElement(View, { style }, children),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// The Focus hub and rhythms screens read the signed-in user to load rhythms.
// Stubbed so this suite does not pull the AuthContext / RevenueCat chain.
const mockGetFocusRhythms = jest.fn();
const mockSaveFocusRhythms = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetFocusRhythms(...a),
  saveFocusRhythms: (...a: any[]) => mockSaveFocusRhythms(...a),
}));
// The docked Guide pill pulls the AI chat + consent stack; not what is under
// test here.
jest.mock('../../../components/ai/GuidePill', () => ({
  GuidePill: () => null,
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PracticesHubScreen } from '../PracticesHubScreen';
import { FocusHubScreen } from '../../Focus/FocusHubScreen';
import { FocusRhythmsScreen } from '../../Focus/FocusRhythmsScreen';
import { EnergyHubScreen } from '../../Energy/EnergyHubScreen';
import { ROUTES } from '../../../navigation/routes';

const Stack = createNativeStackNavigator();

function renderStack() {
  return render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={ROUTES.PillarPractices}>
        <Stack.Screen
          name={ROUTES.PillarPractices}
          component={PracticesHubScreen}
          options={{ headerShown: false }}
        />
        {/* Same options these carry in AppNavigator: a former tab root pushed
            over the tab bar, with an empty title because each screen renders its
            own h1. */}
        <Stack.Screen
          name={ROUTES.PillarFocus}
          component={FocusHubScreen}
          options={{ headerShown: true, title: '' }}
        />
        <Stack.Screen
          name={ROUTES.PillarEnergy}
          component={EnergyHubScreen}
          options={{ headerShown: true, title: '' }}
        />
        <Stack.Screen
          name={ROUTES.FocusRhythms}
          component={FocusRhythmsScreen}
          options={{ headerShown: true, title: 'Focus rhythms' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockGetFocusRhythms.mockResolvedValue([]);
  mockSaveFocusRhythms.mockResolvedValue(undefined);
});

describe('Practices → Focus: the step-4a restore path', () => {
  it('does not render the pillar hubs until they are navigated to', () => {
    // The guard that stops every other test in this file from passing
    // vacuously. If a native stack under jest rendered all of its screens at
    // once, "arriving on the Focus hub" would be true before anything was
    // pressed, and this suite would prove nothing about reachability — which is
    // the only thing it exists to prove.
    const { getByTestId, queryByTestId } = renderStack();

    expect(getByTestId('practices-hub')).toBeTruthy();
    expect(queryByTestId('focus-hub')).toBeNull();
    expect(queryByTestId('energy-hub')).toBeNull();
    expect(queryByTestId('focus-rhythms')).toBeNull();
  });

  it('opens the Focus hub from the Focus & Time card', async () => {
    const { getByTestId, queryByTestId } = renderStack();

    expect(queryByTestId('focus-hub')).toBeNull();

    fireEvent.press(getByTestId('practices-hub-card-focus-time'));

    // Arriving on the hub is the assertion. This is what was impossible
    // between step 2 and step 4a.
    await waitFor(() => expect(getByTestId('focus-hub')).toBeTruthy());
  });

  it('reaches Focus rhythms from inside the Focus hub, unchanged', async () => {
    const { getByTestId, queryByTestId } = renderStack();

    fireEvent.press(getByTestId('practices-hub-card-focus-time'));
    await waitFor(() => expect(getByTestId('focus-hub')).toBeTruthy());
    expect(queryByTestId('focus-rhythms')).toBeNull();

    // The hub's own secondary row, untouched by this slice.
    fireEvent.press(getByTestId('focus-hub-card-rhythms'));

    await waitFor(() => expect(getByTestId('focus-rhythms')).toBeTruthy());
  });

  it('opens the Energy hub from the Energy card', async () => {
    const { getByTestId, queryByTestId } = renderStack();

    expect(queryByTestId('energy-hub')).toBeNull();

    fireEvent.press(getByTestId('practices-hub-card-energy'));

    await waitFor(() => expect(getByTestId('energy-hub')).toBeTruthy());
  });

  it('leaves the Focus hub able to reach the timer, as before', async () => {
    const { getByTestId } = renderStack();

    fireEvent.press(getByTestId('practices-hub-card-focus-time'));
    await waitFor(() => expect(getByTestId('focus-hub')).toBeTruthy());

    // The primary card still targets the timer. FocusTimer is not registered in
    // this local stack (it is an AppStack screen with its own heavy deps), so
    // the assertion is that the hub's primary action is present and pressable,
    // not that it lands — landing is AppNavigator's contract, guarded in
    // pillarRoutes.test.ts.
    expect(getByTestId('focus-hub-card-primary')).toBeTruthy();
  });
});
