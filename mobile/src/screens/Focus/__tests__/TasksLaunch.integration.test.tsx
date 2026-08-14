// Task-batching launch path — TB-2b.
//
// Cloned from DayBlocksLaunch.integration.test.tsx, which proves the same kind
// of chain for the hub's other tool card. The point of repeating it here is the
// SWAP: the Focus hub's Task batching card stopped being an inert
// ComingSoonCard in this slice — the LAST one in the app — and a card that
// navigates nowhere still renders perfectly well. The hub's own unit test
// asserts the navigate CALL; this one asserts the arrival, with a real
// navigator underneath.
//
// It also covers the abandon leg, which is where a presentational sheet earns
// its keep: opening the sheet and backing out must leave the list exactly as it
// was, with nothing written.
//
// Mounts the REAL FocusHubScreen and the REAL CapturedTasksScreen. Only leaf
// deps are stubbed. No gesture-handler / reanimated mock: nothing here swipes
// until TB-2c.

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

const mockListTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockDeleteTask = jest.fn();
jest.mock('../../../services/firebase/capturedTasks.service', () => ({
  listCapturedTasks: (...a: any[]) => mockListTasks(...a),
  createCapturedTask: (...a: any[]) => mockCreateTask(...a),
  deleteCapturedTask: (...a: any[]) => mockDeleteTask(...a),
}));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FocusHubScreen } from '../FocusHubScreen';
import { CapturedTasksScreen } from '../CapturedTasksScreen';
import { ROUTES } from '../../../navigation/routes';
import { GROUP_HEADERS } from '../tasksCopy';

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
          name={ROUTES.FocusTasks}
          component={CapturedTasksScreen}
          options={{ headerShown: true, title: '' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const ts = (ms: number) => ({ toMillis: () => ms });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRhythms.mockResolvedValue([]);
  mockListTasks.mockResolvedValue([]);
  mockCreateTask.mockResolvedValue('new-id');
});

describe('Focus hub → Task batching → tasks', () => {
  it('lands on the tasks screen from the swapped card', async () => {
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));

    // Arrival, not just the navigate call. Under jest this native stack renders
    // only the focused screen, so the hub going away is the other half of the
    // proof.
    expect(await findByTestId('captured-tasks')).toBeTruthy();
    await waitFor(() => expect(queryByTestId('focus-hub')).toBeNull());
  });

  it('does NOT land on the rhythms page, the card it was styled from', async () => {
    // The tripwire. The live card copies the rhythms row's markup exactly, so a
    // stray paste of its onPress is the realistic regression.
    const { findByTestId, queryByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));

    await findByTestId('captured-tasks');
    expect(queryByTestId('focus-rhythms-save')).toBeNull();
  });

  it('captures a task, which lands in its demand group', async () => {
    const { findByTestId, getByTestId, findByText } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));
    await findByTestId('captured-tasks');

    fireEvent.press(await findByTestId('captured-tasks-capture'));
    expect(await findByTestId('capture-task-sheet')).toBeTruthy();

    fireEvent.changeText(getByTestId('capture-task-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('capture-task-demand-heavy'));

    // What the refresh after the write will return.
    mockListTasks.mockResolvedValue([
      {
        id: 't1',
        userId: 'u1',
        title: 'Q3 board deck',
        demand: 'heavy',
        createdAt: ts(1000),
        updatedAt: ts(1000),
      },
    ]);

    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(mockCreateTask).toHaveBeenCalledWith('u1', {
      title: 'Q3 board deck',
      demand: 'heavy',
    });
    // The whole loop in one assertion: it is on the list, under the right
    // header, without a reload.
    expect(await findByTestId('captured-tasks-group-heavy')).toBeTruthy();
    expect(await findByText('Q3 board deck')).toBeTruthy();
    expect(await findByText(GROUP_HEADERS.heavy)).toBeTruthy();
  });

  it('opens the sheet, and backing out leaves the list untouched', async () => {
    const { findByTestId, queryByTestId, getByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));
    await findByTestId('captured-tasks');

    fireEvent.press(await findByTestId('captured-tasks-capture'));
    expect(await findByTestId('capture-task-sheet')).toBeTruthy();

    // A half-finished draft, then dismiss without confirming.
    fireEvent.changeText(getByTestId('capture-task-title'), 'Never saved');
    fireEvent.press(getByTestId('capture-task-demand-light'));
    fireEvent(getByTestId('capture-task-sheet'), 'requestClose');

    await waitFor(() => expect(queryByTestId('capture-task-sheet')).toBeNull());
    // Still on the tasks screen, and nothing was written by opening and leaving.
    expect(await findByTestId('captured-tasks')).toBeTruthy();
    expect(await findByTestId('captured-tasks-empty')).toBeTruthy();
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('offers no clearing affordance yet', async () => {
    // TB-2c owns clearing, and whether it is a swipe at all is still an open
    // design call. Nothing in this slice may delete a task, so nothing here
    // should look like it can.
    mockListTasks.mockResolvedValue([
      {
        id: 't1',
        userId: 'u1',
        title: 'Book dentist',
        demand: 'light',
        createdAt: ts(1000),
        updatedAt: ts(1000),
      },
    ]);

    const { findByTestId, getByTestId } = renderFocusNav();

    await findByTestId('focus-hub');
    fireEvent.press(await findByTestId('focus-hub-card-task-batching'));
    await findByTestId('captured-tasks-group-light');

    // Role is what a screen reader announces, and "text" is the claim: static
    // content, not an actionable control. Checking props.onPress would prove
    // nothing either way — RNTL does not expose a Touchable's handler on the
    // host element, so it reads undefined for a live button too.
    const row = getByTestId('captured-tasks-row-t1');
    expect(row.props.accessibilityRole).toBe('text');
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});
