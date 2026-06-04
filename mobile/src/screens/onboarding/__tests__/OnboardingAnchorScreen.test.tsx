/**
 * Screen 9 — daily anchor + contextual permission. Permission granted →
 * schedule one daily reminder; denied → anchor saved, NO schedule, no error.
 * Either way the terminal action completes onboarding.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockSaveOnboardingStep = jest.fn().mockResolvedValue(undefined);
const mockPersistRecheck = jest.fn().mockResolvedValue(undefined);
const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockRegisterForPush = jest.fn().mockResolvedValue('token');
const mockGetPermissions = jest.fn();
const mockScheduleDailyRhythm = jest.fn().mockResolvedValue('notif-id');
const mockGetPrefs = jest.fn().mockResolvedValue({});
const mockUpdatePrefs = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn().mockResolvedValue({ exists: () => false });

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => ({ __ref: a }),
  getDoc: (...a: any[]) => mockGetDoc(...a),
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));
jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveOnboardingStep: (...a: any[]) => mockSaveOnboardingStep(...a),
  persistRecheckAsDailyCheckIn: (...a: any[]) => mockPersistRecheck(...a),
}));
jest.mock('../../../services/firebase/onboarding.service', () => ({
  completeOnboarding: (...a: any[]) => mockCompleteOnboarding(...a),
}));
jest.mock('../../../services/notifications.service', () => ({
  registerForPushNotifications: (...a: any[]) => mockRegisterForPush(...a),
  getPermissionsStatus: (...a: any[]) => mockGetPermissions(...a),
}));
jest.mock('../../../services/notificationScheduler.service', () => ({
  scheduleDailyRhythm: (...a: any[]) => mockScheduleDailyRhythm(...a),
}));
jest.mock('../../../services/firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: any[]) => mockGetPrefs(...a),
  updateNotificationPreferences: (...a: any[]) => mockUpdatePrefs(...a),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import OnboardingAnchorScreen from '../OnboardingAnchorScreen';

describe('OnboardingAnchorScreen — anchor + contextual permission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });

  test('permission granted → saves dailyRhythm enabled, schedules, completes onboarding', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    render(<OnboardingAnchorScreen />);
    fireEvent.press(screen.getByLabelText('Continue'));

    await waitFor(() => expect(mockScheduleDailyRhythm).toHaveBeenCalledWith('u1'));
    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        allNotificationsEnabled: true,
        dailyRhythm: expect.objectContaining({ enabled: true }),
      })
    );
    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith('u1'));
  });

  test('permission denied → saves anchor, does NOT schedule, no error, still completes', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    render(<OnboardingAnchorScreen />);
    fireEvent.press(screen.getByLabelText('Continue'));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith('u1'));
    expect(mockUpdatePrefs).toHaveBeenCalled();
    expect(mockScheduleDailyRhythm).not.toHaveBeenCalled();
  });

  test('"Skip for now" completes onboarding without scheduling', async () => {
    render(<OnboardingAnchorScreen />);
    fireEvent.press(screen.getByLabelText('Skip for now'));
    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith('u1'));
    expect(mockScheduleDailyRhythm).not.toHaveBeenCalled();
  });

  test('carries the re-check brain state into the daily check-in on finish', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    render(<OnboardingAnchorScreen />);
    fireEvent.press(screen.getByLabelText('Continue'));
    await waitFor(() => expect(mockPersistRecheck).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith('u1'));
  });

  test('"Skip for now" still carries the re-check into the daily check-in', async () => {
    render(<OnboardingAnchorScreen />);
    fireEvent.press(screen.getByLabelText('Skip for now'));
    await waitFor(() => expect(mockPersistRecheck).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledWith('u1'));
  });

  test('records the current step on mount (resume)', () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    render(<OnboardingAnchorScreen />);
    expect(mockSaveOnboardingStep).toHaveBeenCalledWith('u1', 'OnboardingAnchor');
  });
});
