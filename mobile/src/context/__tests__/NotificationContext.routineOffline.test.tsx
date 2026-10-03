/**
 * ROUTINE-REMINDER-OFFLINE-RESILIENCE, at the provider.
 *
 * Kyle's invariant (ruling 1, 2026-10-01): a failed or timed-out routine refresh
 * must never make the currently scheduled routine-reminder state less correct
 * than it was before the refresh began.
 *
 * Real provider, real routine reminder scheduler and real daily rhythm
 * reconcile, against an in-memory OS store. Only the routine read and the
 * session are controlled here. "Offline" is modelled as the routine read
 * rejecting; a read that never answers is modelled with a promise that never
 * settles. Every assertion is on what the OS store holds afterwards.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };
type RoutineFixture = {
  id: string;
  userId: string;
  name: string;
  type: string;
  active: boolean;
  reminderTime: string | null;
  activities: { name: string; duration: number }[];
};

const mockStore = new Map<string, Request>();

function mockRoutine(id: string, userId: string, reminderTime: string): RoutineFixture {
  return {
    id,
    userId,
    name: `Routine ${id}`,
    type: 'evening',
    active: true,
    reminderTime,
    activities: [{ name: 'Stretch', duration: 5 }],
  };
}

const mockRoutinesByUser: Record<string, RoutineFixture[]> = {};
// Each call to the routine read takes its behaviour from here: 'online' answers
// from mockRoutinesByUser, 'offline' rejects, 'hang' never settles, and
// 'deferred' parks the read in mockParkedReads until a test answers it.
let mockReadMode: 'online' | 'offline' | 'hang' | 'deferred' = 'online';
const mockParkedReads: { uid: string; answer: () => void }[] = [];
const mockRoutineRead = jest.fn((uid: string): Promise<RoutineFixture[]> => {
  if (mockReadMode === 'offline') {
    return Promise.reject(
      new Error('Failed to get documents from server. (However, these documents may exist in the local cache.)')
    );
  }
  if (mockReadMode === 'hang') return new Promise(() => {});
  if (mockReadMode === 'deferred') {
    return new Promise((resolve) => {
      mockParkedReads.push({ uid, answer: () => resolve(mockRoutinesByUser[uid] ?? []) });
    });
  }
  return Promise.resolve(mockRoutinesByUser[uid] ?? []);
});

let mockUser: { uid: string; emailVerified: boolean } | null = { uid: 'u1', emailVerified: true };

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
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: jest.fn(async (uid: string) => ({
    id: uid,
    allNotificationsEnabled: true,
    dailyRhythm: { enabled: true, reminderTime: { hour: 20, minute: 0 } },
    insightsLearning: { enabled: false, frequency: 'twice_weekly' },
  })),
  isWithinQuietHours: () => false,
}));
jest.mock('../../config/firebase', () => ({
  db: null,
  // The signed-in owner, mirroring mockUser (NPM-2: every reconcile is owner-checked).
  get auth() {
    return { currentUser: mockUser ? { uid: mockUser.uid } : null };
  },
}));
jest.mock('../../services/notificationThrottle', () => ({
  canSendSystemNotification: jest.fn().mockResolvedValue(true),
  markNotificationSent: jest.fn().mockResolvedValue(undefined),
}));
// Both reads answer the same way, so this file runs unchanged against main
// (which reads through fetchUserRoutines) and against this slice (which reads
// only through fetchUserRoutinesFromServer). Offline, either one fails.
jest.mock('../../services/firebase/routines.service', () => ({
  fetchUserRoutines: (uid: string) => mockRoutineRead(uid),
  fetchUserRoutinesFromServer: (uid: string) => mockRoutineRead(uid),
  calculateTotalDuration: () => 5,
}));
jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: true }),
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
  cancelAllScheduledExceptFocusComplete: jest.fn(async (spare: (id: string) => boolean = () => false) => {
    for (const [id, req] of Array.from(mockStore.entries())) {
      if (req.content?.data?.type === 'focus-complete') continue;
      if (spare(id)) continue;
      mockStore.delete(id);
    }
  }),
  // NPM-3a-ii: registration moved to pushRegistration.service (mocked below).
  onNotificationPermissionGranted: () => () => undefined,
  dismissAllDeliveredNotifications: jest.fn().mockResolvedValue(undefined),
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
import { cancelAllRoutineReminders } from '../../services/reminderScheduler.service';
import * as Notifications from 'expo-notifications';

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

const tree = () => (
  <NotificationProvider>
    <></>
  </NotificationProvider>
);

function mount() {
  return render(tree());
}

const routineIds = () =>
  Array.from(mockStore.keys())
    .filter((id) => id.startsWith('routine-reminder-'))
    .sort();

/** Identifiers passed to scheduleNotificationAsync since the last clear. */
const scheduledSince = () =>
  (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(
    (c) => (c[0] as ScheduleInput).identifier
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockParkedReads.length = 0;
  mockReadMode = 'online';
  mockUser = { uid: 'u1', emailVerified: true };
  for (const key of Object.keys(mockRoutinesByUser)) delete mockRoutinesByUser[key];
  mockRoutinesByUser.u1 = [mockRoutine('r1', 'u1', '7:30 PM')];
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

describe('a leave-and-return while offline (the airplane case)', () => {
  test('the routine reminder scheduled online is still pending after the offline return', async () => {
    // The regression test for this slice: run against main at f090e07 it fails,
    // because the foreground sweep and syncAllReminders both cancel routine
    // reminders before the read, and the failed read puts nothing back.
    // Mutation caught: any routine cancel before the read (the sweep without
    // the routine spare, or a cancel-all at the top of syncAllReminders).
    mount();
    await settle();
    expect(mockStore.get('routine-reminder-r1')?.trigger).toMatchObject({ hour: 19, minute: 30 });

    mockReadMode = 'offline';
    await leaveAndReturn();

    expect(mockStore.get('routine-reminder-r1')?.trigger).toMatchObject({ hour: 19, minute: 30 });
  });

  test('reconnecting: the next return reconciles a reminder changed and one removed elsewhere', async () => {
    // Successful recovery at the provider. While offline the reminders stay at
    // their last-known state (ruling 1); the next successful read reconciles.
    // Mutation caught: latching a failed read so later attempts also skip.
    mockRoutinesByUser.u1 = [mockRoutine('r1', 'u1', '7:30 PM'), mockRoutine('r2', 'u1', '8:00 AM')];
    mount();
    await settle();
    expect(routineIds()).toEqual(['routine-reminder-r1', 'routine-reminder-r2']);

    mockReadMode = 'offline';
    await leaveAndReturn();
    expect(routineIds()).toEqual(['routine-reminder-r1', 'routine-reminder-r2']);

    // Changed on another device while this one was offline.
    mockRoutinesByUser.u1 = [mockRoutine('r1', 'u1', '6:15 AM')];
    mockReadMode = 'online';
    await leaveAndReturn();

    expect(routineIds()).toEqual(['routine-reminder-r1']);
    expect(mockStore.get('routine-reminder-r1')?.trigger).toMatchObject({ hour: 6, minute: 15 });
  });
});

describe('a hung routine read cannot hold the queue (ROUTINE-REMINDER-OFFLINE-RESILIENCE T6)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('a queued sign-out cancel still runs, after the bounded wait', async () => {
    // Mutation caught: removing the read timeout (the cancel waits forever).
    const view = mount();
    await settle();
    expect(routineIds()).toEqual(['routine-reminder-r1']);

    mockReadMode = 'hang';
    await leaveAndReturn();
    // The foreground run is parked on the hung read; the reminder is intact.
    expect(routineIds()).toEqual(['routine-reminder-r1']);

    mockUser = null;
    view.rerender(tree());
    await settle();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    await settle();

    expect(routineIds()).toEqual([]);
  });

  test('the next return’s daily rhythm reconcile still runs, after the bounded wait', async () => {
    // Mutation caught: removing the read timeout (the second run never starts).
    mount();
    await settle();

    mockReadMode = 'hang';
    await leaveAndReturn();
    mockStore.delete('u1-daily-rhythm');

    // A second return, queued behind the first run's hung read.
    await leaveAndReturn();
    expect(mockStore.has('u1-daily-rhythm')).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    await settle();

    expect(mockStore.get('u1-daily-rhythm')?.trigger).toMatchObject({ hour: 20, minute: 0 });
    // And the routine reminder is still there through both hung reads.
    expect(routineIds()).toEqual(['routine-reminder-r1']);
  });
});

describe('session loss during a routine read (ROUTINE-REMINDER-OFFLINE-RESILIENCE)', () => {
  test('sign-out: every routine reminder is cancelled and the late read schedules nothing', async () => {
    // Kyle's required case: sign-out.
    // Mutation caught: dropping the provider's synchronous invalidate (the
    // late read then schedules the departing user's reminder before the
    // queued cancel removes it again).
    const view = mount();
    await settle();

    mockReadMode = 'deferred';
    await leaveAndReturn();
    expect(mockParkedReads.map((r) => r.uid)).toEqual(['u1']);

    mockUser = null;
    view.rerender(tree());
    await settle();
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();

    await act(async () => {
      mockParkedReads[0].answer();
    });
    await settle();

    expect(scheduledSince().filter((id) => id?.startsWith('routine-reminder-'))).toEqual([]);
    expect(routineIds()).toEqual([]);
  });

  test('account deletion: the direct cancel during a read cancels everything, and the late read is inert', async () => {
    // Kyle's required case: account deletion. useAccountActions calls
    // cancelAllRoutineReminders directly once the server has deleted the
    // account, before sign-out.
    // Mutation caught: dropping the bump at the top of cancelAllRoutineReminders.
    mount();
    await settle();

    mockReadMode = 'deferred';
    await leaveAndReturn();

    await act(async () => {
      await cancelAllRoutineReminders();
    });
    expect(routineIds()).toEqual([]);

    await act(async () => {
      mockParkedReads[0].answer();
    });
    await settle();

    expect(routineIds()).toEqual([]);
  });

  test('account switch: user one’s late read schedules none of user one’s routines; user two’s read reconciles', async () => {
    // Kyle's required case: account-switch isolation.
    // Mutation caught: checking ownership only before the read.
    mockRoutinesByUser.u2 = [mockRoutine('r9', 'u2', '9:45 PM')];
    const view = mount();
    await settle();
    expect(routineIds()).toEqual(['routine-reminder-r1']);

    mockReadMode = 'deferred';
    await leaveAndReturn();

    mockUser = { uid: 'u2', emailVerified: true };
    view.rerender(tree());
    await settle();
    mockReadMode = 'online';
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();

    await act(async () => {
      mockParkedReads[0].answer();
    });
    await settle();

    expect(scheduledSince()).not.toContain('routine-reminder-r1');
    expect(routineIds()).toEqual(['routine-reminder-r9']);
  });
});
