/**
 * Community pushes on the phone, beyond RG7 to RG12 (NPM-3a-ii build 2):
 * the cold-start bound, one route per notification across the live listener
 * and the cold-start read, a request toast, and non-Community toasts left as
 * they were (E3). Same harness as rg7to12.communityTapsAndToast.test.tsx.
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
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

test('cold start: a tap whose Main never appears within the bound is dropped', async () => {
  // Mutation caught: the wait unbounded or the drop removed (navigates late).
  jest.useFakeTimers();
  try {
    mockNav.routeNames = ['Auth'];
    mockLastResponse = response(DM, 'notif-cold');
    render(app());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10500);
    });
    mockNav.routeNames = ['Main'];
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

test('the same notification seen by the live listener and the cold-start read is routed once', async () => {
  // Mutation caught: the handled-identifier check removed from either path.
  mockLastResponse = response(DM, 'notif-both');
  render(app());
  await tap(DM, 'notif-both');
  await settle(300);

  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test('a second tap on the same notification is not routed again', async () => {
  render(app());
  await tap(DM, 'notif-x');
  await tap(DM, 'notif-x');
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test('a request toast opens People on Requests when pressed', async () => {
  render(app());
  await arrive('New connection request', 'Cal wants to connect. Open Vara to respond.', REQUEST, 'n-req');

  const toast = await screen.findByText('Cal wants to connect. Open Vara to respond.');
  await act(async () => {
    fireEvent.press(toast);
  });
  const target = nestedScreen(mockNavigate.mock.calls[0]);
  expect(target).toMatchObject({ name: 'Main', tab: 'Community', screen: 'People' });
  expect(target.params).toMatchObject({ initialFilter: 'requests', filterRequestId: 'n-req' });
});

test('a non-Community toast is shown as before, and pressing it navigates nowhere (E3)', async () => {
  // Mutation caught: a non-Community push given the Community router or suppressed.
  render(app());
  await arrive('Morning routine', 'Time for your routine.', { type: 'routine-reminder', routineId: 'r1' });

  const toast = await screen.findByText('Time for your routine.');
  await act(async () => {
    fireEvent.press(toast);
  });
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('a Community toast for another conversation is shown even while Chat is open', async () => {
  // Mutation caught: suppression on any Chat route.
  render(app());
  mockNav.current = { name: 'Chat', params: { conversationId: 'conv-OTHER' } };
  await arrive('New message', 'Bea sent you a message.', DM);
  expect(await screen.findByText('Bea sent you a message.')).toBeTruthy();
});
