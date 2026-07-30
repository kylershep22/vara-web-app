/**
 * scheduleDailyRhythm — the READ half of the opt-in loop.
 *
 * This is one of a pair. NotificationOptInScreen.test.tsx pins the WRITE: the
 * opt-in screen stores the chosen time at `dailyRhythm.reminderTime`. This file
 * pins the READ: given preferences in exactly that shape, the scheduler emits a
 * repeating DAILY trigger at that hour and minute.
 *
 * They are deliberately two unit tests rather than one integration test — the
 * write and the read live in different modules against a mocked Firestore, so a
 * genuine end-to-end assertion would need the emulator. Together they close the
 * loop that was broken: the old write targeted a legacy field, this read never
 * saw it, and nothing was ever scheduled.
 */

const mockSchedule = jest.fn((..._a: unknown[]) => Promise.resolve('notif-1'));
const mockCancelOne = jest.fn((_id: string) => Promise.resolve());
const mockGetPrefs = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (id: string) => mockCancelOne(id),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar' },
}));
jest.mock('../firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: unknown[]) => mockGetPrefs(...a),
  isWithinQuietHours: () => false,
}));
jest.mock('../notificationThrottle', () => ({
  canSendSystemNotification: jest.fn().mockResolvedValue(true),
  markNotificationSent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {},
}));

import { scheduleDailyRhythm } from '../notificationScheduler.service';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scheduleDailyRhythm', () => {
  test('schedules a repeating DAILY trigger at the stored dailyRhythm time', async () => {
    // The exact shape NotificationOptInScreen now writes.
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 7, minute: 30 } },
    });

    const id = await scheduleDailyRhythm('u1');

    expect(id).toBe('notif-1');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0]).toMatchObject({
      identifier: 'u1-daily-rhythm',
      trigger: { type: 'daily', hour: 7, minute: 30 },
    });
  });

  test('schedules nothing when the time was never stored', async () => {
    // The state the old legacy-field write left every opt-in user in.
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: null },
    });

    expect(await scheduleDailyRhythm('u1')).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('respects the master toggle', async () => {
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: false,
      dailyRhythm: { enabled: true, reminderTime: { hour: 7, minute: 30 } },
    });

    expect(await scheduleDailyRhythm('u1')).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('cancels the previous schedule before writing a new one', async () => {
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 21, minute: 5 } },
    });

    await scheduleDailyRhythm('u1');

    // Idempotent: re-running must not stack duplicate daily reminders.
    expect(mockCancelOne).toHaveBeenCalledWith('u1-daily-rhythm');
  });
});
