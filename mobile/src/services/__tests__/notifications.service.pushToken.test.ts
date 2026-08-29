/**
 * notifications.service — push tokens go to userPrivate, never to users/{uid}.
 *
 * This is the highest-value single item in the userPrivate migration. A push
 * token on users/{uid} — readable by every authenticated account — lets any
 * signed-in user enumerate the token of every other user. There is deliberately
 * NO dual-write here: mirroring the token back to the public document would
 * leave a fresh one there and defeat the move entirely. Server delivery stays
 * correct instead through the read-through in functions/src/lib/userFields.js.
 */
const mockSetUserPrivate = jest.fn(() => Promise.resolve(undefined));
const mockUpdateDoc = jest.fn(() => Promise.resolve(undefined));
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ collection, id }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => (mockDoc as any)(...a),
  getDoc: jest.fn(),
  serverTimestamp: () => '__ts__',
}));
jest.mock('../firebase/userPrivate.service', () => ({
  setUserPrivate: (...a: any[]) => mockSetUserPrivate(...(a as [])),
}));
jest.mock('../../config/firebase', () => ({ db: { __db: true } }));

const mockGetDevicePushToken = jest.fn(() => Promise.resolve({ data: 'fcm-device-token' }));
const mockGetPerms = jest.fn(() => Promise.resolve({ status: 'granted' }));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getDevicePushTokenAsync: () => mockGetDevicePushToken(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}));
jest.mock('expo-device', () => ({ isDevice: true }));

import { registerAndSaveFCMToken, savePushTokenToUser } from '../notifications.service';

describe('push token repoint', () => {
  beforeEach(() => {
    mockSetUserPrivate.mockClear();
    mockUpdateDoc.mockClear();
    mockDoc.mockClear();
  });

  test('the Expo push token is written to userPrivate', async () => {
    await savePushTokenToUser('u1', 'ExponentPushToken[abc]');

    expect(mockSetUserPrivate).toHaveBeenCalledTimes(1);
    const [uid, patch] = mockSetUserPrivate.mock.calls[0] as any[];
    expect(uid).toBe('u1');
    expect(patch).toMatchObject({ expoPushToken: 'ExponentPushToken[abc]' });
    expect(patch.pushTokenUpdatedAt).toBeDefined();
  });

  test('the Expo push token is NOT written to users/{uid}', async () => {
    await savePushTokenToUser('u1', 'ExponentPushToken[abc]');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDoc.mock.calls.map((c) => c[1])).not.toContain('users');
  });

  test('the FCM device token is written to userPrivate', async () => {
    // The token the Cloud Functions senders actually push through.
    const token = await registerAndSaveFCMToken('u1');

    expect(token).toBe('fcm-device-token');
    expect(mockSetUserPrivate).toHaveBeenCalledTimes(1);
    const [uid, patch] = mockSetUserPrivate.mock.calls[0] as any[];
    expect(uid).toBe('u1');
    expect(patch).toMatchObject({ fcmToken: 'fcm-device-token' });
  });

  test('the FCM device token is NOT written to users/{uid}', async () => {
    await registerAndSaveFCMToken('u1');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDoc.mock.calls.map((c) => c[1])).not.toContain('users');
  });

  test('no token is stored when permission has not been granted', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'denied' });

    expect(await registerAndSaveFCMToken('u1')).toBeNull();
    expect(mockSetUserPrivate).not.toHaveBeenCalled();
  });
});
