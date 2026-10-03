/**
 * RG8, People half (NPM-3a-ii build 2, regression): People opens on Requests
 * when a connection-request tap sends it there, on mount and when it is
 * already mounted on another tab (R1-K8; II-D14: the Requests list as it is,
 * no new copy).
 *
 * The real PeopleScreen is rendered with its data hooks returning nothing, so
 * each tab shows its existing empty state; "No pending requests" is the
 * Requests tab's. The tab pill is pressed through its real control. The route
 * params are what the tap router sends; a new tap is a new params object.
 */
const mockRoute: { params?: Record<string, unknown> } = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => mockRoute,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('../../hooks/useTabBarInset', () => ({ useTabBarInset: () => 0 }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'uid-A' } }) }));
jest.mock('../../hooks', () => ({
  useConnections: () => ({
    connections: [],
    requests: [],
    loading: false,
    sendRequest: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
    getConnectionIds: () => [],
    isConnected: () => false,
    hasPendingRequest: () => false,
  }),
  useUserSearch: () => ({ users: [], loading: false, search: jest.fn(), clear: jest.fn() }),
  useConnectionProfiles: () => ({ profiles: [], loading: false }),
  useStartConversation: () => ({ startConversation: jest.fn() }),
  useSuggestedConnections: () => ({ suggestions: [], loading: false, refresh: jest.fn() }),
}));
jest.mock('../../services/firebase', () => ({ getUserById: jest.fn() }));
jest.mock('../../services/firebase/connections.service', () => ({}));
jest.mock('../../components/shared/CommunityAvatar', () => ({ CommunityAvatar: () => null }));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MockedMaterialCommunityIcons' }));
jest.mock('../../components', () => {
  const RN = jest.requireActual('react-native');
  const R = jest.requireActual('react');
  return {
    Button: ({ children, onPress }: { children?: unknown; onPress?: () => void }) =>
      R.createElement(
        RN.TouchableOpacity,
        { onPress },
        typeof children === 'string' ? R.createElement(RN.Text, null, children) : children
      ),
    Card: ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children),
    LoadingSpinner: () => null,
    PersonCard: () => null,
  };
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import PeopleScreen from '../../screens/community/PeopleScreen';

beforeEach(() => {
  mockRoute.params = undefined;
});

test('RG8 (People): opened with the Requests param, People shows Requests', () => {
  mockRoute.params = { initialFilter: 'requests', filterRequestId: 'notif-1' };
  render(<PeopleScreen />);

  expect(screen.getByText('No pending requests')).toBeTruthy();
});

test('RG8 (People): already mounted on another tab, a new Requests param selects Requests', async () => {
  const view = render(<PeopleScreen />);
  expect(screen.getByText('No connections yet')).toBeTruthy();

  mockRoute.params = { initialFilter: 'requests', filterRequestId: 'notif-1' };
  view.rerender(<PeopleScreen />);
  expect(screen.getByText('No pending requests')).toBeTruthy();

  // The user moves to Connections, and a second request notification is tapped.
  await act(async () => {
    fireEvent.press(screen.getByText('Connections'));
  });
  expect(screen.getByText('No connections yet')).toBeTruthy();

  mockRoute.params = { initialFilter: 'requests', filterRequestId: 'notif-2' };
  view.rerender(<PeopleScreen />);
  expect(screen.getByText('No pending requests')).toBeTruthy();
});
