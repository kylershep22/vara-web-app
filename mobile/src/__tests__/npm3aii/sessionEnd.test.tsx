/**
 * Ending a session (NPM-3a-ii): AuthContext.logout and the account-deletion
 * path, against the fakes in ../helpers/pushHarness.
 *
 * R1-K11 with its Round 6 confirmation; Kyle's II-D3 and II-D15 with his
 * ordering clarification: dismiss delivered notifications, then the token
 * clear bounded at five seconds, then signOut whatever the clear did.
 * The order and the clear itself are RG4 to RG6; this file pins the bound,
 * a rejected clear, the deletion path and the logs.
 *
 * logout() is called through useAuth(), and the deletion path through
 * useAccountActions with its two confirmation alerts pressed by calling the
 * onPress captured from jest.spyOn(Alert, 'alert'), as the existing
 * useAccountActions suites do.
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
const mockDeleteAccount = jest.fn(async () => undefined);
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: () => mockDeleteAccount,
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  cancelAllRoutineReminders: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/notificationIntentStore', () => ({
  clearNotificationIntent: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { Alert, AlertButton } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { useAccountActions } from '../../hooks/useAccountActions';
import { logger } from '../../utils/logger';
import {
  TOKEN_CLEAR_TIMEOUT_MS,
  ensurePushRegistration,
  onDeviceTokenChange,
} from '../../services/pushRegistration.service';
import {
  DEVICE_A,
  EXPO_A,
  fakeFirestore,
  resetWorld,
  rotateDeviceToken,
  userPrivate,
  world,
} from '../helpers/pushHarness';

const mockLogger = logger as unknown as Record<'log' | 'warn' | 'error', jest.Mock>;

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  resetWorld();
  jest.clearAllMocks();
  const sub = onDeviceTokenChange(() => undefined);
  rotateDeviceToken(EXPO_A, DEVICE_A);
  sub.remove();
  world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the bound', () => {
  test('a hanging clear: signOut waits for the bound, then happens', async () => {
    // Mutation caught: signOut made to wait on the clear without the bound.
    jest.useFakeTimers();
    world.transactionMode = 'hang';
    const { result } = renderHook(() => useAuth(), { wrapper });

    let finished = false;
    let loggingOut: Promise<void> = Promise.resolve();
    act(() => {
      loggingOut = result.current.logout().then(() => {
        finished = true;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(TOKEN_CLEAR_TIMEOUT_MS - 1);
    });
    expect(world.log).toContain('tx:start');
    expect(world.log).not.toContain('signOut');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
      await loggingOut;
    });
    expect(world.log).toContain('signOut');
    expect(finished).toBe(true);
  });

  test('a rejected clear: signOut still happens and logout does not throw', async () => {
    // Mutation caught: the clear's rejection propagated out of logout.
    world.transactionMode = 'reject';
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.logout()).resolves.toBeUndefined();
    });
    expect(world.log).toContain('signOut');
    expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A);
  });
});

describe('account deletion (II-D15; the server deletes userPrivate)', () => {
  async function pressButton(alertSpy: jest.SpyInstance, callIndex: number, text: string) {
    const buttons = alertSpy.mock.calls[callIndex][2] as AlertButton[];
    const button = buttons.find((b) => b.text === text);
    if (!button?.onPress) throw new Error(`no ${text}`);
    await act(async () => {
      await button.onPress!();
    });
  }

  test('dismisses delivered notifications, skips the token clear, then signs out', async () => {
    // Mutation caught: the skipTokenClear flag dropped from the deletion path
    // (a transaction would start), or the dismissal skipped with it.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useAccountActions(), { wrapper });

    act(() => result.current.confirmDeleteAccount());
    await pressButton(alertSpy, 0, 'Delete My Account');
    await pressButton(alertSpy, 1, 'Yes, Delete Everything');
    alertSpy.mockRestore();

    expect(mockDeleteAccount).toHaveBeenCalled();
    expect(world.log).toContain('dismissAll');
    expect(world.log).not.toContain('tx:start');
    expect(world.log.indexOf('signOut')).toBeGreaterThan(world.log.indexOf('dismissAll'));
  });
});

describe('no token value in any log', () => {
  test('across a failed registration read, a rejected clear and a timed-out clear', async () => {
    // Mutation caught: a token value added to any warning.
    const consoleSpies = (['log', 'warn', 'error'] as const).map((k) =>
      jest.spyOn(console, k).mockImplementation(() => undefined)
    );
    const logged = () =>
      [
        ...mockLogger.log.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls,
        ...consoleSpies.flatMap((s) => s.mock.calls),
      ]
        .flat()
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a)))
        .join('\n');

    // A registration whose server read fails.
    const realRead = fakeFirestore.getDocFromServer;
    fakeFirestore.getDocFromServer = async () => {
      throw Object.assign(new Error('offline'), { code: 'unavailable' });
    };
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: 'ExponentPushToken[stale]' });
    try {
      await ensurePushRegistration('u1');
    } finally {
      fakeFirestore.getDocFromServer = realRead;
    }

    // A rejected clear, then a timed-out one.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    world.transactionMode = 'reject';
    const first = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await first.result.current.logout();
    });

    jest.useFakeTimers();
    world.authUid = 'u1';
    world.transactionMode = 'hang';
    const second = renderHook(() => useAuth(), { wrapper });
    let loggingOut: Promise<void> = Promise.resolve();
    act(() => {
      loggingOut = second.result.current.logout();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(TOKEN_CLEAR_TIMEOUT_MS);
      await loggingOut;
    });

    const text = logged();
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(text).not.toContain(EXPO_A);
    expect(text).not.toContain(DEVICE_A);
    expect(text).not.toContain('ExponentPushToken[');
    consoleSpies.forEach((s) => s.mockRestore());
  });
});
