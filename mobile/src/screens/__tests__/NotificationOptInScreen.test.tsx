/**
 * NotificationOptInScreen — the opt-in write and the graceful-denial path.
 *
 * This screen used to write the chosen time to a legacy `dailyReminders`
 * object. scheduleDailyRhythm reads `dailyRhythm.reminderTime`, so the time was
 * written to a field nothing reads and no reminder was ever scheduled. These
 * tests pin the write to the field the scheduler reads, and pin the denial
 * behaviour that must survive the fix: the time is still saved, the user is
 * told so plainly, and they are never trapped on the screen.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockRegisterForPush = jest.fn();
const mockGetPermissions = jest.fn();
const mockSavePushToken = jest.fn().mockResolvedValue(undefined);
const mockUpdatePrefs = jest.fn().mockResolvedValue(undefined);
const mockScheduleDailyRhythm = jest.fn().mockResolvedValue('notif-id');
const mockMarkOptedIn = jest.fn().mockResolvedValue(undefined);
const mockMarkDismissed = jest.fn().mockResolvedValue(undefined);
const mockGoBack = jest.fn();

jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../services/notifications.service', () => ({
  registerForPushNotifications: (...a: any[]) => mockRegisterForPush(...a),
  savePushTokenToUser: (...a: any[]) => mockSavePushToken(...a),
  getPermissionsStatus: (...a: any[]) => mockGetPermissions(...a),
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  updateNotificationPreferences: (...a: any[]) => mockUpdatePrefs(...a),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  scheduleDailyRhythm: (...a: any[]) => mockScheduleDailyRhythm(...a),
}));
jest.mock('../../hooks/useNotificationOptIn', () => ({
  useNotificationOptIn: () => ({
    markOptedIn: mockMarkOptedIn,
    markPromptDismissed: mockMarkDismissed,
  }),
}));
jest.mock('../../components', () => ({
  Button: ({ children, onPress, accessibilityLabel, disabled }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import NotificationOptInScreen from '../NotificationOptInScreen';

const navigation = { goBack: mockGoBack } as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockRegisterForPush.mockResolvedValue('expo-token');
  mockGetPermissions.mockResolvedValue({ status: 'granted' });
});

describe('permission granted', () => {
  test('writes the canonical dailyRhythm shape, with BOTH keys', async () => {
    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());

    const [uid, payload] = mockUpdatePrefs.mock.calls[0];
    expect(uid).toBe('u1');
    expect(payload.allNotificationsEnabled).toBe(true);
    // updateDoc replaces dailyRhythm wholesale rather than deep-merging, so
    // sending reminderTime alone would drop `enabled` and disable the reminder
    // this screen just set.
    expect(payload.dailyRhythm).toEqual({
      enabled: true,
      reminderTime: { hour: 8, minute: 0 },
    });
  });

  test('writes no legacy dailyReminders field', async () => {
    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());
    expect(mockUpdatePrefs.mock.calls[0][1]).not.toHaveProperty('dailyReminders');
  });

  test('schedules the reminder rather than leaving it for a restart', async () => {
    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockScheduleDailyRhythm).toHaveBeenCalledWith('u1'));
    expect(mockMarkOptedIn).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('permission denied — the graceful path must hold', () => {
  beforeEach(() => {
    mockRegisterForPush.mockResolvedValue(null);
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
  });

  test('still saves the chosen time', async () => {
    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());
    expect(mockUpdatePrefs.mock.calls[0][1].dailyRhythm).toEqual({
      enabled: true,
      reminderTime: { hour: 8, minute: 0 },
    });
  });

  test('schedules nothing, tells the user plainly, and does not trap them', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockMarkOptedIn).toHaveBeenCalled());
    expect(mockScheduleDailyRhythm).not.toHaveBeenCalled();

    expect(alertSpy).toHaveBeenCalledWith(
      'Time saved',
      'No worries. You can turn on reminders anytime in Settings.',
      expect.any(Array)
    );

    // The only way off the screen is the alert's OK button, so the user is not
    // stranded: pressing it navigates back.
    const buttons = alertSpy.mock.calls[0][2] as any[];
    buttons[0].onPress();
    expect(mockGoBack).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test('a null push token alone does not suppress scheduling when permission IS granted', async () => {
    // Expo Go and simulators return a null token with permission granted. The
    // schedule is gated on the permission status, not on the token.
    mockRegisterForPush.mockResolvedValue(null);
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Choose my reminder time'));

    await waitFor(() => expect(mockScheduleDailyRhythm).toHaveBeenCalledWith('u1'));
  });
});

describe('"Maybe later"', () => {
  test('dismisses without writing preferences or scheduling', async () => {
    render(<NotificationOptInScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Maybe later'));

    await waitFor(() => expect(mockMarkDismissed).toHaveBeenCalled());
    expect(mockUpdatePrefs).not.toHaveBeenCalled();
    expect(mockScheduleDailyRhythm).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
