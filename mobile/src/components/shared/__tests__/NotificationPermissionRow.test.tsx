/**
 * NotificationPermissionRow and useNotificationPermission (NPM-2, D4, D6,
 * Rulings 4 and 5): PM1, PM2 and L3 to L5 from item 8 of the Addendum 2
 * report, plus provisional status and a failed token save.
 *
 * The status comes from the OS only (getPermissionsStatus is replaced here, and
 * no Firestore module is reachable from the row).
 */
import React from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

const mockPermission = jest.fn();
const mockRequest = jest.fn();
const mockRegisterToken = jest.fn();
const mockSaveToken = jest.fn();
const mockFocus: { run: (() => void) | null } = { run: null };
const mockAuthValue = { user: { uid: 'u1' } };

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MockedMaterialCommunityIcons' }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    mockFocus.run = cb;
    jest.requireActual('react').useEffect(() => cb(), [cb]);
  },
}));
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));
jest.mock('../../../services/notifications.service', () => ({
  getPermissionsStatus: (...a: unknown[]) => mockPermission(...a),
  requestNotificationPermission: (...a: unknown[]) => mockRequest(...a),
  registerPushToken: (...a: unknown[]) => mockRegisterToken(...a),
  savePushTokenToUser: (...a: unknown[]) => mockSaveToken(...a),
}));
jest.mock('expo-notifications', () => ({ IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 } }));

import { NotificationPermissionRow } from '../NotificationPermissionRow';

let appStateHandler: ((s: AppStateStatus) => void) | null = null;
let openSettingsSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  appStateHandler = null;
  mockFocus.run = null;
  mockRequest.mockResolvedValue(true);
  mockRegisterToken.mockResolvedValue('ExponentPushToken[x]');
  mockSaveToken.mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _t: string,
    h: (s: AppStateStatus) => void
  ) => {
    appStateHandler = h;
    return { remove: jest.fn() };
  }) as never);
  openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
});

afterEach(() => jest.restoreAllMocks());

const granted = { status: 'granted', granted: true };
const denied = { status: 'denied', granted: false };
const notAsked = { status: 'undetermined', granted: false };

describe('L3: allowed is status only, and the row is not a button', () => {
  test.each([
    ['granted', granted],
    ['provisional', { status: 'undetermined', granted: false, ios: { status: 3 } }],
  ])('%s: Allowed, spoken "Device notifications, allowed"', async (_label, result) => {
    mockPermission.mockResolvedValue(result);
    const view = render(<NotificationPermissionRow />);
    const row = await view.findByTestId('notification-permission-row');

    // Mutation caught: an action or button role on the allowed row; provisional not counted.
    expect(row.props.accessibilityLabel).toBe('Device notifications, allowed');
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.onPress).toBeUndefined();
    expect(view.getByText('Allowed')).toBeTruthy();
    expect(view.queryByText('Open Settings')).toBeNull();
    expect(view.queryByText('Allow notifications')).toBeNull();
  });
});

describe('L4: denied opens iOS Settings', () => {
  test('status, action and spoken label; a tap calls Linking.openSettings', async () => {
    mockPermission.mockResolvedValue(denied);
    const view = render(<NotificationPermissionRow />);
    const row = await view.findByTestId('notification-permission-row');

    expect(row.props.accessibilityLabel).toBe('Device notifications, off in your device settings. Open Settings.');
    expect(row.props.accessibilityRole).toBe('button');
    expect(view.getByText('Off in your device settings')).toBeTruthy();
    expect(view.getByText('Open Settings')).toBeTruthy();

    fireEvent.press(row);
    // Mutation caught: the denied action swapped or dropped.
    await waitFor(() => expect(openSettingsSpy).toHaveBeenCalled());
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

// NPM-3a-ii (Kyle's II-D1, II-D5): the row no longer saves the push token. A
// grant reaches the one registration owner through the permission-granted
// signal in notifications.service, pinned in src/__tests__/npm3aii. The
// former second L5 test (a failed save stays silent) had no subject left.
describe('L5: not yet asked asks the OS; the row saves no token itself', () => {
  test('status, action and spoken label; a grant reads Allowed and the row does no token work', async () => {
    // Mount and focus both read the status; the OS grant is what flips it.
    mockPermission.mockResolvedValue(notAsked);
    mockRequest.mockImplementation(async () => {
      mockPermission.mockResolvedValue(granted);
      return true;
    });
    const view = render(<NotificationPermissionRow />);
    const row = await view.findByTestId('notification-permission-row');

    expect(row.props.accessibilityLabel).toBe('Device notifications, not allowed yet. Allow notifications.');
    expect(row.props.accessibilityRole).toBe('button');
    expect(view.getByText('Not allowed yet')).toBeTruthy();
    expect(view.getByText('Allow notifications')).toBeTruthy();

    await act(async () => {
      fireEvent.press(row);
    });
    expect(mockRequest).toHaveBeenCalled();
    await waitFor(() => expect(view.getByText('Allowed')).toBeTruthy());
    // Mutation caught: a token fetch or save restored in the row (II-D1).
    await act(async () => {});
    expect(mockRegisterToken).not.toHaveBeenCalled();
    expect(mockSaveToken).not.toHaveBeenCalled();
  });
});

describe('PM1: the status is read again when it may have changed', () => {
  test('on the app becoming active (a return from iOS Settings)', async () => {
    mockPermission.mockResolvedValue(denied);
    const view = render(<NotificationPermissionRow />);
    await view.findByText('Off in your device settings');

    mockPermission.mockResolvedValue(granted);
    await act(async () => {
      appStateHandler?.('active');
    });
    // Mutation caught: dropping the AppState listener.
    await waitFor(() => expect(view.getByText('Allowed')).toBeTruthy());
  });

  test('on the screen regaining focus', async () => {
    mockPermission.mockResolvedValue(denied);
    const view = render(<NotificationPermissionRow />);
    await view.findByText('Off in your device settings');

    mockPermission.mockResolvedValue(granted);
    await act(async () => {
      mockFocus.run?.();
    });
    // Mutation caught: dropping the focus re-read.
    await waitFor(() => expect(view.getByText('Allowed')).toBeTruthy());
  });
});

describe('PM2: the row never writes a notification preference', () => {
  test('no preferences module is reachable from the row', () => {
    // A source check: the row and its hook import nothing that writes preferences.
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const src = ['../NotificationPermissionRow.tsx', '../../../hooks/useNotificationPermission.ts']
      .map((p: string) => fs.readFileSync(path.join(__dirname, p), 'utf8'))
      .join('\n');
    // Mutation caught: any import of the preferences service or the journal.
    expect(src).not.toMatch(/notificationPreferences\.service|notificationIntentJournal|allNotificationsEnabled|useNotificationPreferences/);
  });
});
