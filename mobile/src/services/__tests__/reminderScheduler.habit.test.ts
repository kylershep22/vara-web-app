/**
 * reminderScheduler — per-habit reminders.
 *
 * The leak tests are the point. A specific-days habit owns one identifier per
 * weekday, so anything that cancels by a single exact identifier strands
 * triggers that keep firing for a habit the user changed or deleted. Those are
 * invisible in code review and invisible at runtime until a user reports a
 * notification for a habit that no longer exists.
 */

const mockSchedule = jest.fn((..._a: unknown[]) => Promise.resolve('id'));
const mockCancelOne = jest.fn((_id: string) => Promise.resolve());
const mockGetAll = jest.fn((): Promise<Array<{ identifier: string }>> => Promise.resolve([]));
const mockGetPerms = jest.fn(() => Promise.resolve({ status: 'granted' }));
const mockGetPrefs = jest.fn();
const mockGetDocs = jest.fn();
const mockFetchRoutines = jest.fn().mockResolvedValue([]);

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (id: string) => mockCancelOne(id),
  getAllScheduledNotificationsAsync: () => mockGetAll(),
  getPermissionsAsync: () => mockGetPerms(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));
jest.mock('../firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: unknown[]) => mockGetPrefs(...a),
}));
jest.mock('../firebase/routines.service', () => ({
  fetchUserRoutines: (...a: unknown[]) => mockFetchRoutines(...a),
  calculateTotalDuration: () => 10,
}));
jest.mock('../../config/firebase', () => ({ db: { __db: true } }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...a: unknown[]) => mockGetDocs(...a),
}));

import {
  scheduleHabitReminder,
  cancelHabitReminder,
  syncAllReminders,
  MAX_HABIT_REMINDER_TRIGGERS,
} from '../reminderScheduler.service';

function habit(overrides: Record<string, any> = {}): any {
  return {
    id: 'h1',
    name: 'Morning walk',
    frequencyType: 'daily',
    reminderEnabled: true,
    reminderTime: { hour: 7, minute: 30 },
    active: true,
    ...overrides,
  };
}

describe('the notification the user actually sees', () => {
  test('carries a title, a body, and the habit it belongs to', async () => {
    await scheduleHabitReminder(habit());

    const { content } = mockSchedule.mock.calls[0][0] as any;
    expect(content.title).toBe('Time for Morning walk');
    // A title-only notification renders as a bare line with no second row; the
    // in-app toast path receives body: '' and shows an empty slot.
    expect(content.body).toBe('A moment for this, if now works.');
    // The tap handler routes on data.type, and the habit id is the only thing
    // linking a delivered notification back to what it is about.
    expect(content.data).toEqual({ type: 'habit-reminder', habitId: 'h1' });
  });

  test('body says nothing about streaks, misses, or elapsed time', async () => {
    await scheduleHabitReminder(habit());

    const { content } = mockSchedule.mock.calls[0][0] as any;
    // A reminder arrives on bad days too. Absence framing turns it into a
    // reproach, which is the opposite of what a nudge is for.
    expect(content.body).not.toMatch(/streak|missed|haven't|days? in a row|don't break/i);
  });

  test('every weekday trigger of one habit carries the same content', async () => {
    await scheduleHabitReminder(
      habit({ frequencyType: 'specific_days', specificDays: [1, 3, 5] })
    );

    expect(mockSchedule).toHaveBeenCalledTimes(3);
    const bodies = mockSchedule.mock.calls.map((c: any) => c[0].content.body);
    expect(new Set(bodies).size).toBe(1);
  });
});

/** Identifiers currently pending, as expo would report them. */
function pending(...identifiers: string[]) {
  mockGetAll.mockResolvedValue(identifiers.map((identifier) => ({ identifier })));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetAll.mockResolvedValue([]);
});

describe('scheduling', () => {
  test('a daily habit gets ONE daily trigger on the bare identifier', async () => {
    await scheduleHabitReminder(habit());

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toMatchObject({
      identifier: 'habit-reminder-h1',
      trigger: { type: 'daily', hour: 7, minute: 30 },
    });
  });

  test('a flexible habit also gets a daily trigger', async () => {
    await scheduleHabitReminder(habit({ frequencyType: 'flexible' }));

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect((mockSchedule.mock.calls[0][0] as any).trigger.type).toBe('daily');
  });

  test('a Mon/Wed/Fri habit gets three WEEKLY triggers on the right weekdays', async () => {
    await scheduleHabitReminder(
      habit({ frequencyType: 'specific_days', specificDays: [1, 3, 5] })
    );

    expect(mockSchedule).toHaveBeenCalledTimes(3);
    const scheduled = mockSchedule.mock.calls.map((c) => c[0] as any);

    // Monday is expo weekday 2, Wednesday 4, Friday 6 — the off-by-one, pinned
    // where it would actually reach the OS.
    expect(scheduled.map((s) => s.identifier)).toEqual([
      'habit-reminder-h1-2',
      'habit-reminder-h1-4',
      'habit-reminder-h1-6',
    ]);
    expect(scheduled.map((s) => s.trigger)).toEqual([
      { type: 'weekly', weekday: 2, hour: 7, minute: 30 },
      { type: 'weekly', weekday: 4, hour: 7, minute: 30 },
      { type: 'weekly', weekday: 6, hour: 7, minute: 30 },
    ]);
  });

  test('schedules nothing when the reminder is off or has no time', async () => {
    await scheduleHabitReminder(habit({ reminderEnabled: false }));
    await scheduleHabitReminder(habit({ reminderTime: null }));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('schedules nothing for a habit with no usable cadence', async () => {
    await scheduleHabitReminder(habit({ frequencyType: undefined }));
    await scheduleHabitReminder(habit({ frequencyType: 'specific_days', specificDays: [] }));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('ignores quiet hours BY DESIGN — an explicit per-habit time beats a default window', async () => {
    // 22:00 sits inside the default 21:00-08:00 quiet window. The user typed it
    // into this habit's picker, so it schedules. If this test starts failing
    // because quiet-hours gating was added, that is a behaviour change to
    // discuss, not a bug to fix.
    await scheduleHabitReminder(habit({ reminderTime: { hour: 22, minute: 0 } }));

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect((mockSchedule.mock.calls[0][0] as any).trigger).toMatchObject({ hour: 22, minute: 0 });
  });

  test('degrades silently without permission — no schedule, no prompt', async () => {
    mockGetPerms.mockResolvedValue({ status: 'denied' });

    await scheduleHabitReminder(habit());

    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe('cancelling the whole set (the N-identifier leak)', () => {
  test('deleting a specific-days habit leaves NO orphaned weekday triggers', async () => {
    pending(
      'habit-reminder-h1-2',
      'habit-reminder-h1-4',
      'habit-reminder-h1-6',
      'habit-reminder-other',
      'routine-reminder-r1'
    );

    await cancelHabitReminder('h1');

    expect(mockCancelOne.mock.calls.map((c) => c[0]).sort()).toEqual([
      'habit-reminder-h1-2',
      'habit-reminder-h1-4',
      'habit-reminder-h1-6',
    ]);
    // Another habit's reminder and the routine reminder are untouched.
    expect(mockCancelOne).toHaveBeenCalledTimes(3);
  });

  test('changing Mon/Wed/Fri to Mon/Tue leaves no Wed or Fri trigger behind', async () => {
    pending('habit-reminder-h1-2', 'habit-reminder-h1-4', 'habit-reminder-h1-6');

    await scheduleHabitReminder(
      habit({ frequencyType: 'specific_days', specificDays: [1, 2] })
    );

    // All three old triggers cancelled...
    expect(mockCancelOne.mock.calls.map((c) => c[0]).sort()).toEqual([
      'habit-reminder-h1-2',
      'habit-reminder-h1-4',
      'habit-reminder-h1-6',
    ]);
    // ...and only Mon (2) and Tue (3) written back.
    expect(mockSchedule.mock.calls.map((c) => (c[0] as any).identifier)).toEqual([
      'habit-reminder-h1-2',
      'habit-reminder-h1-3',
    ]);
  });

  test('switching a specific-days habit to daily clears the weekday triggers', async () => {
    pending('habit-reminder-h1-2', 'habit-reminder-h1-4');

    await scheduleHabitReminder(habit({ frequencyType: 'daily' }));

    expect(mockCancelOne).toHaveBeenCalledWith('habit-reminder-h1-2');
    expect(mockCancelOne).toHaveBeenCalledWith('habit-reminder-h1-4');
    expect(mockSchedule.mock.calls.map((c) => (c[0] as any).identifier)).toEqual([
      'habit-reminder-h1',
    ]);
  });

  test('does not cancel a different habit whose id shares a prefix', async () => {
    pending('habit-reminder-h1', 'habit-reminder-h12', 'habit-reminder-h12-3');

    await cancelHabitReminder('h1');

    expect(mockCancelOne).toHaveBeenCalledTimes(1);
    expect(mockCancelOne).toHaveBeenCalledWith('habit-reminder-h1');
  });
});

describe('syncAllReminders', () => {
  function habitDocs(habits: any[]) {
    mockGetDocs.mockResolvedValue({
      docs: habits.map((h) => ({ id: h.id, data: () => h })),
    });
  }

  beforeEach(() => {
    mockGetPrefs.mockResolvedValue({ allNotificationsEnabled: true });
    mockFetchRoutines.mockResolvedValue([]);
  });

  test('schedules reminders from the new fields, not from a cue', async () => {
    habitDocs([
      habit({ id: 'a', createdAt: { toMillis: () => 1 } }),
      // A legacy cue-based habit is NOT a reminder any more.
      habit({
        id: 'b',
        reminderEnabled: false,
        cue: { type: 'time', value: '7:00 AM' },
        createdAt: { toMillis: () => 2 },
      }),
    ]);

    await syncAllReminders('u1');

    const ids = mockSchedule.mock.calls.map((c) => (c[0] as any).identifier);
    expect(ids).toEqual(['habit-reminder-a']);
  });

  test('caps total triggers and drops the NEWEST habits', async () => {
    // 40 daily habits fill the budget exactly; two newer ones must be dropped.
    const many = Array.from({ length: 42 }, (_, i) =>
      habit({ id: `h${i}`, createdAt: { toMillis: () => i } })
    );
    habitDocs(many);

    await syncAllReminders('u1');

    const ids = mockSchedule.mock.calls.map((c) => (c[0] as any).identifier);
    expect(ids).toHaveLength(MAX_HABIT_REMINDER_TRIGGERS);
    // Oldest protected...
    expect(ids).toContain('habit-reminder-h0');
    // ...newest dropped.
    expect(ids).not.toContain('habit-reminder-h40');
    expect(ids).not.toContain('habit-reminder-h41');
  });

  test('counts weekly habits by their real trigger count, not as one each', async () => {
    // Seven 7-day habits = 49 triggers, over the 40 budget. The sixth habit
    // (42 triggers) does not fit, so five are kept.
    const weekly = Array.from({ length: 7 }, (_, i) =>
      habit({
        id: `w${i}`,
        frequencyType: 'specific_days',
        specificDays: [0, 1, 2, 3, 4, 5, 6],
        createdAt: { toMillis: () => i },
      })
    );
    habitDocs(weekly);

    await syncAllReminders('u1');

    expect(mockSchedule).toHaveBeenCalledTimes(35); // 5 habits x 7 days
  });

  test('orders by createdAt, not by the order Firestore returned them', async () => {
    habitDocs([
      habit({ id: 'newest', createdAt: { toMillis: () => 300 } }),
      habit({ id: 'oldest', createdAt: { toMillis: () => 100 } }),
      habit({ id: 'middle', createdAt: { toMillis: () => 200 } }),
    ]);

    await syncAllReminders('u1');

    expect(mockSchedule.mock.calls.map((c) => (c[0] as any).identifier)).toEqual([
      'habit-reminder-oldest',
      'habit-reminder-middle',
      'habit-reminder-newest',
    ]);
  });

  test('a new reminder SURVIVES the next foreground resync once the master flag is on', async () => {
    // The self-destruct scenario: a user whose allNotificationsEnabled was
    // false sets a reminder. ensureRemindersAllowed flips the flag at save
    // time, so by the time the foreground resync runs, sync no longer bails
    // and the reminder is rescheduled instead of silently disappearing.
    mockGetPrefs.mockResolvedValue({ allNotificationsEnabled: true });
    habitDocs([habit({ id: 'fresh', createdAt: { toMillis: () => 1 } })]);

    await syncAllReminders('u1');

    expect(mockSchedule.mock.calls.map((c) => (c[0] as any).identifier)).toEqual([
      'habit-reminder-fresh',
    ]);
  });

  test('without the flip, that same reminder would be wiped — the bug this guards', async () => {
    mockGetPrefs.mockResolvedValue({ allNotificationsEnabled: false });
    habitDocs([habit({ id: 'fresh', createdAt: { toMillis: () => 1 } })]);

    await syncAllReminders('u1');

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('does nothing when the master toggle is off', async () => {
    mockGetPrefs.mockResolvedValue({ allNotificationsEnabled: false });
    habitDocs([habit()]);

    await syncAllReminders('u1');

    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
