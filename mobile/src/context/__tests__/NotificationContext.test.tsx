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
const mockReconcileDailyRhythm = jest.fn(async () => {
  callLog.push('reconcile');
  return 'scheduled';
});

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: mockAuthReady }),
}));
jest.mock('../ToastContext', () => ({
  useToast: () => ({
    showNotificationToast: (title: string, body: string) => mockShowNotificationToast(title, body),
  }),
}));
// NPM-3a-ii: push token registration is not under test here; its suites are
// src/__tests__/npm3aii and src/services/__tests__/pushRegistration.*.
jest.mock('../../services/pushRegistration.service', () => ({
  ensurePushRegistration: jest.fn().mockResolvedValue(undefined),
  onDeviceTokenChange: () => ({ remove: () => undefined }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: (handler: NonNullable<typeof foregroundHandler>) => {
    foregroundHandler = handler;
  },
  cancelAllScheduledExceptFocusComplete: (...a: any[]) => mockCancelExceptFocus(...(a as [])),
  // NPM-3a-ii: registration moved to pushRegistration.service (mocked below).
  onNotificationPermissionGranted: () => () => undefined,
  dismissAllDeliveredNotifications: jest.fn().mockResolvedValue(undefined),
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
const mockInvalidateRoutineReminderAttempts = jest.fn(() => {
  callLog.push('invalidate');
});
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: (...a: any[]) => mockSyncAllReminders(...(a as [])),
  cancelAllRoutineReminders: () => mockCancelAllRoutineReminders(),
  invalidateRoutineReminderAttempts: () => mockInvalidateRoutineReminderAttempts(),
  // The real predicate is pinned in reminderScheduler.routines; the sweep's use
  // of it against the real scheduler is in NotificationContext.routineOffline.
  isRoutineReminderId: (id: string) => id.startsWith('routine-reminder-'),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  reconcileDailyRhythm: (...a: any[]) => mockReconcileDailyRhythm(...(a as [])),
  dailyRhythmNotificationId: (uid: string) => `${uid}-daily-rhythm`,
  cancelAllUserNotifications: jest.fn().mockResolvedValue(undefined),
  sendMilestoneNotification: jest.fn(),
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
    // Since ROUTINE-REMINDER-OFFLINE-RESILIENCE the sweep spares routine
    // reminders, so the re-sync is what reconciles them with the server (and
    // clears habit leftovers), not what puts them back after the cancel.
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

    // The sweep now spares routine reminders (ROUTINE-REMINDER-OFFLINE-
    // RESILIENCE), so this order no longer protects them; it still keeps the
    // sweep from clearing ids the sync may legitimately write in future, and
    // pins the order the NPM-1 daily rhythm test below depends on.
    expect(callLog.indexOf('cancel')).toBeGreaterThanOrEqual(0);
    expect(callLog.indexOf('sync')).toBeGreaterThan(callLog.indexOf('cancel'));
  });

  test('reconciles the daily rhythm, between the cancel and the routine sync (NPM-1)', async () => {
    // Mutation caught: dropping the reconcile from the foreground handler.
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());
    callLog.length = 0;

    await resume();

    expect(mockReconcileDailyRhythm).toHaveBeenCalledWith('u1');
    expect(callLog.indexOf('cancel')).toBeLessThan(callLog.indexOf('reconcile'));
    expect(callLog.indexOf('reconcile')).toBeLessThan(callLog.indexOf('sync'));
  });

  test('the foreground cancel spares only the current user’s daily rhythm and routine reminders (NPM-1, ROUTINE-REMINDER-OFFLINE-RESILIENCE)', async () => {
    // A failed or offline reconcile must leave the daily rhythm and the routine
    // reminders scheduled, so the sweep before them may not touch those ids.
    // Everything else is cleared as before: insights, other accounts' daily
    // rhythm, routine step alerts, and ids older builds left behind.
    // Was: spare('routine-reminder-r1') was false, routine reminders being
    // cleared here and re-synced after.
    // Mutations caught: calling the cancel without the spare predicate; a spare
    // without the routine clause; a spare widened past the routine prefix.
    mount();
    await waitFor(() => expect(appStateHandler).not.toBeNull());

    await resume();

    const spare = (mockCancelExceptFocus.mock.calls[0] as unknown as [(id: string) => boolean])[0];
    expect(typeof spare).toBe('function');
    expect(spare('u1-daily-rhythm')).toBe(true);
    expect(spare('routine-reminder-r1')).toBe(true);
    expect(spare('routine-reminder-another-accounts-routine')).toBe(true);
    expect(spare('u2-daily-rhythm')).toBe(false);
    expect(spare('u1-insights-learning')).toBe(false);
    expect(spare('routine-activity-0')).toBe(false);
    expect(spare('habit-reminder-h1')).toBe(false);
    expect(spare('u1-weekly-summary')).toBe(false);
  });

  test('with serverPushEnabled true the daily rhythm is still reconciled locally (NPM-1 ruling 1)', async () => {
    // Mutation caught: reintroducing the flag check on the local daily rhythm.
    const notifications = require('../../services/notifications.service');
    notifications.isServerPushEnabled.mockResolvedValue(true);

    mount();
    await waitFor(() => expect(mockReconcileDailyRhythm).toHaveBeenCalledWith('u1'));
    mockSyncAllReminders.mockClear();
    mockReconcileDailyRhythm.mockClear();

    await resume();

    expect(mockSyncAllReminders).toHaveBeenCalledWith('u1');
    expect(mockReconcileDailyRhythm).toHaveBeenCalledWith('u1');
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
    expect(callLog).toEqual(['cancel', 'reconcile', 'sync', 'cancel', 'reconcile', 'sync']);
  });
});

describe('routine reminders and the General notifications preference (ROUTINE-REMINDERS)', () => {
  test('sign-in syncs routine reminders and reconciles the daily rhythm, with no stored preference consulted', async () => {
    // NPM-1: the provider holds no preferences copy any more. Whether the daily
    // rhythm should exist is the reconcile's fresh read to decide, General off
    // included. Mutation caught: dropping the sign-in reconcile.
    mount();

    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(mockReconcileDailyRhythm).toHaveBeenCalledWith('u1'));
  });

  test('an unverified user gets no sign-in reconcile', async () => {
    // The emailVerified condition is kept as it was.
    mockUser = { uid: 'u1', emailVerified: false };
    mount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockReconcileDailyRhythm).not.toHaveBeenCalled();
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

  test('session loss invalidates any sync in flight synchronously, before its cancel is queued (ROUTINE-REMINDER-OFFLINE-RESILIENCE)', async () => {
    // Mutation caught: dropping the synchronous invalidate (the cancel alone
    // runs only when the queue reaches it, after any attempt ahead of it).
    const view = mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());

    // Park a sync, so the queued cancel cannot run yet.
    let releaseSync: () => void = () => {};
    mockSyncAllReminders.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseSync = () => resolve();
        })
    );
    await act(async () => {
      appStateHandler?.('background');
    });
    act(() => {
      appStateHandler?.('active');
    });
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalledTimes(2));
    mockCancelAllRoutineReminders.mockClear();
    mockInvalidateRoutineReminderAttempts.mockClear();

    mockAuthReady = false;
    mockUser = null;
    view.rerender(tree());

    // Invalidated at once, while the cancel is still waiting behind the sync.
    expect(mockInvalidateRoutineReminderAttempts).toHaveBeenCalledTimes(1);
    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();

    await act(async () => {
      releaseSync();
    });
    await waitFor(() => expect(mockCancelAllRoutineReminders).toHaveBeenCalledTimes(1));
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

  test("replacing the same user's object does not cancel them, nor the daily rhythm (NPM-1 T5)", async () => {
    // Mutations caught: dropping the uid comparison, which would wipe a
    // signed-in user's reminders whenever their user object is refreshed; and
    // calling cancelAllUserNotifications outside it, which wiped the daily rhythm.
    const view = mount();
    await waitFor(() => expect(mockSyncAllReminders).toHaveBeenCalled());
    mockCancelAllRoutineReminders.mockClear();
    (cancelAllUserNotifications as jest.Mock).mockClear();

    mockUser = { uid: 'u1', emailVerified: true };
    view.rerender(tree());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();
    expect(cancelAllUserNotifications).not.toHaveBeenCalled();
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
