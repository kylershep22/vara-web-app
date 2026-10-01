/**
 * reconcileDailyRhythm (NPM-1 DAILY-RHYTHM-RELIABILITY).
 *
 * The reconcile works out the desired state from a FRESH preferences read, then
 * makes the device match it: the daily rhythm scheduled at reminderTime when
 * General notifications and the daily rhythm are on and a time exists, cancelled
 * otherwise. A failed read changes nothing. Overlapping calls run one at a time.
 *
 * The OS notification store is in memory, and every cancel and schedule is
 * logged in order, so "no cancel after the schedule" is checkable.
 */

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

const mockStore = new Map<string, Request>();
const mockOps: string[] = [];
const mockGetPrefs = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async (req: ScheduleInput) => {
    const identifier = req.identifier ?? 'unnamed';
    mockOps.push(`schedule:${identifier}`);
    mockStore.set(identifier, { identifier, content: req.content, trigger: req.trigger });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockOps.push(`cancel:${id}`);
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

import * as Notifications from 'expo-notifications';
import {
  reconcileDailyRhythm,
  dailyRhythmContent,
  initializeUserNotifications,
} from '../notificationScheduler.service';

const ID = 'u1-daily-rhythm';
const INSIGHTS_ID = 'u1-insights-learning';

function prefs(overrides: Record<string, unknown> = {}) {
  return {
    allNotificationsEnabled: true,
    dailyRhythm: { enabled: true, reminderTime: { hour: 18, minute: 20 } },
    insightsLearning: { enabled: false, frequency: 'twice_weekly' },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockOps.length = 0;
  mockGetPrefs.mockResolvedValue(prefs());
});

describe('the desired state, from a fresh read', () => {
  test('on: schedules the daily rhythm at the stored time, under the uid id', async () => {
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');

    expect(mockGetPrefs).toHaveBeenCalledWith('u1');
    expect(mockStore.get(ID)?.trigger).toMatchObject({ type: 'daily', hour: 18, minute: 20 });
    expect(mockStore.get(ID)?.content.data).toEqual({ type: 'daily_reminder', category: 'daily_rhythm' });
  });

  test.each([
    ['General off', prefs({ allNotificationsEnabled: false })],
    ['the daily rhythm disabled', prefs({ dailyRhythm: { enabled: false, reminderTime: { hour: 18, minute: 20 } } })],
    ['no time', prefs({ dailyRhythm: { enabled: true, reminderTime: null } })],
  ])('%s: cancels the id and never schedules it', async (_label, p) => {
    // Mutation caught: an early return without the cancel (scheduleDailyRhythm's
    // old shape), which left yesterday's reminder in place.
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });
    mockGetPrefs.mockResolvedValue(p);

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('cancelled');

    expect(mockStore.has(ID)).toBe(false);
    expect(mockOps).not.toContain(`schedule:${ID}`);
  });

  test('a changed time replaces the pending one: one reminder, at the new time', async () => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 18, minute: 20 } });
    mockGetPrefs.mockResolvedValue(prefs({ dailyRhythm: { enabled: true, reminderTime: { hour: 7, minute: 5 } } }));

    await reconcileDailyRhythm('u1');

    expect(Array.from(mockStore.keys()).filter((k) => k === ID)).toHaveLength(1);
    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 7, minute: 5 });
  });

  test('OS permission is not part of the decision (NPM-1 ruling 3)', async () => {
    // Mutation caught: gating the reconcile on permission, which would leave a
    // user who allows notifications later in iOS Settings without a reminder.
    const permissions = jest.fn(async () => ({ status: 'denied' }));
    (Notifications as unknown as Record<string, unknown>).getPermissionsAsync = permissions;

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');
    expect(permissions).not.toHaveBeenCalled();
  });
});

describe('a failed read changes nothing', () => {
  test('a rejected read leaves the pending reminder exactly as it was', async () => {
    // Mutation caught: cancelling before the read (cancel-then-decide).
    const pending = { identifier: ID, content: { body: 'x' }, trigger: { hour: 9, minute: 0 } };
    mockStore.set(ID, pending);
    mockStore.set(INSIGHTS_ID, { identifier: INSIGHTS_ID, content: {}, trigger: {} });
    mockGetPrefs.mockRejectedValue(new Error('Failed to get document because the client is offline.'));

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('read-failed');

    expect(mockStore.get(ID)).toBe(pending);
    expect(mockOps).toEqual([]);
  });

  test('a read that never answers times out and changes nothing, so the queue is not stalled', async () => {
    jest.useFakeTimers();
    try {
      mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });
      mockGetPrefs.mockReturnValueOnce(new Promise(() => {}));

      const run = reconcileDailyRhythm('u1');
      await jest.advanceTimersByTimeAsync(10_000);
      await expect(run).resolves.toBe('read-failed');
      expect(mockStore.has(ID)).toBe(true);

      // The next reconcile is not stuck behind the hung read.
      await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('one run never cancels the id it schedules', () => {
  test('the scheduling run issues no cancel of the daily rhythm id at all', async () => {
    // Mutation caught: a cancel-then-schedule of the same id, which leaves the
    // reminder cancelled if the schedule then fails.
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });

    await reconcileDailyRhythm('u1');

    expect(mockOps.filter((op) => op === `cancel:${ID}`)).toEqual([]);
    expect(mockOps).toContain(`schedule:${ID}`);
  });
});

describe('overlapping reconciles run one at a time', () => {
  test('a reconcile that read General off before onboarding wrote it ON cannot undo the later one', async () => {
    // A foreground reconcile reads first, slowly, and sees General off; onboarding
    // then writes General ON and reconciles. Run concurrently, the slow first
    // run lands last and cancels. Queued, the second run reads after the first
    // finishes and ends scheduled.
    // Mutation caught: removing the queue.
    const slowFirstRead = deferred<ReturnType<typeof prefs>>();
    mockGetPrefs
      .mockReturnValueOnce(slowFirstRead.promise)
      .mockResolvedValueOnce(prefs());

    const first = reconcileDailyRhythm('u1');
    const second = reconcileDailyRhythm('u1');
    await Promise.resolve();
    slowFirstRead.resolve(prefs({ allNotificationsEnabled: false }));

    await expect(first).resolves.toBe('cancelled');
    await expect(second).resolves.toBe('scheduled');
    expect(mockStore.has(ID)).toBe(true);
  });
});

describe('Insights notifications are hidden pending INSIGHTS-V1 (NPM-1 ruling 2)', () => {
  test('a pending insights notification is cancelled, even with the stored preference on', async () => {
    // Mutation caught: dropping the insights cancel from the reconcile.
    mockStore.set(INSIGHTS_ID, { identifier: INSIGHTS_ID, content: {}, trigger: {} });
    mockGetPrefs.mockResolvedValue(prefs({ insightsLearning: { enabled: true, frequency: 'twice_weekly' } }));

    await reconcileDailyRhythm('u1');

    expect(mockStore.has(INSIGHTS_ID)).toBe(false);
  });

  test('nothing schedules one: not the reconcile, not initializeUserNotifications', async () => {
    // Mutation caught: restoring the insights branch in initializeUserNotifications.
    mockGetPrefs.mockResolvedValue(prefs({ insightsLearning: { enabled: true, frequency: 'twice_weekly' } }));

    await reconcileDailyRhythm('u1');
    await initializeUserNotifications('u1');

    expect(mockOps.filter((op) => op === `schedule:${INSIGHTS_ID}`)).toEqual([]);
  });
});

describe('daily rhythm copy (NPM-1, Kyle’s approved strings)', () => {
  test.each([
    [8, 'Good morning', 'Your morning practice is ready when you are.'],
    [11, 'Good morning', 'Your morning practice is ready when you are.'],
    [12, 'Your practice is ready', 'Your daily practice is ready when you are.'],
    [16, 'Your practice is ready', 'Your daily practice is ready when you are.'],
    [17, 'Good evening', 'Your evening practice is ready when you are.'],
    [23, 'Good evening', 'Your evening practice is ready when you are.'],
  ])('a reminder at %i:00 reads "%s" / "%s", every time', (hour, title, body) => {
    // One variant per time of day: no random selection.
    for (let i = 0; i < 5; i++) {
      expect(dailyRhythmContent(hour)).toMatchObject({ title, body });
    }
  });

  test('no title or body at any hour uses the word routine', () => {
    // TAXONOMY: routine is reserved for the user-created Routines feature.
    // Mutation caught: restoring any of the former strings.
    for (let hour = 0; hour < 24; hour++) {
      const { title, body } = dailyRhythmContent(hour);
      expect(`${title} ${body}`).not.toMatch(/routine/i);
      expect(`${title} ${body}`).not.toMatch(/if it feels right/i);
    }
  });
});
