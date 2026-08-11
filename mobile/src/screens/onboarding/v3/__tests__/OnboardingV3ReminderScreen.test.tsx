/**
 * OnboardingV3Reminder — the permission sheet must be the FIRST awaited thing.
 *
 * THE ORDERING IS THE WHOLE POINT OF THIS FILE. The iOS permission request is a
 * pure native call with no network in it, so any latency the user sees between
 * their tap and the sheet is latency we put there. It used to sit fifth, behind
 * two Firestore round-trips, and on a stalled connection the sheet lagged the
 * tap by ~30 seconds. `pins the sheet ahead of every Firestore call` is what
 * stops a future refactor from quietly moving it back.
 *
 * The rest pins what must NOT change while the order does: both branches still
 * write the preference (the deny copy literally promises "your time is saved"),
 * grant still schedules, deny still does not, and the push token is a network
 * call with no bearing on the local reminder, so navigation must never wait on
 * it.
 */

/** Every service call in this path, in the order it actually happened. */
const calls: string[] = [];

const mockNavigate = jest.fn();
const mockRequestPermission = jest.fn((..._a: any[]) => {
  calls.push('requestPermission');
  return Promise.resolve(true);
});
const mockRegisterPushToken = jest.fn((..._a: any[]) => {
  calls.push('registerPushToken');
  return Promise.resolve('ExponentPushToken[x]');
});
const mockGetPrefs = jest.fn((..._a: any[]) => {
  calls.push('getPrefs');
  return Promise.resolve({});
});
const mockUpdatePrefs = jest.fn((..._a: any[]) => {
  calls.push('updatePrefs');
  return Promise.resolve(undefined);
});
const mockScheduleDailyRhythm = jest.fn((..._a: any[]) => {
  calls.push('scheduleDailyRhythm');
  return Promise.resolve('notif-1');
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../../../services/notifications.service', () => ({
  requestNotificationPermission: (...a: any[]) => mockRequestPermission(...a),
  registerPushToken: (...a: any[]) => mockRegisterPushToken(...a),
}));
jest.mock('../../../../services/notificationScheduler.service', () => ({
  scheduleDailyRhythm: (...a: any[]) => mockScheduleDailyRhythm(...a),
}));
jest.mock('../../../../services/firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: any[]) => mockGetPrefs(...a),
  updateNotificationPreferences: (...a: any[]) => mockUpdatePrefs(...a),
}));
jest.mock('../../../../components/onboarding/OnboardingScaffold', () => ({
  OnboardingScaffold: ({ onPrimary, children }: any) => {
    const { Text, TouchableOpacity, View } = require('react-native');
    return (
      <View>
        <TouchableOpacity testID="v3-primary" onPress={onPrimary}>
          <Text>continue</Text>
        </TouchableOpacity>
        {children}
      </View>
    );
  },
}));

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { OnboardingV3ReminderScreen } from '../OnboardingV3ReminderScreen';
import { OnboardingV3Provider } from '../OnboardingV3Context';
import { V3_ROUTES } from '../routes';

const renderStep = () =>
  render(
    <OnboardingV3Provider>
      <OnboardingV3ReminderScreen />
    </OnboardingV3Provider>
  );

const confirm = () => fireEvent.press(screen.getByTestId('v3-primary'));

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
  mockRequestPermission.mockImplementation(() => {
    calls.push('requestPermission');
    return Promise.resolve(true);
  });
  mockRegisterPushToken.mockImplementation(() => {
    calls.push('registerPushToken');
    return Promise.resolve('ExponentPushToken[x]');
  });
  mockGetPrefs.mockImplementation(() => {
    calls.push('getPrefs');
    return Promise.resolve({});
  });
  mockUpdatePrefs.mockImplementation(() => {
    calls.push('updatePrefs');
    return Promise.resolve(undefined);
  });
  mockScheduleDailyRhythm.mockImplementation(() => {
    calls.push('scheduleDailyRhythm');
    return Promise.resolve('notif-1');
  });
});

describe('OnboardingV3ReminderScreen — the permission sheet comes first', () => {
  test('pins the sheet ahead of every Firestore call', async () => {
    renderStep();

    confirm();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(calls[0]).toBe('requestPermission');
    expect(calls.indexOf('requestPermission')).toBeLessThan(calls.indexOf('getPrefs'));
    expect(calls.indexOf('requestPermission')).toBeLessThan(
      calls.indexOf('updatePrefs')
    );
  });

  test('requests permission even before the read that guarantees the prefs doc', async () => {
    // getNotificationPreferences exists in this path only so the updateDoc that
    // follows it has a document to patch. That is bookkeeping, and bookkeeping
    // does not get to precede a user-facing system sheet.
    renderStep();

    confirm();

    await waitFor(() => expect(mockGetPrefs).toHaveBeenCalled());
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingV3ReminderScreen — granted', () => {
  test('writes the canonical dailyRhythm preference', async () => {
    renderStep();

    confirm();

    await waitFor(() =>
      expect(mockUpdatePrefs).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          allNotificationsEnabled: true,
          dailyRhythm: expect.objectContaining({
            enabled: true,
            reminderTime: expect.objectContaining({
              hour: expect.any(Number),
              minute: expect.any(Number),
            }),
          }),
        })
      )
    );
  });

  test('schedules the daily reminder and advances', async () => {
    renderStep();

    confirm();

    await waitFor(() => expect(mockScheduleDailyRhythm).toHaveBeenCalledWith('u1'));
    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Done);
  });

  test('writes the preference before scheduling reads it back', async () => {
    // scheduleDailyRhythm re-reads the document it is about to act on, so a
    // schedule that overtook the write would silently schedule the old time.
    renderStep();

    confirm();

    await waitFor(() => expect(mockScheduleDailyRhythm).toHaveBeenCalled());
    expect(calls.indexOf('updatePrefs')).toBeLessThan(
      calls.indexOf('scheduleDailyRhythm')
    );
  });
});

describe('OnboardingV3ReminderScreen — denied', () => {
  beforeEach(() => {
    mockRequestPermission.mockImplementation(() => {
      calls.push('requestPermission');
      return Promise.resolve(false);
    });
  });

  test('shows the quiet note and does not advance on that tap', async () => {
    renderStep();

    confirm();

    await waitFor(() => expect(screen.getByTestId('v3-reminder-denied-note')).toBeTruthy());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('still saves the time, because the note promises it is saved', async () => {
    renderStep();

    confirm();

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());
    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        dailyRhythm: expect.objectContaining({ enabled: true }),
      })
    );
  });

  test('schedules nothing', async () => {
    renderStep();

    confirm();

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());
    expect(mockScheduleDailyRhythm).not.toHaveBeenCalled();
  });

  test('the second tap advances without re-prompting', async () => {
    renderStep();

    confirm();
    await waitFor(() => expect(screen.getByTestId('v3-reminder-denied-note')).toBeTruthy());

    confirm();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Done));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingV3ReminderScreen — the push token', () => {
  test('does not hold up navigation', async () => {
    // getExpoPushTokenAsync is a network round-trip that decides nothing about
    // the LOCAL daily reminder. A hung token fetch must not strand the user on
    // this screen, so this hangs it and expects the arc to continue anyway.
    mockRegisterPushToken.mockImplementation(() => {
      calls.push('registerPushToken');
      return new Promise<string>(() => {});
    });
    renderStep();

    confirm();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Done));
  });

  test('is never fetched when permission was refused', async () => {
    mockRequestPermission.mockImplementation(() => {
      calls.push('requestPermission');
      return Promise.resolve(false);
    });
    renderStep();

    confirm();

    await waitFor(() => expect(mockUpdatePrefs).toHaveBeenCalled());
    expect(mockRegisterPushToken).not.toHaveBeenCalled();
  });
});
