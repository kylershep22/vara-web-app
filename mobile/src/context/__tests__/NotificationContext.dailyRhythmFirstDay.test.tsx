/**
 * NPM-1 DAILY-RHYTHM-RELIABILITY: the first-day regression.
 *
 * A new user's NotificationProvider loads preferences once, at sign-up, when the
 * document is created with General notifications off. Onboarding then writes
 * General ON with a time and schedules the daily rhythm, through the service,
 * where no hook copy sees it. On the first leave-and-return the foreground
 * handler used to cancel every pending notification and reschedule the daily
 * rhythm only if the provider's (stale, false) copy said General was on, so the
 * first reminder was silently lost until a cold start.
 *
 * Unlike NotificationContext.test.tsx, this file does NOT mock the preferences
 * hook. The real hook, the real provider and the real scheduler run against an
 * in-memory preferences document and an in-memory OS notification store, so the
 * stale copy is the one the app really holds.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

type Content = { data?: Record<string, unknown> } & Record<string, unknown>;
type Request = { identifier: string; content: Content; trigger: Record<string, unknown> };
type ScheduleInput = { identifier?: string; content: Content; trigger: Record<string, unknown> };

/** The OS's pending-notification store. */
const mockStore = new Map<string, Request>();
let mockAutoId = 0;

/** The Firestore notificationPreferences/{uid} document; undefined = absent. */
let mockPrefsDoc: Record<string, unknown> | undefined;

const mockDefaults = () => ({
  schemaVersion: 2,
  allNotificationsEnabled: false,
  quietHours: { enabled: true, startTime: { hour: 21, minute: 0 }, endTime: { hour: 8, minute: 0 } },
  dailyRhythm: { enabled: true, reminderTime: null },
  insightsLearning: { enabled: false, frequency: 'twice_weekly' },
  socialConnection: { directMessages: true, connectionRequests: true, communityDigest: false },
  milestonesReflection: { enabled: false },
  completionSound: { enabled: true, sound: 'singing-bowl' },
});

const mockGetPrefs = jest.fn(async (uid: string) => {
  if (!mockPrefsDoc) mockPrefsDoc = { userId: uid, ...mockDefaults() };
  return JSON.parse(JSON.stringify({ id: uid, ...mockPrefsDoc }));
});
const mockUpdatePrefs = jest.fn(async (_uid: string, updates: Record<string, unknown>) => {
  mockPrefsDoc = { ...mockPrefsDoc, ...JSON.parse(JSON.stringify(updates)) };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async (req: ScheduleInput) => {
    const identifier = req.identifier ?? `auto-${++mockAutoId}`;
    mockStore.set(identifier, { identifier, content: req.content, trigger: req.trigger });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockStore.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => Array.from(mockStore.values())),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', DATE: 'date' },
}));

// A function declaration, so it is hoisted alongside the jest.mock calls.
function mockPrefsService() {
  return {
    getNotificationPreferences: (uid: string) => mockGetPrefs(uid),
    updateNotificationPreferences: (uid: string, u: Record<string, unknown>) => mockUpdatePrefs(uid, u),
    updateNotificationCategory: (uid: string, k: string, v: unknown) => mockUpdatePrefs(uid, { [k]: v }),
    toggleAllNotifications: (uid: string, v: boolean) => mockUpdatePrefs(uid, { allNotificationsEnabled: v }),
    updateQuietHours: (uid: string, v: unknown) => mockUpdatePrefs(uid, { quietHours: v }),
    isWithinQuietHours: () => false,
  };
}
jest.mock('../../services/firebase', () => mockPrefsService());
jest.mock('../../services/firebase/notificationPreferences.service', () => mockPrefsService());
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../../services/notificationThrottle', () => ({
  canSendSystemNotification: jest.fn().mockResolvedValue(true),
  markNotificationSent: jest.fn().mockResolvedValue(undefined),
}));

let mockUser: { uid: string; emailVerified: boolean } | null = { uid: 'u1', emailVerified: true };

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: true }),
}));
jest.mock('../ToastContext', () => ({
  useToast: () => ({ showNotificationToast: jest.fn() }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: jest.fn(),
  // The foreground sweep, against the same in-memory store: focus-complete is
  // always spared, and so is anything the caller's predicate claims.
  cancelAllScheduledExceptFocusComplete: jest.fn(async (spare: (id: string) => boolean = () => false) => {
    for (const [id, req] of Array.from(mockStore.entries())) {
      if (req.content?.data?.type === 'focus-complete') continue;
      if (spare(id)) continue;
      mockStore.delete(id);
    }
  }),
  registerAndSaveFCMToken: jest.fn().mockResolvedValue(null),
  isServerPushEnabled: jest.fn().mockResolvedValue(false),
  addNotificationResponseListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: jest.fn().mockResolvedValue(undefined),
  cancelAllRoutineReminders: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/focusSession.service', () => ({
  getActiveFocusSession: jest.fn().mockResolvedValue(null),
  clearActiveFocusSession: jest.fn(),
  finalizeFocusSession: jest.fn(),
  planFocusCompleteLaunch: jest.fn(() => ({ finalize: null, completedSessionId: null })),
}));
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: { isReady: () => false, navigate: jest.fn() },
}));

import { NotificationProvider } from '../NotificationContext';
import { scheduleDailyRhythm } from '../../services/notificationScheduler.service';

let appStateHandler: ((state: AppStateStatus) => void) | null = null;

/** Let every queued promise and effect settle. */
async function settle() {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockPrefsDoc = undefined;
  mockUser = { uid: 'u1', emailVerified: true };
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    handler: (state: AppStateStatus) => void
  ) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a new user’s first daily reminder (NPM-1)', () => {
  test('survives a leave-and-return after onboarding, although the provider loaded General off', async () => {
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();

    // Sign-up created the document with General off; that is the provider's copy.
    expect(mockPrefsDoc?.allNotificationsEnabled).toBe(false);

    // Onboarding's Reminder step: the write, then the schedule, through the
    // service, exactly as the screen does it.
    await act(async () => {
      await mockUpdatePrefs('u1', {
        allNotificationsEnabled: true,
        dailyRhythm: { enabled: true, reminderTime: { hour: 18, minute: 20 } },
      });
      await scheduleDailyRhythm('u1');
    });
    expect(mockStore.has('u1-daily-rhythm')).toBe(true);

    // Leave and return.
    await act(async () => {
      appStateHandler?.('background');
    });
    await act(async () => {
      appStateHandler?.('active');
    });
    await settle();

    const pending = mockStore.get('u1-daily-rhythm');
    expect(pending).toBeDefined();
    expect(pending?.trigger).toMatchObject({ hour: 18, minute: 20 });
  });
});

describe('a new user’s first daily reminder, decided by a fresh read (NPM-1)', () => {
  test('the provider loaded General off, onboarding wrote it ON, nothing is pending: the return schedules it', async () => {
    // Isolates the fresh read from the sweep's spare: here there is nothing to
    // spare (the onboarding schedule never happened, as when the sheet's own
    // inactive/active transition or a failed schedule left nothing pending), so
    // only a reconcile that reads fresh state can put the reminder back.
    // Mutation caught: deciding from the provider's preferences copy.
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();
    expect(mockPrefsDoc?.allNotificationsEnabled).toBe(false);

    await act(async () => {
      await mockUpdatePrefs('u1', {
        allNotificationsEnabled: true,
        dailyRhythm: { enabled: true, reminderTime: { hour: 18, minute: 20 } },
      });
    });
    expect(mockStore.has('u1-daily-rhythm')).toBe(false);

    await act(async () => {
      appStateHandler?.('background');
    });
    await act(async () => {
      appStateHandler?.('active');
    });
    await settle();

    expect(mockStore.get('u1-daily-rhythm')?.trigger).toMatchObject({ hour: 18, minute: 20 });
  });
});

describe('the next return after a change outside the app (NPM-1)', () => {
  test('permission granted later in iOS Settings: the next foreground schedules the reminder', async () => {
    // Onboarding was refused: General ON and the time saved, nothing scheduled.
    // The user then allows notifications in iOS Settings and comes back.
    // Mutation caught: gating the foreground reconcile on OS permission or on
    // a stored copy.
    mockPrefsDoc = {
      userId: 'u1',
      ...mockDefaults(),
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 9, minute: 30 } },
    };
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();
    mockStore.clear();

    await act(async () => {
      appStateHandler?.('background');
    });
    await act(async () => {
      appStateHandler?.('active');
    });
    await settle();

    expect(mockStore.get('u1-daily-rhythm')?.trigger).toMatchObject({ hour: 9, minute: 30 });
  });

  test('an offline return leaves the pending reminder in place', async () => {
    // The sweep spares the id and the reconcile's failed read changes nothing.
    // Mutation caught: the sweep without the spare predicate.
    mockPrefsDoc = {
      userId: 'u1',
      ...mockDefaults(),
      allNotificationsEnabled: true,
      dailyRhythm: { enabled: true, reminderTime: { hour: 9, minute: 30 } },
    };
    render(
      <NotificationProvider>
        <></>
      </NotificationProvider>
    );
    await settle();
    expect(mockStore.has('u1-daily-rhythm')).toBe(true);

    mockGetPrefs.mockRejectedValueOnce(new Error('Failed to get document because the client is offline.'));
    await act(async () => {
      appStateHandler?.('background');
    });
    await act(async () => {
      appStateHandler?.('active');
    });
    await settle();

    expect(mockStore.get('u1-daily-rhythm')?.trigger).toMatchObject({ hour: 9, minute: 30 });
  });
});
