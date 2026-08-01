/**
 * NotificationContext — reminder reconciliation on resume.
 *
 * The foreground handler cancels every pending notification except the
 * focus-complete one. Before this, only the daily rhythm was rescheduled
 * afterwards, so every pending routine reminder (and, once they exist, every
 * habit reminder) was wiped by a glance at the phone and did not come back
 * until the next login. These tests pin the resync, its ordering against the
 * cancel, and the guard that stops the login effect and the foreground handler
 * from interleaving their cancel-then-reschedule runs.
 *
 * AuthContext is mocked: the real one imports purchases.service ->
 * react-native-purchases, whose ESM build is the known-failing import in this
 * suite's neighbourhood. Mocking it keeps that chain out of this file.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

let mockUser: { uid: string; emailVerified: boolean } | null = {
  uid: 'u1',
  emailVerified: true,
};
let mockPrefs: any = { allNotificationsEnabled: true };

/** Ordered log of the reconciliation calls, for the ordering assertion. */
const callLog: string[] = [];

/** Navigation, for the notification-tap routing tests. */
let mockNavReady = false;
const mockNavigate = jest.fn();

/** The notification-tap handler the provider registers. */
let tapHandler: ((response: any) => void) | null = null;

const mockCancelExceptFocus = jest.fn(async () => {
  callLog.push('cancel');
});
const mockSyncAllReminders = jest.fn(async () => {
  callLog.push('sync');
});
const mockScheduleDailyReminder = jest.fn(async () => {
  callLog.push('scheduleDailyRhythm');
});
const mockInitializeUserNotifications = jest.fn(async () => {
  callLog.push('initialize');
});

jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../ToastContext', () => ({ useToast: () => ({ showNotificationToast: jest.fn() }) }));
jest.mock('../../hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: () => ({ preferences: mockPrefs }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: jest.fn(),
  cancelAllScheduledExceptFocusComplete: (...a: any[]) => mockCancelExceptFocus(...(a as [])),
  registerAndSaveFCMToken: jest.fn().mockResolvedValue(null),
  isServerPushEnabled: jest.fn().mockResolvedValue(false),
  addNotificationResponseListener: (handler: any) => {
    tapHandler = handler;
    return { remove: jest.fn() };
  },
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: (...a: any[]) => mockSyncAllReminders(...(a as [])),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  initializeUserNotifications: (...a: any[]) => mockInitializeUserNotifications(...(a as [])),
  updateNotificationsFromPreferences: jest.fn().mockResolvedValue(undefined),
  cancelAllUserNotifications: jest.fn().mockResolvedValue(undefined),
  sendMilestoneNotification: jest.fn(),
  scheduleDailyReminder: (...a: any[]) => mockScheduleDailyReminder(...(a as [])),
  sendConnectionRequestNotification: jest.fn(),
  sendMessageNotification: jest.fn(),
  sendGroupPostNotification: jest.fn(),
  sendMentionNotification: jest.fn(),
}));
jest.mock('../../services/firebase/focusSession.service', () => ({
  getActiveFocusSession: jest.fn().mockResolvedValue(null),
  clearActiveFocusSession: jest.fn(),
  finalizeFocusSession: jest.fn(),
  planFocusCompleteLaunch: jest.fn(() => ({ finalize: null, completedSessionId: null })),
}));
jest.mock('../../services/firebase/habits.service', () => ({
  isHabitCompletedToday: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: { isReady: () => mockNavReady, navigate: (...a: any[]) => mockNavigate(...a) },
}));

import { NotificationProvider } from '../NotificationContext';

/** The AppState handler the provider registers, so tests can drive resumes. */
let appStateHandler: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  appStateHandler = null;
  tapHandler = null;
  mockNavReady = true;
  mockUser = { uid: 'u1', emailVerified: true };
  mockPrefs = { allNotificationsEnabled: true };

  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    handler: (state: AppStateStatus) => void
  ) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function mount() {
  return render(
    <NotificationProvider>
      <></>
    </NotificationProvider>
  );
}

/** Drive a background -> active transition through the captured handler. */
async function resume() {
  await act(async () => {
    appStateHandler?.('background');
  });
  await act(async () => {
    appStateHandler?.('active');
  });
}

describe('resuming the app', () => {
  test('re-syncs reminders, so the cancel does not leave the day empty', async () => {
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    callLog.length = 0;
    mockSyncAllReminders.mockClear();

    await resume();

    expect(mockCancelExceptFocus).toHaveBeenCalled();
    expect(mockSyncAllReminders).toHaveBeenCalledWith('u1');
  });

  test('syncs AFTER the cancel, not before it', async () => {
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    callLog.length = 0;

    await resume();

    // Ordered the other way round, the cancel would wipe what sync just wrote.
    expect(callLog.indexOf('cancel')).toBeGreaterThanOrEqual(0);
    expect(callLog.indexOf('sync')).toBeGreaterThan(callLog.indexOf('cancel'));
  });

  test('still reschedules the daily rhythm', async () => {
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    callLog.length = 0;

    await resume();

    expect(mockScheduleDailyReminder).toHaveBeenCalledWith('u1');
  });

  test('syncs reminders even when server push is on', async () => {
    const notifications = require('../../services/notifications.service');
    notifications.isServerPushEnabled.mockResolvedValue(true);

    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    await waitFor(() =>
      expect(notifications.isServerPushEnabled).toHaveBeenCalled()
    );
    mockSyncAllReminders.mockClear();
    mockScheduleDailyReminder.mockClear();

    await resume();

    // Server push covers the daily rhythm and insights, never habit or routine
    // reminders — so the resync is deliberately outside that gate.
    expect(mockSyncAllReminders).toHaveBeenCalledWith('u1');
    expect(mockScheduleDailyReminder).not.toHaveBeenCalled();
  });

  test('does nothing without a signed-in user', async () => {
    mockUser = null;
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    mockSyncAllReminders.mockClear();
    mockCancelExceptFocus.mockClear();

    await resume();

    expect(mockCancelExceptFocus).not.toHaveBeenCalled();
    expect(mockSyncAllReminders).not.toHaveBeenCalled();
  });
});

describe('tapping a habit reminder', () => {
  /** A delivered habit reminder, shaped as scheduleHabitReminder writes it. */
  function tap(data: Record<string, unknown>) {
    tapHandler?.({ notification: { request: { content: { data } } } });
  }

  test('lands on the habits list', async () => {
    mount();
    await waitFor(() => expect(tapHandler).not.toBeNull());

    tap({ type: 'habit-reminder', habitId: 'h1' });

    // Deliberately the LIST, not a param-specific detail screen: HabitDetail
    // requires a full Habit object in its params and the payload carries only
    // an id, so deep-linking there needs a fetch. Tracked separately, for
    // routines and habits together.
    expect(mockNavigate).toHaveBeenCalledWith('Rhythms');
  });

  test('the router keys on the SAME type string the scheduler writes', async () => {
    mount();
    await waitFor(() => expect(tapHandler).not.toBeNull());

    // Renaming the payload type without updating this branch would silently
    // turn every reminder tap into a no-op — no crash, no log, just a tap that
    // does nothing. This pins the two ends together.
    tap({ type: 'habit', habitId: 'h1' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('does not navigate before the navigator is ready', async () => {
    mount();
    await waitFor(() => expect(tapHandler).not.toBeNull());
    mockNavReady = false;

    tap({ type: 'habit-reminder', habitId: 'h1' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('the in-flight guard', () => {
  test('serializes overlapping runs so one cancel cannot wipe the other', async () => {
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    // Let the login effect's own reconciliation finish first, so the deferred
    // implementation below belongs to the foreground run under test.
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());

    // Hold the first resume's sync open, then fire a second resume underneath it.
    let releaseFirstSync: () => void = () => {};
    mockSyncAllReminders.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          callLog.push('sync');
          releaseFirstSync = () => resolve();
        })
    );

    callLog.length = 0;
    mockCancelExceptFocus.mockClear();

    // First resume: reaches sync and parks there.
    await act(async () => {
      appStateHandler?.('background');
    });
    act(() => {
      appStateHandler?.('active');
    });
    await waitFor(() => expect(mockCancelExceptFocus).toHaveBeenCalledTimes(1));

    // Second resume while the first is still in flight.
    act(() => {
      appStateHandler?.('background');
    });
    act(() => {
      appStateHandler?.('active');
    });

    // Unguarded, this second cancel would run immediately and destroy whatever
    // the parked first run is about to schedule.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCancelExceptFocus).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseFirstSync();
    });

    await waitFor(() => expect(mockCancelExceptFocus).toHaveBeenCalledTimes(2));
    // Each run completes fully before the next begins.
    expect(callLog).toEqual(['cancel', 'sync', 'cancel', 'sync']);
  });
});
