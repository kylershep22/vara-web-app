/**
 * applyDailyRhythmChoice (NPM-2, Kyle's Decision 1 on Addendum 1).
 *
 * The user's current General and daily-time choice is applied to the device at
 * once, on the reconcile queue, WITHOUT reading Firestore. It schedules or
 * cancels by the same activation rule as the reconcile, cancels the hidden
 * Insights notification as the reconcile does, and does nothing if the
 * signed-in user has changed by the time it runs.
 *
 * The OS notification store is in memory and every cancel and schedule is
 * logged in order.
 */

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

const mockStore = new Map<string, Request>();
const mockOps: string[] = [];
const mockGetPrefs = jest.fn();
const mockAuth: { currentUser: { uid: string } | null } = { currentUser: { uid: 'u1' } };

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
// A getter: the factory runs at the hoisted import, before mockAuth is initialised.
jest.mock('../../config/firebase', () => ({
  db: null,
  get auth() {
    return mockAuth;
  },
}));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), Timestamp: {} }));

import * as Notifications from 'expo-notifications';
import { applyDailyRhythmChoice, reconcileDailyRhythm } from '../notificationScheduler.service';

const ID = 'u1-daily-rhythm';
const INSIGHTS_ID = 'u1-insights-learning';

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
  mockAuth.currentUser = { uid: 'u1' };
});

describe('A1: the choice it is given decides, and Firestore is never read', () => {
  test('General on with a valid time schedules the daily reminder at that time', async () => {
    await expect(
      applyDailyRhythmChoice('u1', { general: true, reminderTime: { hour: 21, minute: 30 } })
    ).resolves.toBe('scheduled');

    expect(mockStore.get(ID)?.trigger).toMatchObject({ type: 'daily', hour: 21, minute: 30 });
    // Mutation caught: a preferences read added to the apply.
    expect(mockGetPrefs).not.toHaveBeenCalled();
  });

  test.each([
    ['General off', { general: false, reminderTime: { hour: 21, minute: 30 } }],
    ['no time', { general: true, reminderTime: null }],
    ['an invalid time', { general: true, reminderTime: { hour: 21, minute: null } }],
  ])('%s cancels the daily reminder', async (_label, choice) => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });

    await expect(
      applyDailyRhythmChoice('u1', choice as Parameters<typeof applyDailyRhythmChoice>[1])
    ).resolves.toBe('cancelled');

    expect(mockStore.has(ID)).toBe(false);
    expect(mockOps).not.toContain(`schedule:${ID}`);
    expect(mockGetPrefs).not.toHaveBeenCalled();
  });

  test('a schedule failure is reported, never thrown', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('os said no'));
    await expect(
      applyDailyRhythmChoice('u1', { general: true, reminderTime: { hour: 21, minute: 30 } })
    ).resolves.toBe('schedule-failed');
  });
});

describe('A2: it runs on the reconcile queue', () => {
  test('it waits behind a reconcile already in flight, and its result is the last word', async () => {
    // The reconcile reads the OLD stored choice (on at 18:20) and is still
    // reading when the user's new choice (off) is applied.
    const read = deferred<unknown>();
    mockGetPrefs.mockReturnValueOnce(read.promise);
    const reconciling = reconcileDailyRhythm('u1');
    const applying = applyDailyRhythmChoice('u1', { general: false, reminderTime: { hour: 18, minute: 20 } });

    await Promise.resolve();
    await Promise.resolve();
    // Mutation caught: the apply bypassing the queue would have cancelled already.
    expect(mockOps).toEqual([]);

    read.resolve({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 18, minute: 20 } },
    });
    await expect(reconciling).resolves.toBe('scheduled');
    await expect(applying).resolves.toBe('cancelled');

    // The reconcile scheduled, then the apply cancelled: the user's choice stands.
    expect(mockOps.filter((op) => op.endsWith(ID))).toEqual([`schedule:${ID}`, `cancel:${ID}`]);
    expect(mockStore.has(ID)).toBe(false);
  });
});

describe('A3: the session guard', () => {
  test('a different signed-in user when it runs: nothing is scheduled or cancelled', async () => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });
    mockAuth.currentUser = { uid: 'someone-else' };

    await expect(
      applyDailyRhythmChoice('u1', { general: false, reminderTime: null })
    ).resolves.toBe('session-changed');

    // Mutation caught: removing the guard would cancel u1's reminder here.
    expect(mockOps).toEqual([]);
    expect(mockStore.has(ID)).toBe(true);
  });

  test('nobody signed in: nothing happens', async () => {
    mockAuth.currentUser = null;
    await expect(
      applyDailyRhythmChoice('u1', { general: true, reminderTime: { hour: 9, minute: 0 } })
    ).resolves.toBe('session-changed');
    expect(mockOps).toEqual([]);
  });

  test('the user is checked when the work RUNS, not when it is queued', async () => {
    const read = deferred<unknown>();
    mockGetPrefs.mockReturnValueOnce(read.promise);
    const reconciling = reconcileDailyRhythm('u1');
    const applying = applyDailyRhythmChoice('u1', { general: true, reminderTime: { hour: 9, minute: 0 } });

    // The session ends while the apply waits its turn.
    mockAuth.currentUser = null;
    read.resolve({ allNotificationsEnabled: false, dailyRhythm: { enabled: true, reminderTime: null } });
    await reconciling;

    // Mutation caught: capturing the uid at queue time would schedule for a gone session.
    await expect(applying).resolves.toBe('session-changed');
    expect(mockOps).not.toContain(`schedule:${ID}`);
  });
});

describe('A4: the hidden Insights notification', () => {
  test.each([
    ['when it schedules', { general: true, reminderTime: { hour: 9, minute: 0 } }],
    ['when it cancels', { general: false, reminderTime: null }],
  ])('is cancelled %s, as the reconcile does', async (_label, choice) => {
    mockStore.set(INSIGHTS_ID, { identifier: INSIGHTS_ID, content: {}, trigger: {} });

    await applyDailyRhythmChoice('u1', choice as Parameters<typeof applyDailyRhythmChoice>[1]);

    // Mutation caught: dropping the Insights cancel from the shared apply path.
    expect(mockStore.has(INSIGHTS_ID)).toBe(false);
    expect(mockOps).toContain(`cancel:${INSIGHTS_ID}`);
  });
});

describe('A5: a later read that fails leaves the applied choice in place', () => {
  test('apply schedules 21:30, then an offline reconcile read is rejected: 21:30 stays', async () => {
    await applyDailyRhythmChoice('u1', { general: true, reminderTime: { hour: 21, minute: 30 } });
    mockOps.length = 0;
    mockGetPrefs.mockRejectedValueOnce(new Error('Failed to get document because the client is offline.'));

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('read-failed');

    // Mutation caught: any cancel on the failed-read path removes the user's choice.
    expect(mockOps).toEqual([]);
    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 21, minute: 30 });
  });
});
