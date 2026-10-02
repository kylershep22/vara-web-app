/**
 * The legacy dailyRhythm.enabled flag is not a second activation switch
 * (NPM-2, Kyle's Ruling 10 and Decision 8 on Addendum 1).
 *
 * Written at b8c4c67 as before-state evidence, where both cases FAIL: an account
 * with General on, a stored dailyRhythm.enabled of false and a valid time was
 * cancelled by the reconcile and skipped by scheduleDailyRhythm, with no control
 * on screen that could explain why. From NPM-2 the user-facing rule is General
 * on plus a valid time, and dailyRhythm.enabled is not consulted.
 */

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

const mockStore = new Map<string, Request>();
const mockGetPrefs = jest.fn();

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
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), Timestamp: {} }));

import { reconcileDailyRhythm, scheduleDailyRhythm } from '../notificationScheduler.service';

const ID = 'u1-daily-rhythm';

const generalOnLegacyFalse = {
  id: 'u1',
  allNotificationsEnabled: true,
  dailyRhythm: { enabled: false, reminderTime: { hour: 18, minute: 20 } },
  insightsLearning: { enabled: false, frequency: 'twice_weekly' },
  socialConnection: { directMessages: true, connectionRequests: true, communityDigest: false },
  milestonesReflection: { enabled: false },
  quietHours: { enabled: false, startTime: { hour: 21, minute: 0 }, endTime: { hour: 8, minute: 0 } },
};

beforeEach(() => {
  mockStore.clear();
  mockGetPrefs.mockReset();
});

describe('dailyRhythm.enabled false does not hide the daily reminder', () => {
  test('the reconcile schedules it at the stored time', async () => {
    // Mutation caught: restoring the dailyRhythm.enabled check in the activation rule.
    mockGetPrefs.mockResolvedValue(generalOnLegacyFalse);
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');
    expect(mockStore.get(ID)?.trigger).toMatchObject({ type: 'daily', hour: 18, minute: 20 });
  });

  test('scheduleDailyRhythm schedules it too: one rule, not two', async () => {
    // Mutation caught: scheduleDailyRhythm keeping its own enabled check.
    mockGetPrefs.mockResolvedValue(generalOnLegacyFalse);
    await expect(scheduleDailyRhythm('u1')).resolves.toBe(ID);
    expect(mockStore.get(ID)?.trigger).toMatchObject({ type: 'daily', hour: 18, minute: 20 });
  });
});
