/**
 * reminderScheduler: routine reminders under ROUTINE-REMINDERS (2026-10-01).
 *
 * Pins Kyle's rulings at the service boundary:
 * - R-A: a routine reminder depends only on the user setting one, a valid time
 *   and OS permission. The General notifications preference is never read.
 * - R-I: after a successful server read, sync cancels every routine-reminder-
 *   id outside the current user's desired set, whoever's routine it was.
 *   (Was: cancels every id first. ROUTINE-REMINDER-OFFLINE-RESILIENCE moved
 *   every routine cancel after the read.)
 * - E6: scheduleRoutineReminder reports what happened instead of returning void.
 * - R-L: an inactive routine is never scheduled.
 *
 * And ROUTINE-REMINDER-OFFLINE-RESILIENCE (Kyle's rulings 1 and 2, 2026-10-01):
 * without OS permission nothing is touched (G2), here; the failed, timed-out,
 * superseded and session-lost cases are in
 * reminderScheduler.offlineResilience.test.ts.
 *
 * expo-notifications is mocked at the module boundary, and the mock store
 * (mockPending) keeps what is scheduled. These prove the logic, not that a
 * reminder fires on a device; the walk owns that.
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
  scheduleRoutineReminder,
  syncAllReminders,
  cancelAllRoutineReminders,
  RoutineReminderInput,
} from '../reminderScheduler.service';
import { cancelAllUserNotifications } from '../notificationScheduler.service';

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

const pendingIds = () => mockPending.map((n) => n.identifier).sort();

describe('syncAllReminders', () => {
  test('schedules an active routine with the General flag off, and never reads preferences', async () => {
    // Mutation caught: restoring the allNotificationsEnabled early exit.
    mockFetchFromServer.mockResolvedValue([routine()]);

    await syncAllReminders('u1');

    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
    expect(mockGetPrefs).not.toHaveBeenCalled();
  });

  test('without OS permission schedules nothing, and does not even read the routines', async () => {
    // Mutation caught: removing sync's own OS permission check, which now
    // reads and reconciles (G2 says it must not).
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    mockFetchFromServer.mockResolvedValue([routine()]);

    await expect(syncAllReminders('u1')).resolves.toBe('no-permission');

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockFetchFromServer).not.toHaveBeenCalled();
  });

  test('skips inactive routines and unparseable times', async () => {
    // Mutation caught: dropping the active check, or the parse check.
    mockFetchFromServer.mockResolvedValue([
      routine({ id: 'inactive', active: false }),
      routine({ id: 'bad', reminderTime: '730' }),
      routine({ id: 'good' }),
    ]);

    await syncAllReminders('u1');

    expect(scheduledIds()).toEqual(['routine-reminder-good']);
  });

  test("online success: cancels every routine id outside the desired set, another user's included, and schedules the desired set without cancelling it first", async () => {
    // Kyle's required case: online success.
    // Mutations caught: dropping the outside-set cancel (the other account's
    // id and the inactive routine's id survive); restoring a cancel of the
    // desired id before its schedule (r1 is cancelled).
    mockPending = [
      { identifier: 'routine-reminder-other-users-routine' },
      { identifier: 'routine-reminder-inactive' },
      { identifier: 'routine-reminder-r1', trigger: { hour: 7, minute: 0 } },
      { identifier: 'u1-daily-rhythm' },
    ];
    mockFetchFromServer.mockResolvedValue([routine(), routine({ id: 'inactive', active: false })]);

    await expect(syncAllReminders('u1')).resolves.toBe('reconciled');

    expect(mockCancelOne.mock.calls.map((c) => c[0]).sort()).toEqual([
      'routine-reminder-inactive',
      'routine-reminder-other-users-routine',
    ]);
    expect(mockCancelOne).not.toHaveBeenCalledWith('routine-reminder-r1');
    expect(pendingIds()).toEqual(['routine-reminder-r1', 'u1-daily-rhythm']);
    expect(mockPending.find((n) => n.identifier === 'routine-reminder-r1')?.trigger).toEqual({
      type: 'daily',
      hour: 19,
      minute: 30,
    });
  });

  test('G2: without OS permission nothing is cancelled, another account\'s included, and nothing is read', async () => {
    // Was: "cancels another account's routine reminders even without OS
    // permission". Kyle's ruling 2 (G2) reverses it: permission controls
    // delivery and must not destroy the configured reminders. Another
    // account's leftovers are taken by session loss, not here.
    // Mutation caught: restoring the cancel-all before the permission check.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    mockPending = [
      { identifier: 'routine-reminder-other-users-routine' },
      { identifier: 'routine-reminder-r1' },
    ];

    await expect(syncAllReminders('u1')).resolves.toBe('no-permission');

    expect(mockCancelOne).not.toHaveBeenCalled();
    expect(mockFetchFromServer).not.toHaveBeenCalled();
    expect(pendingIds()).toEqual(['routine-reminder-other-users-routine', 'routine-reminder-r1']);
  });

  test('still cancels habit reminders a previous build left, whatever the read does', async () => {
    // Mutation caught: dropping the habit cleanup, or moving it after the read.
    mockPending = [{ identifier: 'habit-reminder-h1' }, { identifier: 'routine-reminder-r1' }];
    mockFetchFromServer.mockRejectedValue(new Error('offline'));

    await syncAllReminders('u1');

    expect(pendingIds()).toEqual(['routine-reminder-r1']);
  });
});

describe('scheduleRoutineReminder outcomes', () => {
  test('scheduled: a DAILY trigger under routine-reminder-{id} at the parsed time', async () => {
    // Mutation caught: changing the identifier template.
    await expect(scheduleRoutineReminder(routine())).resolves.toBe('scheduled');
    const req = mockSchedule.mock.calls[0][0] as {
      identifier: string;
      trigger: { type: string; hour: number; minute: number };
    };
    expect(req.identifier).toBe('routine-reminder-r1');
    expect(req.trigger).toEqual({ type: 'daily', hour: 19, minute: 30 });
  });

  test('does not cancel its own id first: the schedule replaces it, and a failure leaves it', async () => {
    // ROUTINE-REMINDER-OFFLINE-RESILIENCE T3. The routine editor cancels
    // explicitly before calling this (RoutineEditor.reminders tests).
    // Mutation caught: restoring the pre-cancel.
    const previous = { identifier: 'routine-reminder-r1', trigger: { hour: 7, minute: 0 } };
    mockPending = [previous];
    mockSchedule.mockRejectedValueOnce(new Error('scheduling failed'));

    await expect(scheduleRoutineReminder(routine())).resolves.toBe('failed');

    expect(mockCancelOne).not.toHaveBeenCalled();
    expect(mockPending).toEqual([previous]);
  });

  test('not-set when there is no reminder time', async () => {
    await expect(scheduleRoutineReminder(routine({ reminderTime: null }))).resolves.toBe('not-set');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('inactive when the routine is inactive', async () => {
    // Mutation caught: dropping the inactive branch (ruling R-L).
    await expect(scheduleRoutineReminder(routine({ active: false }))).resolves.toBe('inactive');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('invalid-time when the time does not parse', async () => {
    await expect(scheduleRoutineReminder(routine({ reminderTime: '730' }))).resolves.toBe(
      'invalid-time'
    );
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('permission-undetermined when the OS has not been asked', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    await expect(scheduleRoutineReminder(routine())).resolves.toBe('permission-undetermined');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('permission-denied when the OS has denied it', async () => {
    // Mutation caught: collapsing denied into undetermined.
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    await expect(scheduleRoutineReminder(routine())).resolves.toBe('permission-denied');
  });

  test('iOS provisional maps to permission-undetermined', async () => {
    // Mutation caught: treating provisional authorisation as granted.
    mockGetPerms.mockResolvedValue({ status: 'granted', ios: { status: 3 } });
    await expect(scheduleRoutineReminder(routine())).resolves.toBe('permission-undetermined');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('failed when the OS scheduling call throws', async () => {
    // Mutation caught: returning scheduled from the catch.
    mockSchedule.mockRejectedValueOnce(new Error('scheduling failed'));
    await expect(scheduleRoutineReminder(routine())).resolves.toBe('failed');
  });
});

describe('cancelAllRoutineReminders and the General control', () => {
  test('cancels every routine-reminder- id and nothing else', async () => {
    // Mutation caught: widening or narrowing the prefix match.
    mockPending = [
      { identifier: 'routine-reminder-a' },
      { identifier: 'routine-reminder-b' },
      { identifier: 'u1-daily-rhythm' },
      { identifier: 'focus-xyz', content: { data: { type: 'focus-complete' } } },
    ];

    await cancelAllRoutineReminders();

    expect(mockCancelOne.mock.calls.map((c) => c[0]).sort()).toEqual([
      'routine-reminder-a',
      'routine-reminder-b',
    ]);
  });

  test('turning General notifications off (cancelAllUserNotifications) leaves routine reminders scheduled', async () => {
    // Mutation caught: widening cancelAllUserNotifications to routine ids.
    mockPending = [{ identifier: 'u1-daily-rhythm' }, { identifier: 'routine-reminder-r1' }];

    await cancelAllUserNotifications('u1');

    expect(mockCancelOne).toHaveBeenCalledWith('u1-daily-rhythm');
    expect(mockCancelOne).not.toHaveBeenCalledWith('routine-reminder-r1');
  });
});
