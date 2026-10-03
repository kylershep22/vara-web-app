/**
 * RG4, RG5, RG6 (NPM-3a-ii, regression): what logging out does to this
 * device's push tokens and to the notifications already delivered.
 *
 * Kyle's R1-K11 with its Round 6 confirmation, and Round 8 rulings II-D2,
 * II-D3 and II-D15 with his ordering clarification: delivered notifications
 * are cleared first, locally; then a stored token is cleared only if it still
 * equals this device's token, each token under its own match; then signOut.
 * Before NPM-3a-ii logout called signOut and nothing else, so the departed
 * account's token stayed in userPrivate (Kyle's before-state observation 1).
 *
 * The real AuthProvider is mounted and logout() is called through useAuth(),
 * the function Settings' Logout button calls after its confirmation alert.
 * Firestore, auth and expo-notifications are faked at their boundaries, and
 * world.log records the order of the dismissal, the token clear and signOut.
 */
jest.mock('expo-notifications', () => jest.requireActual('../helpers/pushHarness').fakeNotifications);
jest.mock('expo-device', () => jest.requireActual('../helpers/pushHarness').fakeDevice);
jest.mock('firebase/firestore', () => jest.requireActual('../helpers/pushHarness').fakeFirestore);
jest.mock('firebase/auth', () => jest.requireActual('../helpers/pushHarness').fakeAuth);
jest.mock('../../config/firebase', () => jest.requireActual('../helpers/pushHarness').fakeConfigFirebase);
jest.mock('../../services/crashReporting.service', () => ({
  setUserId: jest.fn(),
  setUserAttributes: jest.fn(),
  clearUser: jest.fn(),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({ logEvent: jest.fn() }));
jest.mock('../../services/purchases.service', () => ({
  identifyPurchaser: jest.fn().mockResolvedValue(undefined),
  clearPurchaser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/rcEntitlement', () => ({ clearRcEntitlement: jest.fn() }));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import {
  DEVICE_A,
  EXPO_A,
  EXPO_OTHER,
  resetWorld,
  userPrivate,
  world,
} from '../helpers/pushHarness';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

async function logout() {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await act(async () => {
    await result.current.logout();
  });
}

beforeEach(() => {
  resetWorld();
});

test('RG4: logout clears the stored Expo token that equals this device token, before signOut', async () => {
  world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });

  await logout();

  expect(userPrivate('u1')?.expoPushToken).toBeUndefined();
  const cleared = world.log.indexOf('write:userPrivate/u1');
  expect(cleared).toBeGreaterThanOrEqual(0);
  expect(cleared).toBeLessThan(world.log.indexOf('signOut'));
});

test('RG5: logout leaves a stored Expo token that differs from this device untouched (fcmToken under its own match)', async () => {
  // Another device replaced the Expo token; the fcmToken is still this one's.
  world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_OTHER, fcmToken: DEVICE_A });

  await logout();

  expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_OTHER);
  expect(userPrivate('u1')?.fcmToken).toBeUndefined();
  expect(world.log).toContain('signOut');
});

test('RG6: logout dismisses delivered notifications before the token clear starts', async () => {
  world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });

  await logout();

  const dismissed = world.log.indexOf('dismissAll');
  expect(dismissed).toBeGreaterThanOrEqual(0);
  const firstTokenStep = world.log.findIndex(
    (entry) => entry === 'tx:start' || entry.endsWith('userPrivate/u1')
  );
  expect(firstTokenStep).toBeGreaterThan(dismissed);
  expect(world.log.indexOf('signOut')).toBeGreaterThan(dismissed);
});
