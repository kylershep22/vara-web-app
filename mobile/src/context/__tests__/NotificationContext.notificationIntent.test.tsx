/**
 * NotificationContext and the pending notification intent (NPM-2).
 *
 * The sign-in job replays this user's unacknowledged notification changes
 * BEFORE the daily rhythm reconcile. The session-loss cleanup clears the
 * departing user's pending changes synchronously; a signed-out cold start
 * clears NOTHING (a transient startup state is not a session loss); the same
 * user's object being replaced clears nothing. Harness as in
 * NotificationContext.test.tsx; the journal is recorded. What happens to a
 * stored record across a cold start is in NotificationContext.journalColdStart.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';

let mockUser: { uid: string; emailVerified: boolean } | null = { uid: 'u1', emailVerified: true };
let mockAuthReady = true;
const callLog: string[] = [];

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: mockAuthReady }),
}));
jest.mock('../ToastContext', () => ({
  useToast: () => ({ showNotificationToast: jest.fn() }),
}));
// NPM-3a-ii: push token registration is not under test here; its suites are
// src/__tests__/npm3aii and src/services/__tests__/pushRegistration.*.
jest.mock('../../services/pushRegistration.service', () => ({
  ensurePushRegistration: jest.fn().mockResolvedValue(undefined),
  onDeviceTokenChange: () => ({ remove: () => undefined }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: jest.fn(),
  cancelAllScheduledExceptFocusComplete: jest.fn().mockResolvedValue(undefined),
  // NPM-3a-ii: registration moved to pushRegistration.service (mocked below).
  onNotificationPermissionGranted: () => () => undefined,
  dismissAllDeliveredNotifications: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: jest.fn(async () => {
    callLog.push('syncRoutines');
  }),
  cancelAllRoutineReminders: jest.fn(async () => {
    callLog.push('cancelRoutineReminders');
  }),
  invalidateRoutineReminderAttempts: jest.fn(() => {
    callLog.push('invalidateRoutines');
  }),
  isRoutineReminderId: (id: string) => id.startsWith('routine-reminder-'),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  reconcileDailyRhythm: jest.fn(async (uid: string) => {
    callLog.push(`reconcile(${uid})`);
    return 'scheduled';
  }),
  dailyRhythmNotificationId: (uid: string) => `${uid}-daily-rhythm`,
  cancelAllUserNotifications: jest.fn(async (uid: string) => {
    callLog.push(`cancelUserNotifications(${uid})`);
  }),
  sendMilestoneNotification: jest.fn(),
  sendConnectionRequestNotification: jest.fn(),
  sendMessageNotification: jest.fn(),
  sendGroupPostNotification: jest.fn(),
  sendMentionNotification: jest.fn(),
}));
const mockReplayGate: { next: Promise<void> | null } = { next: null };
jest.mock('../../services/notificationIntentJournal', () => ({
  replayNotificationIntent: jest.fn(async (uid: string) => {
    callLog.push(`replay(${uid})`);
    if (mockReplayGate.next) await mockReplayGate.next;
    callLog.push(`replay(${uid}):done`);
  }),
  clearNotificationIntent: jest.fn((uid?: string) => {
    callLog.push(`clearIntent(${uid ?? ''})`);
    return Promise.resolve();
  }),
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

function mount() {
  return render(
    <NotificationProvider>
      <></>
    </NotificationProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  mockReplayGate.next = null;
  mockUser = { uid: 'u1', emailVerified: true };
  mockAuthReady = true;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((() => ({ remove: jest.fn() })) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('C1: sign-in replays before it reconciles', () => {
  test('the reconcile starts only after the replay has finished', async () => {
    let release!: () => void;
    mockReplayGate.next = new Promise<void>((r) => {
      release = r;
    });
    mount();
    await waitFor(() => expect(callLog).toContain('replay(u1)'));

    // Mutation caught: reconciling before (or without waiting for) the replay.
    expect(callLog).not.toContain('reconcile(u1)');

    await act(async () => {
      release();
    });
    await waitFor(() => expect(callLog).toContain('reconcile(u1)'));
    expect(callLog.indexOf('replay(u1):done')).toBeLessThan(callLog.indexOf('reconcile(u1)'));
  });
});

describe('C2 [K5]: sign-out clears the departing user', () => {
  test('cleared for u1, synchronously within the cleanup, alongside the routine invalidation', async () => {
    const view = mount();
    await waitFor(() => expect(callLog).toContain('reconcile(u1)'));
    callLog.length = 0;

    mockUser = null;
    view.rerender(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );

    // Mutation caught: removing the clear from the session-loss cleanup.
    expect(callLog).toContain('clearIntent(u1)');
    // Synchronous: in the cleanup itself, before the queued routine cancel runs.
    expect(callLog.indexOf('clearIntent(u1)')).toBeLessThan(callLog.indexOf('invalidateRoutines'));
  });
});

describe('C4: a signed-out cold start does NOT clear (Kyle, ruling 1 on Build A)', () => {
  test('auth resolved with nobody signed in: the routine cancel runs, the journal is left alone', async () => {
    mockUser = null;
    mount();
    await waitFor(() => expect(callLog).toContain('cancelRoutineReminders'));
    await act(async () => {});

    // Mutation caught: restoring the journal clear to the signed-out cold-start job.
    expect(callLog.filter((c) => c.startsWith('clearIntent'))).toEqual([]);
    expect(callLog).not.toContain('replay(u1)');
  });

  test('while auth is still resolving, nothing is cleared', async () => {
    mockUser = null;
    mockAuthReady = false;
    mount();
    await act(async () => {});
    expect(callLog.filter((c) => c.startsWith('clearIntent'))).toEqual([]);
  });
});

describe('C5 [K4]: an account switch never carries one user into the next', () => {
  test('u1 is cleared before u2 is replayed', async () => {
    const view = mount();
    await waitFor(() => expect(callLog).toContain('reconcile(u1)'));
    callLog.length = 0;

    mockUser = { uid: 'u2', emailVerified: true };
    view.rerender(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await waitFor(() => expect(callLog).toContain('reconcile(u2)'));

    // Mutation caught: no clear on a direct uid change lets u1's pending reach u2.
    expect(callLog).toContain('clearIntent(u1)');
    expect(callLog.indexOf('clearIntent(u1)')).toBeLessThan(callLog.indexOf('replay(u2)'));
    expect(callLog).not.toContain('replay(u1)');
  });
});

describe('C6: the same user replaced is not a session loss', () => {
  test('a new object for u1 clears nothing', async () => {
    const view = mount();
    await waitFor(() => expect(callLog).toContain('reconcile(u1)'));
    callLog.length = 0;

    mockUser = { uid: 'u1', emailVerified: true };
    view.rerender(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await act(async () => {});

    // Mutation caught: the cleanup losing its uid comparison.
    expect(callLog.filter((c) => c.startsWith('clearIntent'))).toEqual([]);
  });
});
