/**
 * NotificationSettingsScreen: the General notifications control (ROUTINE-REMINDERS R-B).
 *
 * The master row is renamed with Kyle's approved strings, character for
 * character (the subtitle's apostrophe is U+2019 as approved). Its semantics do
 * not change in this slice: it still calls toggleAll, and routine reminders are
 * not cancelled by it (pinned in reminderScheduler.routines.test.ts).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockToggleAll = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
}));
jest.mock('expo-av',() => ({ Audio: { Sound: { createAsync: jest.fn() } } }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('../../components', () => ({ LoadingSpinner: () => null }));
jest.mock('../../services/firebase', () => ({
  formatReminderTime: () => '8:00 AM',
}));
jest.mock('../../hooks', () => ({
  useNotificationPreferences: () => ({
    preferences: {
      allNotificationsEnabled: true,
      quietHours: { enabled: true, startTime: { hour: 21, minute: 0 }, endTime: { hour: 8, minute: 0 } },
      dailyRhythm: { enabled: true, reminderTime: { hour: 8, minute: 0 } },
      insightsLearning: { enabled: false, frequency: 'twice_weekly' },
      socialConnection: { directMessages: true, connectionRequests: true, communityDigest: false },
      milestonesReflection: { enabled: false },
      completionSound: { enabled: true, sound: 'singing-bowl' },
    },
    loading: false,
    updateCategory: jest.fn(),
    toggleAll: (...a: unknown[]) => mockToggleAll(...a),
    setQuietHours: jest.fn(),
  }),
}));

import NotificationSettingsScreen from '../NotificationSettingsScreen';

describe('the General notifications control', () => {
  test('shows the approved label and subtitle exactly', () => {
    // Mutation caught: any change to either approved string.
    const view = render(<NotificationSettingsScreen />);
    expect(view.getByText('General notifications')).toBeTruthy();
    expect(
      view.getByText(
        'Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.'
      )
    ).toBeTruthy();
  });

  test('no longer shows All Notifications or Master toggle for all notifications', () => {
    // Mutation caught: restoring the old label or subtitle.
    const view = render(<NotificationSettingsScreen />);
    expect(view.queryByText('All Notifications')).toBeNull();
    expect(view.queryByText('Master toggle for all notifications')).toBeNull();
  });

  test('its switch still drives the same toggleAll as before', () => {
    // The rename is copy only. The first Switch on the screen is this row's.
    const view = render(<NotificationSettingsScreen />);
    const switches = view.UNSAFE_getAllByType(jest.requireActual('react-native').Switch);
    fireEvent(switches[0], 'valueChange', false);
    expect(mockToggleAll).toHaveBeenCalledWith(false);
  });
});
