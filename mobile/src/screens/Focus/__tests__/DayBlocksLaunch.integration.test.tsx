// Time-blocking launch path — TB-1b.
//
// Cloned from StressRecoveryLaunch.integration.test.tsx, which proves the same
// kind of chain for the Practices hub's fourth card. The point of repeating it
// here is the SWAP: the Focus hub's Time blocking card stopped being an inert
// ComingSoonCard in this slice, and a card that navigates nowhere still renders
// perfectly well. The hub's own unit test asserts the navigate CALL; this one
// asserts the arrival, with a real navigator underneath.
//
// It also covers the abandon leg, which is where a presentational sheet earns
// its keep: opening the sheet and backing out must leave the day exactly as it
// was, with nothing written.
//
// Mounts the REAL FocusHubScreen and the REAL DayBlocksScreen. Only leaf deps
// are stubbed.

// TB-1c removed BlockCard's swipe, so no gesture-handler / reanimated mock.

// A real navigator pulls @react-navigation/elements' SafeAreaProviderCompat,
// which reads the provider, both contexts and initialWindowMetrics; the screens
// under test also render their own SafeAreaView.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// STABLE IDENTITY, deliberately. This suite uses the REAL useFocusEffect, so a
// mock returning a fresh object literal per render would change the screen's
// load callback every render and spin the focus effect forever. The real
// AuthContext memoizes its value; the mock has to as well.
const AUTH_VALUE = { user: { uid: 'u1' } };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

// The docked Guide pill pulls the AI chat + consent stack.
jest.mock('../../../components/ai/GuidePill', () => ({ GuidePill: () => null }));

const mockGetRhythms = jest.fn();
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetRhythms(...a),
}));

const mockListBlocks = jest.fn();
const mockCreateBlock = jest.fn();
const mockDeleteBlock = jest.fn();
jest.mock('../../../services/firebase/dayBlocks.service', () => ({
  listDayBlocksBetween: (...a: any[]) => mockListBlocks(...a),
  createDayBlock: (...a: any[]) => mockCreateBlock(...a),
  deleteDayBlock: (...a: any[]) => mockDeleteBlock(...a),
  updateDayBlock: jest.fn(),
}));

// TB-2b registers the tasks screen in this stack too, so the swapped Task
// batching card has somewhere real to land. Its service is stubbed for the same
// reason the blocks one is: this file tests navigation, not persistence.
const mockListTasks = jest.fn();
jest.mock('../../../services/firebase/capturedTasks.service', () => ({
  listCapturedTasks: (...a: any[]) => mockListTasks(...a),
  createCapturedTask: jest.fn(),
  deleteCapturedTask: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FocusHubScreen } from '../FocusHubScreen';
import { DayBlocksScreen } from '../DayBlocksScreen';
import { CapturedTasksScreen } from '../CapturedTasksScreen';
import { ROUTES } from '../../../navigation/routes';

const Stack = createNativeStackNavigator();

function renderFocusNav() {
  return render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={ROUTES.PillarFocus}>
        <Stack.Screen
          name={ROUTES.PillarFocus}
          component={FocusHubScreen}
          options={{ headerShown: false }}
        />
        {/* The same options this carries in AppNavigator: pushed, with a
            header, and an empty title because the screen renders its own h1. */}
        <Stack.Screen
          name={ROUTES.FocusDayBlocks}
          component={DayBlocksScreen}
          options={{ headerShown: true, title: '' }}
        />
        <Stack.Screen
          name={ROUTES.FocusTasks}
          component={CapturedTasksScreen}
          options={{ headerShown: true, title: '' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRhythms.mockResolvedValue([]);
  mockListBlocks.mockResolvedValue([]);
  mockListTasks.mockResolvedValue([]);
});

describe('Focus hub → Time blocking → day view', () => {
  it('lands on the day view from the swapped card', async () => {
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-time-blocking'));

    // Arrival, not just the navigate call. Under jest this native stack
    // renders only the focused screen, so the hub going away is the other
    // half of the proof.
    expect(await findByTestId('day-blocks')).toBeTruthy();
    await waitFor(() => expect(queryByTestId('focus-hub')).toBeNull());
  });

  it('does NOT land on the rhythms page, the card it was styled from', async () => {
    // The tripwire. The live card copies the rhythms row's markup exactly, so
    // a stray paste of its onPress is the realistic regression.
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-time-blocking'));

    await findByTestId('day-blocks');
    expect(queryByTestId('focus-rhythms-save')).toBeNull();
  });

  it('opens the sheet, and backing out leaves the day untouched', async () => {
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-time-blocking'));
    await findByTestId('day-blocks');

    fireEvent.press(await findByTestId('day-blocks-add'));
    expect(await findByTestId('add-block-sheet')).toBeTruthy();

    // Dismiss without confirming.
    fireEvent(await findByTestId('add-block-sheet'), 'requestClose');

    await waitFor(() => expect(queryByTestId('add-block-sheet')).toBeNull());
    // Still on the day view, and nothing was written by opening and leaving.
    expect(await findByTestId('day-blocks')).toBeTruthy();
    expect(mockCreateBlock).not.toHaveBeenCalled();
    expect(mockDeleteBlock).not.toHaveBeenCalled();
  });

  it('sends Task batching to the tasks screen, NOT to the day view', async () => {
    // INVERTED IN TB-2b. The original premise was that the neighbouring card
    // navigates nowhere, which stopped being true when Task batching went live.
    // The thing worth guarding survived the inversion: two markup twins one
    // line apart, where a copied onPress sends the wrong card here.
    //
    // FocusTasks IS registered in this stack on purpose. Asserting only "the
    // day view did not open" against an unregistered route would pass no matter
    // what the onPress said — a card that navigates nowhere satisfies it just
    // as well as a correct one. Landing somewhere specific is what makes this
    // a real tripwire rather than a vacuous green.
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));

    expect(await findByTestId('captured-tasks')).toBeTruthy();
    expect(queryByTestId('day-blocks')).toBeNull();
  });
});
