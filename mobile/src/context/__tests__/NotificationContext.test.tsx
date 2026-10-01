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
let mockAuthReady = true;

/** Ordered log of the reconciliation calls, for the ordering assertion. */
const callLog: string[] = [];

/** Navigation, for the notification-tap routing tests. */
let mockNavReady = false;
const mockNavigate = jest.fn();

/** The notification-tap handler the provider registers. */
let tapHandler: ((response: any) => void) | null = null;

/** The foreground handler the provider registers, and the toast it can raise. */
let foregroundHandler:
  | ((title: string, body: string, data?: Record<string, unknown>) => Promise<void> | void)
  | null = null;
const mockShowNotificationToast = jest.fn();

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

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: mockAuthReady }),
}));
jest.mock('../ToastContext', () => ({
  useToast: () => ({
    showNotificationToast: (title: string, body: string) => mockShowNotificationToast(title, body),
  }),
}));
jest.mock('../../hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: () => ({ preferences: mockPrefs }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: (handler: NonNullable<typeof foregroundHandler>) => {
    foregroundHandler = handler;
  },
  cancelAllScheduledExceptFocusComplete: (...a: any[]) => mockCancelExceptFocus(...(a as [])),
  registerAndSaveFCMToken: jest.fn().mockResolvedValue(null),
  isServerPushEnabled: jest.fn().mockResolvedValue(false),
  addNotificationResponseListener: (handler: any) => {
    tapHandler = handler;
    return { remove: jest.fn() };
  },
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
const mockCancelAllRoutineReminders = jest.fn(async () => {
  callLog.push('cancelRoutineReminders');
});
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: (...a: any[]) => mockSyncAllReminders(...(a as [])),
  cancelAllRoutineReminders: () => mockCancelAllRoutineReminders(),
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
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: { isReady: () => mockNavReady, navigate: (...a: any[]) => mockNavigate(...a) },
}));

import { NotificationProvider } from '../NotificationContext';
import { cancelAllUserNotifications } from '../../services/notificationScheduler.service';
import { NAV_TARGETS } from '../../navigation/navTargets';
import { ROUTES } from '../../navigation/routes';

/** The AppState handler the provider registers, so tests can drive resumes. */
let appStateHandler: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  appStateHandler = null;
  tapHandler = null;
  foregroundHandler = null;
  mockNavReady = true;
  mockUser = { uid: 'u1', emailVerified: true };
  mockPrefs = { allNotificationsEnabled: true };
  mockAuthReady = true;

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
  /** A delivered reminder, shaped as the (retired) habit scheduler wrote it. */
  function tap(data: Record<string, unknown>) {
    tapHandler?.({ notification: { request: { content: { data } } } });
  }

  test('a stale habit reminder lands on Home, never on the planning surface', async () => {
    mount();
    await waitFor(() => expect(tapHandler).not.toBeNull());

    tap({ type: 'habit-reminder', habitId: 'h1' });

    // Habits left V1 (V1-HABITS-RETIREMENT, Kyle ruling 2 of 2026-09-29).
    // Nothing schedules a habit reminder any more, but one an earlier build
    // scheduled can still be tapped. It goes Home by the root-ref path the
    // weekly screens use, never to PlanScreen and never to a habit screen.
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.Main, { screen: ROUTES.Home });
    expect(mockNavigate).not.toHaveBeenCalledWith(NAV_TARGETS.plan);
    expect(Object.values(ROUTES)).toContain(mockNavigate.mock.calls[0][0]);
  });

  test('a routine reminder lands on the planning surface, Routines sub-tab', async () => {
    mount();
    await waitFor(() => expect(tapHandler).not.toBeNull());

    tap({ type: 'routine-reminder', routineId: 'r1' });

    // Unchanged by V1-HABITS-RETIREMENT. PlanScreen now ignores the param,
    // but the tap still names the routines sub-tab it means.
    expect(mockNavigate).toHaveBeenCalledWith(NAV_TARGETS.plan, { tab: 'routines' });
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

describe('a habit reminder arriving in the foreground', () => {
  test('displays nothing, while a routine reminder still shows its toast', async () => {
    mount();
    await waitFor(() => expect(foregroundHandler).not.toBeNull());

    await act(async () => {
      await foregroundHandler!('Time for Walk', 'A moment for this, if now works.', {
        type: 'habit-reminder',
        habitId: 'h1',
      });
    });
    expect(mockShowNotificationToast).not.toHaveBeenCalled();

    // The control: the same captured handler DOES raise a toast for a routine
    // reminder, so the silence above is the habit branch and not a dead handler.
    await act(async () => {
      await foregroundHandler!('Morning', 'Your routine is ready.', {
        type: 'routine-reminder',
        routineId: 'r1',
      });
    });
    expect(mockShowNotificationToast).toHaveBeenCalledTimes(1);
    expect(mockShowNotificationToast).toHaveBeenCalledWith('Morning', 'Your routine is ready.');
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

describe('routine reminders and the General notifications preference (ROUTINE-REMINDERS)', () => {
  test('sign-in syncs routine reminders with General off, and still does not initialise the daily rhythm', async () => {
    // Mutations caught: gating the sign-in sync on allNotificationsEnabled
    // again; and dropping the flag condition from the initialise effect.
    mockPrefs = { allNotificationsEnabled: false };
    mount();

    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalledWith('u1'));
    expect(mockInitializeUserNotifications).not.toHaveBeenCalled();
  });
});

describe('no routine reminder survives loss of the owning user session (ROUTINE-REMINDERS R-I)', () => {
  const tree = () => <NotificationProvider>{null}</NotificationProvider>;

  test('a uid change to null (sign-out, account deletion, a lost token) cancels every routine reminder', async () => {
    // Mutation caught: removing the cancelAllRoutineReminders call from the
    // sign-out cleanup.
    const view = mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());
    mockCancelAllRoutineReminders.mockClear();

    // Auth reported as unresolved for this one render so the cold-start
    // effect (which also cancels whenever auth is resolved with no user)
    // stays out, and the count below belongs to the sign-out cleanup alone.
    mockAuthReady = false;
    mockUser = null;
    view.rerender(tree());

    await waitFor(() => expect(mockCancelAllRoutineReminders).toHaveBeenCalledTimes(1));
    // cancelAllUserNotifications is unchanged: still called, with the old uid.
    expect(cancelAllUserNotifications).toHaveBeenCalledWith('u1');
  });

  test('a uid change to another uid cancels every routine reminder', async () => {
    // Mutation caught: cancelling only when the uid becomes null.
    const view = mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());
    mockCancelAllRoutineReminders.mockClear();

    mockUser = { uid: 'u2', emailVerified: true };
    view.rerender(tree());

    await waitFor(() => expect(mockCancelAllRoutineReminders).toHaveBeenCalledTimes(1));
    expect(cancelAllUserNotifications).toHaveBeenCalledWith('u1');
    // And the new account's own reminders are synced afterwards.
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalledWith('u2'));
  });

  test("replacing the same user's object does not cancel them", async () => {
    // Mutation caught: dropping the uid comparison, which would wipe a signed-in
    // user's reminders whenever their user object is refreshed.
    const view = mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());
    mockCancelAllRoutineReminders.mockClear();

    mockUser = { uid: 'u1', emailVerified: true };
    view.rerender(tree());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();
  });
});

describe('cold start with no signed-in user (ROUTINE-REMINDERS R-I)', () => {
  const tree = () => <NotificationProvider>{null}</NotificationProvider>;

  test('auth resolves with no user: every routine reminder is cancelled', async () => {
    // Mutation caught: removing the resolved-with-no-user effect. The
    // cancellation of each pending routine-reminder- id is pinned by
    // cancelAllRoutineReminders' own test in reminderScheduler.routines.
    mockUser = null;
    mount();
    await waitFor(() => expect(mockCancelAllRoutineReminders).toHaveBeenCalledTimes(1));
  });

  test('while auth is still resolving nothing is cancelled, and it is once auth resolves', async () => {
    // Mutation caught: dropping the isAuthReady condition.
    mockUser = null;
    mockAuthReady = false;
    const view = mount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();

    mockAuthReady = true;
    view.rerender(tree());
    await waitFor(() => expect(mockCancelAllRoutineReminders).toHaveBeenCalledTimes(1));
  });

  test('auth resolves with a user: the sign-in sync runs and nothing else cancels', async () => {
    // Mutation caught: dropping the no-user condition.
    mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalledWith('u1'));
    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();
  });
});
