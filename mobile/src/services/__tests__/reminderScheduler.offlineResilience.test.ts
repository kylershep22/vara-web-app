/**
 * reminderScheduler: ROUTINE-REMINDER-OFFLINE-RESILIENCE (Kyle's rulings 1 and
 * 2, 2026-10-01).
 *
 * Invariant: a failed or timed-out routine refresh never makes the scheduled
 * routine-reminder state less correct than it was before the refresh began.
 * A failed, timed-out, superseded or session-lost attempt is inert: it cancels
 * and schedules nothing. Only a server read is authoritative.
 *
 * Same harness as reminderScheduler.routines.test.ts: expo-notifications is
 * mocked at the module boundary, and the mock store (mockPending) keeps what is
 * scheduled. These prove the logic, not that a reminder fires on a device; the
 * walk owns that. The provider-level cases are in
 * context/__tests__/NotificationContext.routineOffline.test.tsx.
 */

type Scheduled = {
  identifier: string;
  content?: { data?: Record<string, unknown> } & Record<string, unknown>;
  trigger?: Record<string, unknown>;
};

const mockGetPerms = jest.fn();
// Scheduling under an identifier replaces the pending request, as the OS does.
const mockSchedule = jest.fn(async (req: Scheduled) => {
  mockPending = [...mockPending.filter((n) => n.identifier !== req.identifier), { ...req }];
  return req.identifier;
});
const mockCancelOne = jest.fn().mockResolvedValue(undefined);
let mockPending: Scheduled[] = [];
// The cache-capable read. The reconcile must never use it.
const mockFetchUserRoutines = jest.fn();
// The server read, the only one the reconcile accepts.
const mockFetchFromServer = jest.fn();
const mockGetPrefs = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  scheduleNotificationAsync: (req: Scheduled) => mockSchedule(req),
  cancelScheduledNotificationAsync: (id: string) => {
    mockPending = mockPending.filter((n) => n.identifier !== id);
    return mockCancelOne(id);
  },
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([...mockPending])),
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar' },
}));
jest.mock('../firebase/routines.service', () => ({
  fetchUserRoutines: (...a: unknown[]) => mockFetchUserRoutines(...a),
  fetchUserRoutinesFromServer: (...a: unknown[]) => mockFetchFromServer(...a),
  calculateTotalDuration: (acts: { duration: number }[]) =>
    acts.reduce((t, a) => t + a.duration, 0),
}));
// Mocked so a read would be observable. The scheduler must never make one.
jest.mock('../firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: unknown[]) => mockGetPrefs(...a),
  isWithinQuietHours: () => false,
}));
jest.mock('../notificationThrottle', () => ({
  canSendSystemNotification: jest.fn().mockResolvedValue(true),
  markNotificationSent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/firebase', () => ({ db: null }));

import {
  syncAllReminders,
  cancelAllRoutineReminders,
  invalidateRoutineReminderAttempts,
  isRoutineReminderId,
  RoutineReminderInput,
} from '../reminderScheduler.service';

function routine(overrides: Partial<RoutineReminderInput> = {}): RoutineReminderInput {
  return {
    id: 'r1',
    name: 'The Essentials',
    type: 'morning',
    activities: [{ id: 1, name: 'Stretch', duration: 5, order: 0, icon: 'run', color: 'teal' }],
    active: true,
    reminderTime: '7:30 PM',
    ...overrides,
  };
}

const scheduledIds = () =>
  mockSchedule.mock.calls.map((c) => (c[0] as { identifier: string }).identifier);

beforeEach(() => {
  jest.clearAllMocks();
  mockPending = [];
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetPrefs.mockResolvedValue({ allNotificationsEnabled: false });
  mockFetchUserRoutines.mockResolvedValue([]);
  mockFetchFromServer.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

/** A promise with its settle functions, for reads that answer when told to. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let every pending microtask and immediate run. */
async function flush() {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

const pendingIds = () => mockPending.map((n) => n.identifier).sort();

describe('a failed or timed-out refresh changes nothing (ROUTINE-REMINDER-OFFLINE-RESILIENCE)', () => {
  test('offline failure: a rejected read cancels and schedules nothing routine-related', async () => {
    // Kyle's required case: offline failure.
    // Mutation caught: restoring any pre-read routine cancel.
    mockPending = [
      { identifier: 'routine-reminder-r1', trigger: { hour: 7, minute: 0 } },
      { identifier: 'routine-reminder-other-users-routine' },
    ];
    mockFetchFromServer.mockRejectedValue(
      new Error('Failed to get documents from server. (However, these documents may exist in the local cache.)')
    );

    await expect(syncAllReminders('u1')).resolves.toBe('read-failed');

    expect(mockCancelOne).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual(['routine-reminder-other-users-routine', 'routine-reminder-r1']);
  });

  test('a cache-only result is never accepted: the reconcile reads only from the server', async () => {
    // Kyle's ruling 2: a cache-backed empty result is not authoritative enough
    // to justify cancellation. Offline, the cache-capable read can resolve
    // empty; the server read rejects.
    // Mutation caught: swapping fetchUserRoutines in for the server read.
    mockPending = [{ identifier: 'routine-reminder-r1' }];
    mockFetchUserRoutines.mockResolvedValue([]);
    mockFetchFromServer.mockRejectedValue(new Error('offline'));

    await expect(syncAllReminders('u1')).resolves.toBe('read-failed');

    expect(mockFetchUserRoutines).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual(['routine-reminder-r1']);
  });

  test('timeout: a read that never settles returns read-timed-out after 10 seconds and touches nothing', async () => {
    // Kyle's required case: timeout.
    // Mutation caught: removing the timeout (the attempt never settles).
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockPending = [{ identifier: 'routine-reminder-r1' }];
    mockFetchFromServer.mockReturnValue(new Promise(() => {}));

    let outcome: string | undefined;
    syncAllReminders('u1').then((o) => {
      outcome = o;
    });
    await flush();
    await jest.advanceTimersByTimeAsync(9_999);
    expect(outcome).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    await flush();

    expect(outcome).toBe('read-timed-out');
    expect(mockCancelOne).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual(['routine-reminder-r1']);
  });

  test('ignored late completion: a timed-out read that answers later changes nothing', async () => {
    // Kyle's required case: ignored late completion (the timed-out half).
    // Inert by construction: the late answer resolves a promise that the timer
    // has already settled, so no continuation can cancel or schedule.
    // Mutation caught: removing the timeout (the late answer then reconciles).
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockPending = [{ identifier: 'routine-reminder-r1' }, { identifier: 'routine-reminder-gone' }];
    const read = deferred<RoutineReminderInput[]>();
    mockFetchFromServer.mockReturnValue(read.promise);

    let outcome: string | undefined;
    syncAllReminders('u1').then((o) => {
      outcome = o;
    });
    await flush();
    await jest.advanceTimersByTimeAsync(10_000);
    await flush();
    expect(outcome).toBe('read-timed-out');

    read.resolve([routine({ reminderTime: '6:00 AM' })]);
    await flush();

    expect(mockCancelOne).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual(['routine-reminder-gone', 'routine-reminder-r1']);
  });

  test('ignored late completion: an attempt superseded mid-reconcile stops', async () => {
    // Kyle's required case: ignored late completion (the superseded half).
    // Attempt A parks inside its first schedule; attempt B runs to completion;
    // A must not schedule anything after it resumes.
    // Mutation caught: removing the generation check.
    const parked = deferred<string>();
    mockFetchFromServer.mockResolvedValueOnce([routine({ id: 'a1' }), routine({ id: 'a2' })]);
    mockSchedule.mockImplementationOnce(() => parked.promise);

    const a = syncAllReminders('u1');
    await flush();
    expect(scheduledIds()).toEqual(['routine-reminder-a1']);

    mockFetchFromServer.mockResolvedValueOnce([routine({ id: 'b1' })]);
    await expect(syncAllReminders('u1')).resolves.toBe('reconciled');
    const afterB = mockSchedule.mock.calls.length;

    parked.resolve('routine-reminder-a1');
    await expect(a).resolves.toBe('superseded');
    expect(mockSchedule.mock.calls.length).toBe(afterB);
    expect(scheduledIds()).not.toContain('routine-reminder-a2');
  });

  test('successful recovery: after a failed read, the next successful read reconciles', async () => {
    // Kyle's required case: successful recovery. The reminder changed on
    // another device stays at its last-known state while offline (ruling 1)
    // and is reconciled on the next successful refresh.
    // Mutation caught: latching a failed read so later attempts also skip.
    mockPending = [
      { identifier: 'routine-reminder-r1', trigger: { hour: 7, minute: 0 } },
      { identifier: 'routine-reminder-deleted-elsewhere' },
    ];
    mockFetchFromServer.mockRejectedValueOnce(new Error('offline'));
    await expect(syncAllReminders('u1')).resolves.toBe('read-failed');
    expect(pendingIds()).toEqual(['routine-reminder-deleted-elsewhere', 'routine-reminder-r1']);

    mockFetchFromServer.mockResolvedValueOnce([routine()]);
    await expect(syncAllReminders('u1')).resolves.toBe('reconciled');

    expect(pendingIds()).toEqual(['routine-reminder-r1']);
    expect(mockPending[0].trigger).toEqual({ type: 'daily', hour: 19, minute: 30 });
  });

  test('a failed schedule for one id leaves its previous request, and the others still schedule', async () => {
    // Mutations caught: cancelling the id before scheduling it (r1 is lost);
    // one try around the whole loop (r2 is never scheduled).
    const previous = { identifier: 'routine-reminder-r1', trigger: { hour: 7, minute: 0 } };
    mockPending = [previous];
    mockFetchFromServer.mockResolvedValue([routine(), routine({ id: 'r2' })]);
    mockSchedule.mockRejectedValueOnce(new Error('scheduling failed'));

    await expect(syncAllReminders('u1')).resolves.toBe('reconciled');

    expect(mockPending.find((n) => n.identifier === 'routine-reminder-r1')).toBe(previous);
    expect(pendingIds()).toEqual(['routine-reminder-r1', 'routine-reminder-r2']);
  });
});

describe('session loss ends any attempt in flight (ROUTINE-REMINDER-OFFLINE-RESILIENCE)', () => {
  test('account deletion: cancelAllRoutineReminders during a read cancels everything, and the late result is inert', async () => {
    // Kyle's required case: account deletion (the service half; the provider
    // half is in NotificationContext.routineOffline). useAccountActions calls
    // cancelAllRoutineReminders directly, outside the provider's queue.
    // Mutation caught: dropping the bump at the top of cancelAllRoutineReminders.
    mockPending = [{ identifier: 'routine-reminder-r1' }];
    const read = deferred<RoutineReminderInput[]>();
    mockFetchFromServer.mockReturnValue(read.promise);

    const attempt = syncAllReminders('u1');
    await flush();
    await cancelAllRoutineReminders();
    expect(pendingIds()).toEqual([]);

    read.resolve([routine()]);
    await expect(attempt).resolves.toBe('superseded');
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual([]);
  });

  test('account switch: user one\'s late read after invalidation schedules nothing; user two\'s read reconciles', async () => {
    // Kyle's required case: account-switch isolation (the service half).
    // Mutation caught: checking ownership only before the read.
    mockPending = [{ identifier: 'routine-reminder-r1' }];
    const userOneRead = deferred<RoutineReminderInput[]>();
    mockFetchFromServer.mockReturnValueOnce(userOneRead.promise);

    const userOne = syncAllReminders('u1');
    await flush();
    invalidateRoutineReminderAttempts();

    mockFetchFromServer.mockResolvedValueOnce([routine({ id: 'u2-routine' })]);
    await expect(syncAllReminders('u2')).resolves.toBe('reconciled');
    expect(pendingIds()).toEqual(['routine-reminder-u2-routine']);

    userOneRead.resolve([routine({ id: 'r1' }), routine({ id: 'r1b' })]);
    await expect(userOne).resolves.toBe('superseded');

    expect(scheduledIds()).toEqual(['routine-reminder-u2-routine']);
    expect(pendingIds()).toEqual(['routine-reminder-u2-routine']);
  });

  test('isRoutineReminderId matches the routine prefix and nothing else', () => {
    // Mutation caught: widening the predicate the foreground sweep spares by.
    expect(isRoutineReminderId('routine-reminder-r1')).toBe(true);
    expect(isRoutineReminderId('routine-activity-0')).toBe(false);
    expect(isRoutineReminderId('u1-daily-rhythm')).toBe(false);
    expect(isRoutineReminderId('habit-reminder-h1')).toBe(false);
  });
});
