/**
 * Ownership of daily rhythm work (NPM-2 commit 4, Kyle's ruling 4 on Build A).
 *
 * Fail closed: with no authenticated owner the direct apply changes nothing.
 * And ownership is confirmed at the moment of each change, so work started for
 * one account does nothing once another (or nobody) is current: part-way
 * through an apply, in a correcting reconcile, and in the reconcile overlay.
 *
 * The REAL scheduler and the REAL pending-intent store.
 */

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

const mockStore = new Map<string, Request>();
const mockOps: string[] = [];
const mockGetPrefs = jest.fn();
/** `auth` itself can be missing; when present, currentUser can be null. */
const mockFirebase: { auth: { currentUser: { uid: string } | null } | undefined } = {
  auth: { currentUser: { uid: 'u1' } },
};
/** Runs inside a cancel, to change the signed-in user part-way through work. */
let mockOnCancel: ((id: string) => void) | null = null;

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
    mockOnCancel?.(id);
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
    return mockFirebase.auth;
  },
}));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), Timestamp: {} }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyDailyRhythmChoice, reconcileDailyRhythm } from '../notificationScheduler.service';
import {
  NOTIFICATION_INTENT_KEY,
  pendingDailyRhythmOverlay,
  _resetNotificationIntentStoreForTests,
} from '../notificationIntentStore';

const ID = 'u1-daily-rhythm';
const INSIGHTS_ID = 'u1-insights-learning';
const NINE = { hour: 9, minute: 0 };

function signIn(uid: string | null) {
  mockFirebase.auth = { currentUser: uid ? { uid } : null };
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockStore.clear();
  mockOps.length = 0;
  mockOnCancel = null;
  signIn('u1');
  await AsyncStorage.clear();
  _resetNotificationIntentStoreForTests();
});

describe('fail closed: no authenticated owner, no mutation', () => {
  test('auth itself unavailable: the apply changes nothing', async () => {
    mockFirebase.auth = undefined;
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });

    // Mutation caught: treating a missing owner as the owner.
    await expect(applyDailyRhythmChoice('u1', { general: false, reminderTime: null })).resolves.toBe('no-owner');
    expect(mockOps).toEqual([]);
    expect(mockStore.has(ID)).toBe(true);
  });
});

describe('ownership is re-confirmed before each change the apply makes', () => {
  test('another account signs in after the Insights cancel: the daily reminder is not touched', async () => {
    mockOnCancel = (id) => {
      if (id === INSIGHTS_ID) signIn('u2');
    };

    // Mutation caught: dropping the check between the Insights cancel and the daily change.
    await expect(applyDailyRhythmChoice('u1', { general: true, reminderTime: NINE })).resolves.toBe('session-changed');
    expect(mockOps).toEqual([`cancel:${INSIGHTS_ID}`]);
  });

  test('everyone signs out part-way through: nothing more is changed', async () => {
    mockStore.set(ID, { identifier: ID, content: {}, trigger: {} });
    mockOnCancel = (id) => {
      if (id === INSIGHTS_ID) signIn(null);
    };

    // Mutation caught: an ownership check that fails open with nobody signed in.
    await expect(applyDailyRhythmChoice('u1', { general: false, reminderTime: null })).resolves.toBe('session-changed');
    expect(mockStore.has(ID)).toBe(true);
  });
});

describe('every reconcile is owner-checked (NPM-2 commit 7, clarification 1 on Build B)', () => {
  test('run for u1 while u2 is signed in: no change on the device', async () => {
    signIn('u2');
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 8, minute: 0 } });
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: false,
      dailyRhythm: { enabled: true, reminderTime: null },
    });

    // Mutation caught: the reconcile's owner check removed (different uid at the start).
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('session-changed');
    expect(mockOps).toEqual([]);
  });

  test('a passive reconcile with no one signed in makes no notification change', async () => {
    signIn(null);
    mockStore.set(ID, { identifier: ID, content: {}, trigger: { hour: 8, minute: 0 } });
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: NINE },
    });
    // Mutation caught: an owner check that fails open with missing auth.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('session-changed');
    expect(mockOps).toEqual([]);
    expect(mockStore.get(ID)?.trigger).toEqual({ hour: 8, minute: 0 });
  });

  test('same uid: the reconcile cancels and schedules as before', async () => {
    mockStore.set(INSIGHTS_ID, { identifier: INSIGHTS_ID, content: {}, trigger: {} });
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: NINE },
    });
    // Mutation caught: an owner check that blocks the owner too.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('scheduled');
    expect(mockOps).toEqual([`cancel:${INSIGHTS_ID}`, `schedule:${ID}`]);
  });

  test('the uid changes after the reconcile is queued, during its read: no change at all', async () => {
    let answer!: (v: unknown) => void;
    mockGetPrefs.mockReturnValue(new Promise((r) => (answer = r)));
    const reconciling = reconcileDailyRhythm('u1');
    await Promise.resolve();
    signIn('u2');
    answer({ allNotificationsEnabled: true, dailyRhythm: { enabled: true, reminderTime: NINE } });

    // Mutation caught: the check made once at queue time, or before the read, instead of at each change.
    await expect(reconciling).resolves.toBe('session-changed');
    expect(mockOps).toEqual([]);
  });

  test('the uid changes between the two changes: the later one does not happen', async () => {
    mockOnCancel = (id) => {
      if (id === INSIGHTS_ID) signIn('u2');
    };
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: NINE },
    });
    // Mutation caught: dropping the check between the Insights cancel and the daily change.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('session-changed');
    expect(mockOps).toEqual([`cancel:${INSIGHTS_ID}`]);
  });
});

describe('the reconcile overlay is only laid for the signed-in owner', () => {
  test("u1's pending General on is not laid over a u1 reconcile while u2 is signed in", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_INTENT_KEY,
      JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: true, seq: 1 } } })
    );
    signIn('u2');
    mockGetPrefs.mockResolvedValue({
      allNotificationsEnabled: false,
      dailyRhythm: { enabled: true, reminderTime: NINE },
    });

    // Changed under Kyle's ruling on D: the reconcile's own owner check now stops it first.
    await expect(reconcileDailyRhythm('u1')).resolves.toBe('session-changed');
    expect(mockOps).toEqual([]);
  });

  test('the overlay itself returns nothing for an account that is not signed in', async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_INTENT_KEY,
      JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: true, seq: 1 } } })
    );
    // The owner sees the entry, so the empty result below is the check, not an empty journal.
    await expect(pendingDailyRhythmOverlay('u1')).resolves.toEqual({ general: true });
    signIn('u2');
    // Mutation caught: dropping the ownership check from the overlay.
    await expect(pendingDailyRhythmOverlay('u1')).resolves.toEqual({});
  });
});
