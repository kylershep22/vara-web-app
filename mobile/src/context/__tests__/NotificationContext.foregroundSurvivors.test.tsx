/**
 * NPM-1: what a leave-and-return does to every other kind of pending
 * notification, now that the foreground sweep spares the daily rhythm.
 *
 * Real provider, real scheduler and real routine reminder scheduler, against an
 * in-memory OS store. Routine reminders must come back after the sweep, the
 * focus completion alert must never be touched, and routine step alerts keep
 * their lifecycle unchanged from main: scheduled by the routine player when the
 * app leaves the foreground, fired while away, and cleared on return (by the
 * player itself, and by this sweep, exactly as before).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

const mockStore = new Map<string, Request>();

function mockPrefsService() {
  return {
    getNotificationPreferences: jest.fn(async (uid: string) => ({
      id: uid,
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 20, minute: 0 } },
      insightsLearning: { enabled: false, frequency: 'twice_weekly' },
    })),
    isWithinQuietHours: () => false,
  };
}

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async (req: ScheduleInput) => {
    const identifier = req.identifier ?? 'unnamed';
    mockStore.set(identifier, { identifier, content: req.content, trigger: req.trigger });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockStore.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => Array.from(mockStore.values())),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => mockPrefsService());
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../../services/notificationThrottle', () => ({
  canSendSystemNotification: jest.fn().mockResolvedValue(true),
  markNotificationSent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/routines.service', () => ({
  fetchUserRoutines: jest.fn(async () => [
    {
      id: 'r1',
      name: 'Wind down',
      type: 'evening',
      active: true,
      reminderTime: '7:30 PM',
      activities: [{ name: 'Stretch', duration: 5 }],
    },
  ]),
  calculateTotalDuration: () => 5,
}));
jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1', emailVerified: true }, isAuthReady: true }),
}));
jest.mock('../ToastContext', () => ({
  useToast: () => ({ showNotificationToast: jest.fn() }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: jest.fn(),
  cancelAllScheduledExceptFocusComplete: jest.fn(async (spare: (id: string) => boolean = () => false) => {
    for (const [id, req] of Array.from(mockStore.entries())) {
      if (req.content?.data?.type === 'focus-complete') continue;
      if (spare(id)) continue;
      mockStore.delete(id);
    }
  }),
  registerAndSaveFCMToken: jest.fn().mockResolvedValue(null),
  isServerPushEnabled: jest.fn().mockResolvedValue(false),
  addNotificationResponseListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/firebase/focusSession.service', () => ({
  getActiveFocusSession: jest.fn().mockResolvedValue(null),
  clearActiveFocusSession: jest.fn(),
  finalizeFocusSession: jest.fn(),
  planFocusCompleteLaunch: jest.fn(() => ({ finalize: null, completedSessionId: null })),
}));
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: { isReady: () => false, navigate: jest.fn() },
}));

import { NotificationProvider } from '../NotificationContext';

let appStateHandler: ((state: AppStateStatus) => void) | null = null;

async function settle() {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
  }
}

async function leaveAndReturn() {
  await act(async () => {
    appStateHandler?.('background');
  });
  await act(async () => {
    appStateHandler?.('active');
  });
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    handler: (state: AppStateStatus) => void
  ) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a leave-and-return, for every other pending notification (NPM-1)', () => {
  test('routine reminders, the focus completion alert and the daily rhythm are all pending afterwards', async () => {
    // Mutations caught: dropping syncAllReminders from the foreground run;
    // removing the focus-complete exemption.
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();

    mockStore.set('focus-abc', {
      identifier: 'focus-abc',
      content: { data: { type: 'focus-complete', focusSessionId: 'abc' } },
      trigger: { type: 'date', date: Date.now() + 60_000 },
    });
    expect(mockStore.has('routine-reminder-r1')).toBe(true);

    await leaveAndReturn();

    expect(mockStore.get('routine-reminder-r1')?.trigger).toMatchObject({ hour: 19, minute: 30 });
    expect(mockStore.has('focus-abc')).toBe(true);
    expect(mockStore.get('u1-daily-rhythm')?.trigger).toMatchObject({ hour: 20, minute: 0 });
  });

  test('routine step alerts keep main’s lifecycle: untouched while away, cleared on return', async () => {
    // The routine player schedules routine-activity-N when the app leaves the
    // foreground and cancels them itself on return (ActiveRoutinePlayer). The
    // provider does nothing on the way out, so they fire while away.
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();

    await act(async () => {
      appStateHandler?.('background');
    });
    mockStore.set('routine-activity-0', {
      identifier: 'routine-activity-0',
      content: { data: { type: 'routine-activity-complete', routineId: 'r1' } },
      trigger: { seconds: 300 },
    });
    await settle();
    expect(mockStore.has('routine-activity-0')).toBe(true);

    await act(async () => {
      appStateHandler?.('active');
    });
    await settle();
    expect(mockStore.has('routine-activity-0')).toBe(false);
  });

  test('ids that nothing owns any more (older builds) are still cleared on return', async () => {
    // Why the sweep stays: these have no other canceller.
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();
    for (const id of ['u1-weekly-summary', 'u1-streak-protection', 'habit-reminder-h1', 'u1-insights-learning']) {
      mockStore.set(id, { identifier: id, content: {}, trigger: {} });
    }

    await leaveAndReturn();

    for (const id of ['u1-weekly-summary', 'u1-streak-protection', 'habit-reminder-h1', 'u1-insights-learning']) {
      expect(mockStore.has(id)).toBe(false);
    }
  });
});
