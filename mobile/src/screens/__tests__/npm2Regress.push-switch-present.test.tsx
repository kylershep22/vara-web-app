/**
 * NPM-2 BEFORE-STATE REGRESSION TEST, written at b8c4c67 (Build A evidence).
 * Shows on unchanged code that SettingsScreen still renders the dead Push
 * Notifications switch, which writes nothing (handleSaveSettings only sets local
 * state), in place of the device-permission status row (D6, Ruling 4).
 *
 * Renders the REAL SettingsScreen; every hook and service it reaches is
 * replaced. Restored in Build B from before/regress-push-switch-present.source.txt;
 * it FAILED at b8c4c67 (Push Notifications rendered).
 * Harness adaptations: the shared permission row renders for real, so its OS
 * permission read (notifications.service), expo-notifications and
 * useFocusEffect are replaced; the row appears after that read answers, so
 * Device notifications is awaited. useNotifications is asserted mounted.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
}));
const mockUseNotifications = jest.fn(() => ({ permissionStatus: 'granted', requestPermissions: jest.fn() }));
jest.mock('../../services/notifications.service', () => ({
  getPermissionsStatus: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestNotificationPermission: jest.fn(),
  registerPushToken: jest.fn(),
  savePushTokenToUser: jest.fn(),
}));
jest.mock('expo-notifications', () => ({ IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-purchases', () => ({ showManageSubscriptions: jest.fn() }));
// A stable user object: SettingsScreen reloads on every change of user identity.
const mockAuth = { user: { uid: 'u1', email: 'a@b.c' } };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../context/AIConsentContext', () => ({
  useAIConsent: () => ({ hasConsent: false, setConsent: jest.fn() }),
}));
jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));
jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ status: null, formattedType: 'Premium', description: null }),
}));
jest.mock('../../hooks/useFeatureUnlock', () => ({
  useFeatureUnlock: () => ({
    access: { allUnlocked: true, currentDay: 14, unlockedFeatures: [] },
    selectedPillarInfo: null,
    unlockAll: jest.fn(),
    loading: false,
  }),
}));
jest.mock('../../hooks/useAccountActions', () => ({
  useAccountActions: () => ({ deleting: false, confirmLogout: jest.fn(), confirmDeleteAccount: jest.fn() }),
}));
jest.mock('../../config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), commit: jest.fn() })),
}));
jest.mock('../../services/firebase/userPrivate.service', () => ({ stageUserPrivate: jest.fn() }));
jest.mock('../../services/firebase/userMigrationRead', () => ({
  getMergedUserData: jest.fn().mockResolvedValue({ notificationsEnabled: true, privacy: 'public' }),
}));
jest.mock('../../components/events/EventCodeSheet', () => ({ EventCodeSheet: () => null }));

import SettingsScreen from '../SettingsScreen';

describe('regress: SettingsScreen shows the dead Push Notifications switch', () => {
  test('the switch is gone and the Device notifications row is in its place', async () => {
    const view = render(<SettingsScreen />);
    await waitFor(() => expect(view.getByText('Notification Preferences')).toBeTruthy());

    expect(view.queryByText('Push Notifications')).toBeNull();
    expect(await view.findByText('Device notifications')).toBeTruthy();
    // Ruling 5: still mounted, for its push-token save on mount.
    expect(mockUseNotifications).toHaveBeenCalled();
  });
});
