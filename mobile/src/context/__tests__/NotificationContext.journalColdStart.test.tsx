/**
 * C4, rewritten (NPM-2 commit 4, Kyle's ruling 1 on Build A): a transient
 * unauthenticated startup state is not a session loss.
 *
 * The REAL pending-intent journal and store, under the REAL NotificationProvider.
 * A signed-out cold start leaves a stored record on disk. The same account
 * signing in afterwards replays it; a different account signing in discards it
 * before anything is sent or applied.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockUser: { uid: string; emailVerified: boolean } | null = null;
let mockAuthReady = true;
const mockFirebaseAuth: { currentUser: { uid: string } | null } = { currentUser: null };
const mockUpdate = jest.fn();
const mockApply = jest.fn();
const mockCancelRoutines = jest.fn();

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthReady: mockAuthReady }),
}));
jest.mock('../ToastContext', () => ({ useToast: () => ({ showNotificationToast: jest.fn() }) }));
jest.mock('../../config/firebase', () => ({
  db: null,
  get auth() {
    return mockFirebaseAuth;
  },
}));
// NPM-3a-ii: push token registration is not under test here; its suites are
// src/__tests__/npm3aii and src/services/__tests__/pushRegistration.*.
jest.mock('../../services/pushRegistration.service', () => ({
  ensurePushRegistration: jest.fn().mockResolvedValue(undefined),
  onDeviceTokenChange: () => ({ remove: () => undefined }),
}));
jest.mock('../../services/notifications.service', () => ({
  setForegroundNotificationHandler: jest.fn(),
  cancelAllScheduledExceptFocusComplete: jest.fn().mockResolvedValue(undefined),
  // NPM-3a-ii: registration moved to pushRegistration.service (mocked below).
  onNotificationPermissionGranted: () => () => undefined,
  dismissAllDeliveredNotifications: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponse: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  syncAllReminders: jest.fn().mockResolvedValue(undefined),
  cancelAllRoutineReminders: (...a: unknown[]) => mockCancelRoutines(...a),
  invalidateRoutineReminderAttempts: jest.fn(),
  isRoutineReminderId: (id: string) => id.startsWith('routine-reminder-'),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  reconcileDailyRhythm: jest.fn().mockResolvedValue('scheduled'),
  applyDailyRhythmChoice: (...a: unknown[]) => mockApply(...a),
  dailyRhythmNotificationId: (uid: string) => `${uid}-daily-rhythm`,
  cancelAllUserNotifications: jest.fn().mockResolvedValue(undefined),
  sendMilestoneNotification: jest.fn(),
  sendConnectionRequestNotification: jest.fn(),
  sendMessageNotification: jest.fn(),
  sendGroupPostNotification: jest.fn(),
  sendMentionNotification: jest.fn(),
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  updateNotificationPreferences: (...a: unknown[]) => mockUpdate(...a),
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
import { NOTIFICATION_INTENT_KEY, _resetNotificationIntentStoreForTests } from '../../services/notificationIntentStore';
import { _resetNotificationIntentJournalForTests } from '../../services/notificationIntentJournal';

const u1Record = { v: 1, uid: 'u1', entries: { general: { value: false, seq: 5 } } };

function tree() {
  return (
    <NotificationProvider>
      <></>
    </NotificationProvider>
  );
}

function signIn(uid: string) {
  mockUser = { uid, emailVerified: true };
  mockFirebaseAuth.currentUser = { uid };
}

async function coldStartSignedOut() {
  mockUser = null;
  mockFirebaseAuth.currentUser = null;
  const view = render(tree());
  await waitFor(() => expect(mockCancelRoutines).toHaveBeenCalled());
  for (let i = 0; i < 5; i += 1) await act(async () => {});
  return view;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockAuthReady = true;
  mockUpdate.mockReturnValue(new Promise(() => {}));
  mockApply.mockResolvedValue('scheduled');
  mockCancelRoutines.mockResolvedValue(undefined);
  await AsyncStorage.clear();
  _resetNotificationIntentStoreForTests();
  _resetNotificationIntentJournalForTests();
  await AsyncStorage.setItem(NOTIFICATION_INTENT_KEY, JSON.stringify(u1Record));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((() => ({ remove: jest.fn() })) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('C4: a signed-out cold start leaves the pending journal alone', () => {
  test('the record survives on disk', async () => {
    await coldStartSignedOut();

    // Mutation caught: restoring the journal clear to the signed-out cold start.
    expect(JSON.parse((await AsyncStorage.getItem(NOTIFICATION_INTENT_KEY))!)).toEqual(u1Record);
  });

  test('the same account signing in afterwards replays it', async () => {
    const view = await coldStartSignedOut();

    signIn('u1');
    view.rerender(tree());

    // Mutation caught: the same clear, which would leave nothing to replay.
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('u1', { allNotificationsEnabled: false }));
  });

  test('a different account signing in discards it before any replay or apply', async () => {
    const view = await coldStartSignedOut();

    signIn('u2');
    view.rerender(tree());
    await waitFor(async () => expect(await AsyncStorage.getItem(NOTIFICATION_INTENT_KEY)).toBeNull());

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });
});
