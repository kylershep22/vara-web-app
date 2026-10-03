/**
 * NotificationProvider as the one owner of push token registration, and its
 * session-loss dismissal (NPM-3a-ii: Kyle's II-D1, II-D12, II-D15).
 *
 * The real provider is mounted against the fakes in ../helpers/pushHarness;
 * useAuth is replaced by a mutable value so a test can sign in, verify an
 * email, sign out or switch account by re-rendering. Each test names the
 * mutation it catches. The return-to-app trigger is RG2, the onboarding,
 * routine editor and focus timer grants are RG1 and RG3.
 */
jest.mock('expo-notifications', () => jest.requireActual('../helpers/pushHarness').fakeNotifications);
jest.mock('expo-device', () => jest.requireActual('../helpers/pushHarness').fakeDevice);
jest.mock('firebase/firestore', () => jest.requireActual('../helpers/pushHarness').fakeFirestore);
jest.mock('firebase/auth', () => jest.requireActual('../helpers/pushHarness').fakeAuth);
jest.mock('../../config/firebase', () => jest.requireActual('../helpers/pushHarness').fakeConfigFirebase);
const mockAuth: { user: { uid: string; emailVerified: boolean } | null; isAuthReady: boolean } = {
  user: { uid: 'u1', emailVerified: true },
  isAuthReady: true,
};
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }));
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
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: async () => undefined,
  cancelAllRoutineReminders: async () => undefined,
  invalidateRoutineReminderAttempts: () => undefined,
  isRoutineReminderId: (id: string) => id.startsWith('routine-reminder-'),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MockedMaterialCommunityIcons' }));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NotificationProvider } from '../../context/NotificationContext';
import { NotificationPermissionRow } from '../../components/shared/NotificationPermissionRow';
import {
  onNotificationPermissionGranted,
  requestOsNotificationPermission,
} from '../../services/notifications.service';
import { onDeviceTokenChange } from '../../services/pushRegistration.service';
import {
  DEVICE_A,
  DEVICE_OTHER,
  EXPO_A,
  EXPO_OTHER,
  Empty,
  resetWorld,
  rotateDeviceToken,
  userPrivate,
  userPrivateWrites,
  world,
} from '../helpers/pushHarness';

beforeEach(() => {
  resetWorld();
  // Drop the tokens the service holds for the app session (a token change
  // from the OS is the one thing that does), so each test starts clean.
  const sub = onDeviceTokenChange(() => undefined);
  rotateDeviceToken(EXPO_A, DEVICE_A);
  sub.remove();
  world.removedTokenListeners = 0;
  mockAuth.user = { uid: 'u1', emailVerified: true };
  mockAuth.isAuthReady = true;
});

function provider() {
  return (
    <NotificationProvider>
      <Empty />
    </NotificationProvider>
  );
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

describe('when registration runs', () => {
  test('sign-in or a cold start with a verified user registers', async () => {
    // Mutation caught: the sign-in registration call removed from the effect.
    render(provider());
    await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
  });

  test('an unverified user is not registered; the email becoming verified registers', async () => {
    // Mutations caught: the emailVerified gate removed (first half); the
    // effect not re-running on the verification change (second half).
    mockAuth.user = { uid: 'u1', emailVerified: false };
    const view = render(provider());
    await settle();
    expect(world.writes).toEqual([]);
    expect(world.log).not.toContain('getExpoToken');

    mockAuth.user = { uid: 'u1', emailVerified: true };
    view.rerender(provider());
    await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
  });

  test('a token change from the OS registers the new tokens; unmount removes the listener', async () => {
    // Mutations caught: no token listener subscribed; the listener not removed on unmount.
    const view = render(provider());
    await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
    expect(world.tokenListeners).toHaveLength(1);

    await act(async () => {
      rotateDeviceToken(EXPO_OTHER, DEVICE_OTHER);
    });
    await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_OTHER));
    expect(userPrivate('u1')?.fcmToken).toBe(DEVICE_OTHER);

    view.unmount();
    expect(world.removedTokenListeners).toBeGreaterThanOrEqual(1);
    expect(world.tokenListeners).toHaveLength(0);
  });

  test('a grant from the Settings device-permission row registers, through the provider', async () => {
    // Mutation caught: the grant signal not emitted by the request path.
    world.permission = 'undetermined';
    const view = render(
      <NotificationProvider>
        <NotificationPermissionRow />
      </NotificationProvider>
    );
    const row = await view.findByTestId('notification-permission-row');
    await settle();
    expect(world.writes).toEqual([]);

    await act(async () => {
      fireEvent.press(row);
    });

    await waitFor(() => expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A));
  });
});

describe('the permission-granted signal', () => {
  test('fires on a grant and not on a refusal', async () => {
    // Mutation caught: the signal fired on any answer.
    const heard = jest.fn();
    const stop = onNotificationPermissionGranted(heard);

    world.permission = 'undetermined';
    world.requestResult = 'denied';
    await requestOsNotificationPermission();
    expect(heard).not.toHaveBeenCalled();

    world.requestResult = 'granted';
    await requestOsNotificationPermission();
    expect(heard).toHaveBeenCalledTimes(1);

    stop();
    await requestOsNotificationPermission();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

describe('session loss dismisses delivered notifications (II-D15)', () => {
  test('signing out (uid to null) dismisses', async () => {
    // Mutation caught: the dismissal removed from the session-loss effect.
    const view = render(provider());
    await settle();
    world.log = [];

    mockAuth.user = null;
    view.rerender(provider());
    await settle();

    expect(world.log).toContain('dismissAll');
  });

  test('a different account signing in dismisses', async () => {
    const view = render(provider());
    await settle();
    world.log = [];

    mockAuth.user = { uid: 'u2', emailVerified: true };
    world.authUid = 'u2';
    view.rerender(provider());
    await settle();

    expect(world.log).toContain('dismissAll');
  });

  test('the same user\'s object being replaced does not dismiss', async () => {
    // Mutation caught: dismissing on every user-object change.
    const view = render(provider());
    await settle();
    world.log = [];

    mockAuth.user = { uid: 'u1', emailVerified: true };
    view.rerender(provider());
    await settle();

    expect(world.log).not.toContain('dismissAll');
  });

  test('a signed-out cold start dismisses nothing and clears nothing', async () => {
    // Mutation caught: a dismissal added to the no-session effect.
    mockAuth.user = null;
    world.authUid = null;
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A });
    render(provider());
    await settle();

    expect(world.log).not.toContain('dismissAll');
    expect(world.log).not.toContain('tx:start');
    expect(userPrivateWrites('u1')).toEqual([]);
  });
});
