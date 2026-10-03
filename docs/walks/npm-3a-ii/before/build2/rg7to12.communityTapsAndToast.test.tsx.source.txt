/**
 * RG7 to RG12 (NPM-3a-ii build 2, regression): Community pushes on the
 * phone. R1-K8, R1-K13; Kyle's II-D5, II-D6, II-D7, II-D14 and II-D17.
 *
 * The real NotificationProvider is mounted inside the real ToastProvider, so
 * a toast is a rendered control and is pressed. A notification tap cannot be
 * rendered: it is delivered by calling the response listener the provider
 * registers through notifications.service, which is the seam the OS uses,
 * and a foreground push by calling the handler the provider registers there.
 * The navigation container is replaced by a ref whose navigate is a spy and
 * whose current route and root route names a test sets.
 */
type Data = Record<string, unknown>;

let mockTap: ((response: unknown) => void) | null = null;
let mockForeground:
  | ((title: string, body: string, data?: Data, identifier?: string) => unknown)
  | null = null;
let mockLastResponse: unknown = null;
const mockNavigate = jest.fn();
const mockNav: {
  ready: boolean;
  routeNames: string[];
  current: { name: string; params?: Data } | undefined;
} = { ready: true, routeNames: ['Main'], current: undefined };
const mockAuth: { user: { uid: string; emailVerified: boolean } | null; isAuthReady: boolean } = {
  user: { uid: 'uid-A', emailVerified: true },
  isAuthReady: true,
};

// ToastContext loads its toasts with React.lazy(() => import(...)), and
// jest cannot run a dynamic import here. React.lazy is stood in by a function
// that returns the REAL NotificationToast through a plain require, so the
// toast rendered and pressed below is the shipped component. The stand-in is
// returned for UnlockToast too, which never renders here (no feature unlock).
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    lazy: () =>
      function LazyStandIn(props: Record<string, unknown>) {
        const Toast = jest.requireActual('../../components/shared/NotificationToast').default;
        return actual.createElement(Toast, props);
      },
  };
});
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: (h: typeof mockForeground) => {
    mockForeground = h;
  },
  addNotificationResponseListener: (h: typeof mockTap) => {
    mockTap = h;
    return { remove: () => undefined };
  },
  getLastNotificationResponse: async () => mockLastResponse,
  cancelAllScheduledExceptFocusComplete: async () => undefined,
  onNotificationPermissionGranted: () => () => undefined,
  dismissAllDeliveredNotifications: async () => undefined,
}));
jest.mock('../../services/pushRegistration.service', () => ({
  ensurePushRegistration: async () => undefined,
  onDeviceTokenChange: () => ({ remove: () => undefined }),
}));
jest.mock('../../services/notificationScheduler.service', () =>
  jest.requireActual('../helpers/pushHarness').fakeNotificationScheduler
);
jest.mock('../../services/firebase/focusSession.service', () =>
  jest.requireActual('../helpers/pushHarness').fakeFocusSession
);
jest.mock('../../services/notificationIntentJournal', () =>
  jest.requireActual('../helpers/pushHarness').fakeIntentJournal
);
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: async () => undefined,
  cancelAllRoutineReminders: async () => undefined,
  invalidateRoutineReminderAttempts: () => undefined,
  isRoutineReminderId: (id: string) => id.startsWith('routine-reminder-'),
}));
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: {
    isReady: () => mockNav.ready,
    navigate: (...a: unknown[]) => mockNavigate(...a),
    getCurrentRoute: () => mockNav.current,
    getRootState: () => ({ routeNames: mockNav.routeNames }),
  },
}));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MockedMaterialCommunityIcons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NotificationProvider } from '../../context/NotificationContext';
import { ToastProvider } from '../../context/ToastContext';

const DM: Data = {
  type: 'direct_message',
  conversationId: 'conv-AB',
  messageId: 'msg-1',
  senderId: 'uid-B',
  recipientId: 'uid-A',
};
const REQUEST: Data = {
  type: 'connection_request',
  connectionId: 'conn-1',
  requesterId: 'uid-C',
  recipientId: 'uid-A',
};

function response(data: Data, identifier = 'notif-1') {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { identifier, content: { title: 'x', body: 'y', data } } },
  };
}

function app() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <></>
      </NotificationProvider>
    </ToastProvider>
  );
}

async function tap(data: Data, identifier?: string) {
  await act(async () => {
    mockTap?.(response(data, identifier));
  });
}

async function arrive(title: string, body: string, data: Data, identifier = 'notif-fg') {
  await act(async () => {
    await mockForeground?.(title, body, data, identifier);
  });
}

/** The nested target a navigate call carries: name, then Community, then the screen. */
function nestedScreen(call: unknown[]) {
  const [name, outer] = call as [string, { screen?: string; params?: { screen?: string; params?: Data } }];
  return { name, tab: outer?.screen, screen: outer?.params?.screen, params: outer?.params?.params };
}

async function settle(ms = 30) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

beforeEach(() => {
  mockTap = null;
  mockForeground = null;
  mockLastResponse = null;
  mockNavigate.mockReset();
  mockNav.ready = true;
  mockNav.routeNames = ['Main'];
  mockNav.current = undefined;
  mockAuth.user = { uid: 'uid-A', emailVerified: true };
  mockAuth.isAuthReady = true;
});

test('RG7: a tap on a direct_message push for the signed-in user opens Main, Community, Chat with the conversation and the sender', async () => {
  render(app());
  await tap(DM);

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  const target = nestedScreen(mockNavigate.mock.calls[0]);
  expect(target).toMatchObject({ name: 'Main', tab: 'Community', screen: 'Chat' });
  expect(target.params).toMatchObject({ conversationId: 'conv-AB', otherUserId: 'uid-B' });
});

test('RG8 (navigation): a tap on a connection_request push for the signed-in user opens Main, Community, People on Requests', async () => {
  render(app());
  await tap(REQUEST);

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  const target = nestedScreen(mockNavigate.mock.calls[0]);
  expect(target).toMatchObject({ name: 'Main', tab: 'Community', screen: 'People' });
  expect(target.params).toMatchObject({ initialFilter: 'requests' });
});

describe('RG9: a payload that is not provably for the signed-in user: no navigation on tap, no toast in the foreground', () => {
  const cases: [string, Data][] = [
    ['recipientId missing', { ...DM, recipientId: undefined }],
    ['recipientId empty', { ...DM, recipientId: '' }],
    ['recipientId not a string', { ...DM, recipientId: 42 }],
    ['recipientId another account', { ...DM, recipientId: 'uid-OTHER' }],
    ['a request for another account', { ...REQUEST, recipientId: 'uid-OTHER' }],
  ];
  test.each(cases)('%s', async (_label, data) => {
    render(app());
    await tap(data);
    await arrive('New message', 'Someone sent you a message.', data);
    await settle();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText('New message')).toBeNull();
  });
});

test('RG10: a foreground Community push for the signed-in user shows a toast, and pressing it runs the tap router', async () => {
  render(app());
  await arrive('New message', 'Bea sent you a message.', DM);

  const toast = await screen.findByText('Bea sent you a message.');
  await act(async () => {
    fireEvent.press(toast);
  });

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  const target = nestedScreen(mockNavigate.mock.calls[0]);
  expect(target).toMatchObject({ name: 'Main', tab: 'Community', screen: 'Chat' });
  expect(target.params).toMatchObject({ conversationId: 'conv-AB', otherUserId: 'uid-B' });
});

test('RG11: no toast while that conversation is the current route; a toast for a different conversation', async () => {
  render(app());
  mockNav.current = { name: 'Chat', params: { conversationId: 'conv-AB', otherUserId: 'uid-B' } };

  await arrive('New message', 'Bea sent you a message.', DM, 'n-same');
  await settle();
  expect(screen.queryByText('Bea sent you a message.')).toBeNull();

  await arrive('New message', 'Cal sent you a message.', { ...DM, conversationId: 'conv-AC', senderId: 'uid-C' }, 'n-other');
  expect(await screen.findByText('Cal sent you a message.')).toBeTruthy();
});

test('RG12: a cold-start tap is routed once, only after Main is in the root navigator, and not again after the user changes', async () => {
  mockNav.routeNames = ['Auth'];
  mockLastResponse = response(DM, 'notif-cold');
  const view = render(app());

  await settle(250);
  expect(mockNavigate).not.toHaveBeenCalled();

  mockNav.routeNames = ['Main'];
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1), { timeout: 2000 });
  expect(nestedScreen(mockNavigate.mock.calls[0])).toMatchObject({ screen: 'Chat' });

  // Sign out and back in: the launch response is still the last one the OS
  // reports, and it must not be routed a second time.
  mockAuth.user = null;
  view.rerender(app());
  await settle();
  mockAuth.user = { uid: 'uid-A', emailVerified: true };
  view.rerender(app());
  await settle(400);

  expect(mockNavigate).toHaveBeenCalledTimes(1);
});
