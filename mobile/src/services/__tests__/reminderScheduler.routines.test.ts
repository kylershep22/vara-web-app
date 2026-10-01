/**
 * reminderScheduler: routine reminders under ROUTINE-REMINDERS (2026-10-01).
 *
 * Pins Kyle's rulings at the service boundary:
 * - R-A: a routine reminder depends only on the user setting one, a valid time
 *   and OS permission. The General notifications preference is never read.
 * - R-I: sync cancels every routine-reminder- id on the device first, whoever's
 *   routine it was, and only then schedules the current user's.
 * - E6: scheduleRoutineReminder reports what happened instead of returning void.
 * - R-L: an inactive routine is never scheduled.
 *
 * expo-notifications is mocked at the module boundary. These prove the logic,
 * not that a reminder fires on a device; the walk owns that.
 */

type Scheduled = { identifier: string; content?: { data?: Record<string, unknown> } };

const mockGetPerms = jest.fn();
const mockSchedule = jest.fn().mockResolvedValue('id');
const mockCancelOne = jest.fn().mockResolvedValue(undefined);
let mockPending: Scheduled[] = [];
const mockFetchUserRoutines = jest.fn();
const mockGetPrefs = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...a),
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
});

describe('syncAllReminders', () => {
  test('schedules an active routine with the General flag off, and never reads preferences', async () => {
    // Mutation caught: restoring the allNotificationsEnabled early exit.
    mockFetchUserRoutines.mockResolvedValue([routine()]);

    await syncAllReminders('u1');

    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
    expect(mockGetPrefs).not.toHaveBeenCalled();
  });

  test('without OS permission schedules nothing, and does not even read the routines', async () => {
    // Mutation caught: removing sync's own OS permission check. Removing it
    // alone would still schedule nothing, because scheduleRoutineReminder
    // re-checks; what it changes is that sync reads every routine for nothing.
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    mockFetchUserRoutines.mockResolvedValue([routine()]);

    await syncAllReminders('u1');

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockFetchUserRoutines).not.toHaveBeenCalled();
  });

  test('skips inactive routines and unparseable times', async () => {
    // Mutation caught: dropping the active check, or the parse check.
    mockFetchUserRoutines.mockResolvedValue([
      routine({ id: 'inactive', active: false }),
      routine({ id: 'bad', reminderTime: '730' }),
      routine({ id: 'good' }),
    ]);

    await syncAllReminders('u1');

    expect(scheduledIds()).toEqual(['routine-reminder-good']);
  });

  test("cancels every routine-reminder- id first, another user's included, then schedules only the current user's", async () => {
    // Mutation caught: removing the cancel-all at the start of sync.
    mockPending = [
      { identifier: 'routine-reminder-other-users-routine' },
      { identifier: 'routine-reminder-r1' },
      { identifier: 'u1-daily-rhythm' },
    ];
    mockFetchUserRoutines.mockResolvedValue([routine()]);

    await syncAllReminders('u1');

    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-other-users-routine');
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(mockCancelOne).not.toHaveBeenCalledWith('u1-daily-rhythm');
    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
  });

  test('cancels another account\'s routine reminders even without OS permission', async () => {
    // Mutation caught: moving the cancel-all after the permission check.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    mockPending = [{ identifier: 'routine-reminder-other-users-routine' }];

    await syncAllReminders('u1');

    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-other-users-routine');
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
