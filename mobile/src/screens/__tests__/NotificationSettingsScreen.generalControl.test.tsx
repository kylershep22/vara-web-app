/**
 * NotificationSettingsScreen: the General notifications control (ROUTINE-REMINDERS R-B).
 *
 * The master row is renamed with Kyle's approved strings, character for
 * character (the subtitle's apostrophe is U+2019 as approved). Routine reminders
 * are not cancelled by it (pinned in reminderScheduler.routines.test.ts).
 *
 * UPDATED AT NPM-2: the screen now reads its state from the screen-specific
 * useNotificationSettingsState hook, not the shared useNotificationPreferences,
 * so that hook is what is replaced here, and the switch drives its setGeneral
 * (which saves through the pending-intent journal) where it drove toggleAll.
 * The permission row is replaced too. The approved strings are unchanged.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockSetGeneral = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
}));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('../../components', () => ({ LoadingSpinner: () => null }));
jest.mock('../../components/shared/NotificationPermissionRow', () => ({ NotificationPermissionRow: () => null }));
jest.mock('../../hooks/useNotificationSettingsState', () => ({
  useNotificationSettingsState: () => ({
    phase: 'ready',
    retry: jest.fn(),
    general: true,
    dailyTime: { hour: 8, minute: 0 },
    directMessages: true,
    connectionRequests: true,
    saving: { general: false, dailyTime: false, directMessages: false, connectionRequests: false },
    setGeneral: (...a: unknown[]) => mockSetGeneral(...a),
    setDailyTime: jest.fn(),
    setDirectMessages: jest.fn(),
    setConnectionRequests: jest.fn(),
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

  test('its switch drives the General setting', () => {
    // The first Switch on the screen is this row's.
    const view = render(<NotificationSettingsScreen />);
    const switches = view.UNSAFE_getAllByType(jest.requireActual('react-native').Switch);
    fireEvent(switches[0], 'valueChange', false);
    expect(mockSetGeneral).toHaveBeenCalledWith(false);
  });
});
