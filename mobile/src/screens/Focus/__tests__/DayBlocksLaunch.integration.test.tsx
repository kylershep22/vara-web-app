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

// TB-3's seeded sheet needs the picker, which the day view never mounted in
// this file before the bridge existed.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// TB-2b registers the tasks screen in this stack too, so the swapped Task
// batching card has somewhere real to land. Its service is stubbed for the same
// reason the blocks one is: this file tests navigation, not persistence.
const mockListTasks = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
jest.mock('../../../services/firebase/capturedTasks.service', () => ({
  listCapturedTasks: (...a: any[]) => mockListTasks(...a),
  createCapturedTask: jest.fn(),
  updateCapturedTask: (...a: any[]) => mockUpdateTask(...a),
  deleteCapturedTask: (...a: any[]) => mockDeleteTask(...a),
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FocusHubScreen } from '../FocusHubScreen';
import { DayBlocksScreen } from '../DayBlocksScreen';
import { CapturedTasksScreen } from '../CapturedTasksScreen';
import { ROUTES } from '../../../navigation/routes';

const Stack = createNativeStackNavigator();

function renderFocusNav() {
  // TB-3 needs to walk BACK from the day view to Tasks to close the round trip,
  // which is a navigator operation rather than anything a screen exposes.
  const navRef = createNavigationContainerRef<any>();
  const utils = render(
    <NavigationContainer ref={navRef}>
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
  return { ...utils, navRef };
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

// ---- the task-to-block bridge, end to end (TB-3) ----

describe('Tasks → Block it → day view → back to Tasks', () => {
  const TASK = {
    id: 't1',
    userId: 'u1',
    title: 'Q3 board deck',
    demand: 'heavy',
    createdAt: { toMillis: () => 1000 },
    updatedAt: { toMillis: () => 1000 },
  };

  const placedBlock = (start: Date) => ({
    id: 'b1',
    userId: 'u1',
    title: 'Q3 board deck',
    demand: 'heavy',
    durationMinutes: 60,
    startAt: { toDate: () => start },
    isProtected: false,
    sourceTaskId: 't1',
    createdAt: {},
    updatedAt: {},
  });

  /** Tasks screen, one heavy task, nothing blocked yet. */
  async function openTaskEditor() {
    mockListTasks.mockResolvedValue([TASK]);
    const utils = renderFocusNav();

    await utils.findByTestId('focus-hub');
    fireEvent.press(await utils.findByTestId('focus-hub-card-task-batching'));
    await utils.findByTestId('captured-tasks');

    fireEvent.press(await utils.findByTestId('captured-tasks-row-t1'));
    await utils.findByTestId('capture-task-sheet');
    return utils;
  }

  it('lands on the day view with the sheet already filled from the task', async () => {
    // THE ARRIVAL, against a real navigator. The unit test asserts the navigate
    // CALL; this asserts that the params survive the navigator and are read at
    // the destination — the half a spy cannot see, and the half that decides
    // whether the user retypes a title they already wrote.
    const { findByTestId, getByTestId, queryByTestId } = await openTaskEditor();

    fireEvent.press(getByTestId('capture-task-block-it'));

    expect(await findByTestId('day-blocks')).toBeTruthy();
    await waitFor(() => expect(queryByTestId('captured-tasks')).toBeNull());

    const sheet = await findByTestId('add-block-sheet');
    expect(sheet).toBeTruthy();
    expect(getByTestId('add-block-title').props.value).toBe('Q3 board deck');
    expect(
      getByTestId('add-block-demand-heavy').props.accessibilityState.selected
    ).toBe(true);
  });

  /** Commit a manual start time, the way an iOS spinner scroll would. */
  function commitStartAt(hour: number) {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    fireEvent(screen.UNSAFE_getByType('DateTimePicker' as any), 'change', { type: 'set' }, d);
    fireEvent.press(screen.getByTestId('time-picker-commit'));
  }

  it('carries the link into createDayBlock when the block is placed', async () => {
    const { findByTestId, getByTestId } = await openTaskEditor();

    fireEvent.press(getByTestId('capture-task-block-it'));
    await findByTestId('add-block-sheet');

    // No rhythms are stored in this file, so the sheet opens in manual mode and
    // the time row is the only way to commit a start. The seed fills the WHAT;
    // the WHEN is still the user's answer, which is the design.
    fireEvent.press(getByTestId('add-block-time-row'));
    commitStartAt(12);
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [uid, input] = mockCreateBlock.mock.calls[0];
    expect(uid).toBe('u1');
    expect(input.sourceTaskId).toBe('t1');
    expect(input.title).toBe('Q3 board deck');
    expect(input.demand).toBe('heavy');
  });

  it('shows the chip back on Tasks once the block exists', async () => {
    // THE ROUND TRIP CLOSED, with both screens and the navigator real. The chip
    // is DERIVED, so "the block now exists" is the entire mechanism by which
    // the task starts reading as Blocked. Nothing writes to the task anywhere
    // in this flow, and the assertion below on the task service is what proves
    // that rather than assumes it.
    const { findByTestId, getByTestId, navRef } = await openTaskEditor();

    fireEvent.press(getByTestId('capture-task-block-it'));
    await findByTestId('add-block-sheet');

    fireEvent.press(getByTestId('add-block-time-row'));
    commitStartAt(9);

    // From here on the backend has the block.
    const nine = new Date();
    nine.setHours(9, 0, 0, 0);
    mockListBlocks.mockResolvedValue([placedBlock(nine)]);

    fireEvent.press(getByTestId('add-block-confirm'));
    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());

    // Walk back the way the user would, with the header chevron.
    await act(async () => {
      navRef.goBack();
    });

    await findByTestId('captured-tasks');
    expect(await findByTestId('task-blocked-t1')).toBeTruthy();

    // Not one write to the task, at any point in the round trip.
    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('hides Block it on a task that already has one', async () => {
    // Chip and action are mutually exclusive, proved with both screens real.
    const nine = new Date();
    nine.setHours(9, 0, 0, 0);
    mockListTasks.mockResolvedValue([TASK]);
    mockListBlocks.mockResolvedValue([placedBlock(nine)]);

    const utils = renderFocusNav();
    await utils.findByTestId('focus-hub');
    fireEvent.press(await utils.findByTestId('focus-hub-card-task-batching'));
    await utils.findByTestId('captured-tasks');

    // The chip is on the row...
    expect(await utils.findByTestId('task-blocked-t1')).toBeTruthy();

    // ...and the action is not in the sheet.
    fireEvent.press(utils.getByTestId('captured-tasks-row-t1'));
    await utils.findByTestId('capture-task-sheet');
    expect(utils.queryByTestId('capture-task-block-it')).toBeNull();
  });
});
