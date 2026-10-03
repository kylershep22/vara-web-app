/**
 * RG3 (NPM-3a-ii, regression): a permission grant from the routine editor or
 * from the focus timer leads to the Expo token being saved.
 *
 * Kyle's ruling II-D1: registration runs after any permission grant. Before
 * NPM-3a-ii both of these sites asked for permission and saved nothing.
 *
 * The routine editor is rendered and driven through its real controls: the
 * reminder row, the time sheet's Done, and Save. Its permission alert is
 * native, so the "Allow notifications" button is pressed by calling the
 * onPress captured from jest.spyOn(Alert, 'alert'), the same seam
 * RoutineEditor.reminders.test.tsx uses. That proves the flow, not that iOS
 * shows the dialog.
 *
 * The focus timer case calls scheduleFocusCompletionNotification directly:
 * it is the service function useActiveFocusSession calls when a block starts,
 * and the grant happens inside it. It is invoked directly, not through a
 * rendered Start button, so the reachability of this path is the walk's to
 * confirm.
 */
jest.mock('expo-notifications', () => jest.requireActual('../helpers/pushHarness').fakeNotifications);
jest.mock('expo-device', () => jest.requireActual('../helpers/pushHarness').fakeDevice);
jest.mock('firebase/firestore', () => jest.requireActual('../helpers/pushHarness').fakeFirestore);
jest.mock('firebase/auth', () => jest.requireActual('../helpers/pushHarness').fakeAuth);
jest.mock('../../config/firebase', () => jest.requireActual('../helpers/pushHarness').fakeConfigFirebase);
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1', emailVerified: true }, isAuthReady: true }),
}));
jest.mock('../../context/ToastContext', () => jest.requireActual('../helpers/pushHarness').fakeToastContext);
jest.mock('../../services/notificationScheduler.service', () =>
  jest.requireActual('../helpers/pushHarness').fakeNotificationScheduler
);
jest.mock('../../services/firebase/focusSession.service', () =>
  jest.requireActual('../helpers/pushHarness').fakeFocusSession
);
jest.mock('../../services/notificationIntentJournal', () =>
  jest.requireActual('../helpers/pushHarness').fakeIntentJournal
);
jest.mock('../../navigation/AppNavigator', () => jest.requireActual('../helpers/pushHarness').fakeAppNavigator);
// The provider's own reconciles are not under test here; the editor's
// scheduling helpers run for real.
jest.mock('../../services/reminderScheduler.service', () => ({
  ...jest.requireActual('../../services/reminderScheduler.service'),
  syncAllReminders: async () => undefined,
  cancelAllRoutineReminders: async () => undefined,
  invalidateRoutineReminderAttempts: () => undefined,
}));
jest.mock('../../services/firebase/routines.service', () => ({
  createRoutine: jest.fn(),
  updateRoutine: jest.fn().mockResolvedValue(undefined),
  deleteRoutine: jest.fn().mockResolvedValue(undefined),
  fetchUserRoutines: jest.fn().mockResolvedValue([]),
  calculateTotalDuration: (acts: { duration: number }[]) => acts.reduce((t, a) => t + a.duration, 0),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../components/index', () => {
  const RN = jest.requireActual('react-native');
  const R = jest.requireActual('react');
  return {
    Button: ({ children, onPress, disabled }: { children?: unknown; onPress?: () => void; disabled?: boolean }) =>
      R.createElement(
        RN.TouchableOpacity,
        { onPress, disabled, accessibilityRole: 'button' },
        typeof children === 'string' ? R.createElement(RN.Text, null, children) : children
      ),
    Card: ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children),
  };
});

import React from 'react';
import { Alert, AlertButton } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NotificationProvider } from '../../context/NotificationContext';
import { RoutineEditor } from '../../components/routines/RoutineEditor';
import { scheduleFocusCompletionNotification } from '../../services/notifications.service';
import type { Routine } from '../../services/firebase/routines.service';
import { EXPO_A, Empty, resetWorld, userPrivate, world } from '../helpers/pushHarness';

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  resetWorld();
  // Not yet asked; the grant comes from the site under test.
  world.permission = 'undetermined';
  world.requestResult = 'granted';
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

const routine: Routine = {
  id: 'r1',
  userId: 'u1',
  name: 'The Essentials',
  type: 'morning',
  activities: [{ id: 1, name: 'Stretch', duration: 5, order: 0, icon: 'run', color: 'teal' }],
  active: true,
  reminderTime: null,
  mode: 'checklist',
  createdAt: {} as Routine['createdAt'],
  updatedAt: {} as Routine['updatedAt'],
};

test('RG3a: allowing notifications from the routine editor saves the Expo token', async () => {
  const view = render(
    <NotificationProvider>
      <RoutineEditor
        userId="u1"
        routineType="morning"
        existingRoutine={routine}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    </NotificationProvider>
  );

  fireEvent.press(view.getByTestId('routine-reminder-row'));
  const d = new Date();
  d.setHours(19, 30, 0, 0);
  fireEvent(view.UNSAFE_getByType('DateTimePicker' as never), 'change', { type: 'set' }, d);
  fireEvent.press(view.getByTestId('time-picker-done'));
  await act(async () => {
    fireEvent.press(view.getByText('Update Routine'));
  });

  await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
  const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
  const allow = buttons.find((b) => b.text === 'Allow notifications');
  if (!allow?.onPress) throw new Error('no Allow notifications button');
  await act(async () => {
    await allow.onPress!();
  });

  expect(world.log).toContain('requestPermission');
  await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
});

test('RG3b: a grant from the focus timer saves the Expo token', async () => {
  render(
    <NotificationProvider>
      <Empty />
    </NotificationProvider>
  );

  await act(async () => {
    await scheduleFocusCompletionNotification('focus-1', Date.now() + 25 * 60 * 1000);
  });

  expect(world.log).toContain('requestPermission');
  await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
});
