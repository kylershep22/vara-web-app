/**
 * The reconcile lays this device's pending notification changes over its read
 * (NPM-2, Kyle's Decision 2: a pending change takes precedence over an older
 * remote value on this device until synchronization resolves).
 *
 * The REAL scheduler and the REAL pending-intent store, over the package's
 * in-memory AsyncStorage mock. Pending entries are written to disk in the
 * journal's own format, as a previous launch would have left them.
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
jest.mock('../../config/firebase', () => ({
  db: null,
  get auth() {
    return mockAuth;
  },
}));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), Timestamp: {} }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileDailyRhythm } from '../notificationScheduler.service';
import {
  NOTIFICATION_INTENT_KEY,
  currentGeneration,
  ensureJournalLoaded,
  settleIntent,
  _resetNotificationIntentStoreForTests,
} from '../notificationIntentStore';

const ID = 'u1-daily-rhythm';

function remote(overrides: Record<string, unknown> = {}) {
  return {
    allNotificationsEnabled: true,
    dailyRhythm: { enabled: true, reminderTime: { hour: 8, minute: 0 } },
    insightsLearning: { enabled: false, frequency: 'twice_weekly' },
    ...overrides,
  };
}

async function pending(entries: Record<string, { value: unknown; seq: number }>) {
  await AsyncStorage.setItem(NOTIFICATION_INTENT_KEY, JSON.stringify({ v: 1, uid: 'u1', entries }));
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockStore.clear();
  mockOps.length = 0;
  mockAuth.currentUser = { uid: 'u1' };
  await AsyncStorage.clear();
  _resetNotificationIntentStoreForTests();
});

describe('R1 and R2 [K2]: a pending change beats an older remote value', () => {
  test('R1: remote General off, pending General on: scheduled', async () => {
    await pending({ general: { value: true, seq: 1 } });
    mockGetPrefs.mockResolvedValue(remote({ allNotificationsEnabled: false }));

    // Mutation caught: dropping the overlay from the reconcile.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');
    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 8, minute: 0 });
  });

  test('R1: remote General on, pending General off: cancelled', async () => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 8, minute: 0 } });
    await pending({ general: { value: false, seq: 1 } });
    mockGetPrefs.mockResolvedValue(remote());

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('cancelled');
    expect(mockStore.has(ID)).toBe(false);
  });

  test('R2: remote 08:00, pending 21:30: scheduled at 21:30', async () => {
    await pending({ dailyTime: { value: { hour: 21, minute: 30 }, seq: 1 } });
    mockGetPrefs.mockResolvedValue(remote());

    await reconcileDailyRhythm('u1');

    // Mutation caught: the remote time taking precedence over the pending one.
    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 21, minute: 30 });
  });

  test("R2: another user's pending change is never laid over this user's read", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_INTENT_KEY,
      JSON.stringify({ v: 1, uid: 'someone-else', entries: { dailyTime: { value: { hour: 21, minute: 30 }, seq: 1 } } })
    );
    mockGetPrefs.mockResolvedValue(remote());

    await reconcileDailyRhythm('u1');

    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 8, minute: 0 });
  });
});

describe('R3: a failed read still changes nothing', () => {
  test('pending General on with 21:30, read rejected offline: the 08:00 reminder is untouched', async () => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 8, minute: 0 } });
    await pending({ general: { value: true, seq: 1 }, dailyTime: { value: { hour: 21, minute: 30 }, seq: 2 } });
    mockGetPrefs.mockRejectedValue(new Error('Failed to get document because the client is offline.'));

    await expect(reconcileDailyRhythm('u1')).resolves.toBe('read-failed');

    // Mutation caught: applying the overlay on the failed-read path.
    expect(mockOps).toEqual([]);
    expect(mockStore.get(ID)?.trigger).toMatchObject({ hour: 8, minute: 0 });
  });
});

describe('R4: once the entry clears, the reconcile follows the remote value', () => {
  test('pending General on is acknowledged and cleared; remote now says off: cancelled', async () => {
    await pending({ general: { value: true, seq: 7 } });
    await ensureJournalLoaded('u1');
    await settleIntent('u1', 'general', 7, currentGeneration());
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 8, minute: 0 } });
    mockGetPrefs.mockResolvedValue(remote({ allNotificationsEnabled: false }));

    // Mutation caught: a settled entry left in memory keeps overriding the remote value.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('cancelled');
  });
});
