/**
 * pushRegistration.service (NPM-3a-ii): the registration pass and the
 * protected token clear, against the fakes in src/__tests__/helpers/pushHarness.
 *
 * Kyle's II-D1, II-D2 and II-D12 for registration; R1-K11 with its Round 6
 * confirmation, II-D3 and II-D15 for the clear. Each test names the mutation
 * it catches. The service functions are called directly here; the suites in
 * src/__tests__/npm3aii drive the same paths through the mounted provider and
 * AuthContext.
 */
jest.mock('expo-notifications', () => jest.requireActual('../../__tests__/helpers/pushHarness').fakeNotifications);
jest.mock('expo-device', () => jest.requireActual('../../__tests__/helpers/pushHarness').fakeDevice);
jest.mock('firebase/firestore', () => jest.requireActual('../../__tests__/helpers/pushHarness').fakeFirestore);
jest.mock('firebase/auth', () => jest.requireActual('../../__tests__/helpers/pushHarness').fakeAuth);
jest.mock('../../config/firebase', () => jest.requireActual('../../__tests__/helpers/pushHarness').fakeConfigFirebase);

import {
  TOKEN_CLEAR_TIMEOUT_MS,
  beginPushSessionEnd,
  clearDevicePushTokens,
  ensurePushRegistration,
  finishPushSessionEnd,
  onDeviceTokenChange,
} from '../pushRegistration.service';
import {
  DEVICE_A,
  DEVICE_OTHER,
  EXPO_A,
  EXPO_OTHER,
  resetWorld,
  rotateDeviceToken,
  userPrivate,
  userPrivateWrites,
  world,
} from '../../__tests__/helpers/pushHarness';

beforeEach(() => {
  resetWorld();
  // The service holds this device's tokens for the app session. A token change
  // from the OS is the one thing that drops them, so each test starts from one.
  const sub = onDeviceTokenChange(() => undefined);
  rotateDeviceToken(EXPO_A, DEVICE_A);
  sub.remove();
  world.removedTokenListeners = 0;
});

afterEach(() => {
  finishPushSessionEnd();
  jest.useRealTimers();
});

describe('registration: compare against the server, write only what differs', () => {
  test('no stored document: one write carrying both tokens, to userPrivate only', async () => {
    // Mutation caught: a missing stored value treated as equal (no write).
    await ensurePushRegistration('u1');

    const writes = userPrivateWrites('u1');
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    expect(writes[0].createdAt).toBe('SERVER_TIMESTAMP');
    expect(world.writes.every((w) => w.path.startsWith('userPrivate/'))).toBe(true);
  });

  test('stored values equal this device: one server read and no write', async () => {
    // Mutation caught: the equality checks removed (always write).
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });

    await ensurePushRegistration('u1');

    expect(userPrivateWrites('u1')).toEqual([]);
    expect(world.log.filter((e) => e === 'serverRead:userPrivate/u1')).toHaveLength(1);
    // The comparison read is from the server, never the cache.
    expect(world.log).not.toContain('read:userPrivate/u1');
  });

  test('only fcmToken differs: the write carries only fcmToken, and reuses the read', async () => {
    // Mutation caught: both fields written whenever either differs.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_OTHER });

    await ensurePushRegistration('u1');

    const writes = userPrivateWrites('u1');
    expect(writes).toHaveLength(1);
    expect(writes[0].fcmToken).toBe(DEVICE_A);
    expect(writes[0]).not.toHaveProperty('expoPushToken');
    expect(writes[0]).not.toHaveProperty('createdAt');
    expect(world.log.filter((e) => e.includes('userPrivate/u1') && e.includes('ead'))).toHaveLength(1);
  });

  test('only expoPushToken differs: the write carries only expoPushToken', async () => {
    // Mutation caught: the two comparisons crossed or merged.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_OTHER, fcmToken: DEVICE_A });

    await ensurePushRegistration('u1');

    const writes = userPrivateWrites('u1');
    expect(writes).toHaveLength(1);
    expect(writes[0].expoPushToken).toBe(EXPO_A);
    expect(writes[0]).not.toHaveProperty('fcmToken');
  });

  test('permission not granted: no token fetch, no read, no write and no prompt', async () => {
    // Mutation caught: the permission guard removed.
    world.permission = 'undetermined';

    await ensurePushRegistration('u1');

    expect(world.log).not.toContain('getExpoToken');
    expect(world.log).not.toContain('getDeviceToken');
    expect(world.log).not.toContain('requestPermission');
    expect(world.writes).toEqual([]);
  });

  test('a token change from the OS: the next pass fetches and writes the new tokens', async () => {
    // Mutation caught: the held tokens kept across a token change.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    await ensurePushRegistration('u1');
    const sub = onDeviceTokenChange(() => undefined);

    rotateDeviceToken(EXPO_OTHER, DEVICE_OTHER);
    await ensurePushRegistration('u1');

    expect(userPrivate('u1')).toMatchObject({ expoPushToken: EXPO_OTHER, fcmToken: DEVICE_OTHER });
    sub.remove();
  });
});

describe('registration while a sign-out is in progress', () => {
  test('after beginPushSessionEnd nothing is read or written, and after finish it registers again', async () => {
    // Mutation caught: the session-ending guard removed.
    beginPushSessionEnd();
    await ensurePushRegistration('u1');
    expect(world.writes).toEqual([]);

    finishPushSessionEnd();
    await ensurePushRegistration('u1');
    expect(userPrivate('u1')?.expoPushToken).toBe(EXPO_A);
  });

  test('a pass already reading when the sign-out begins writes nothing', async () => {
    // Mutation caught: the re-check of the guard just before the write removed.
    const realGet = jest.requireActual('../../__tests__/helpers/pushHarness').fakeFirestore.getDocFromServer;
    const fake = jest.requireActual('../../__tests__/helpers/pushHarness').fakeFirestore;
    fake.getDocFromServer = async (ref: { path: string; id: string }) => {
      beginPushSessionEnd();
      return realGet(ref);
    };
    try {
      await ensurePushRegistration('u1');
    } finally {
      fake.getDocFromServer = realGet;
    }

    expect(world.writes).toEqual([]);
  });
});

describe('the protected clear', () => {
  test('clears each stored token that equals this device, in one confirmed transaction', async () => {
    // Mutation caught: a plain write outside a transaction (no tx:commit).
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });

    await clearDevicePushTokens(beginPushSessionEnd());

    expect(userPrivate('u1')).not.toHaveProperty('expoPushToken');
    expect(userPrivate('u1')).not.toHaveProperty('fcmToken');
    expect(world.log).toContain('tx:commit');
  });

  test('fcmToken from another device is kept while this device\'s Expo token is cleared', async () => {
    // Mutation caught: fcmToken cleared without its own match.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_OTHER });

    await clearDevicePushTokens(beginPushSessionEnd());

    expect(userPrivate('u1')).not.toHaveProperty('expoPushToken');
    expect(userPrivate('u1')?.fcmToken).toBe(DEVICE_OTHER);
  });

  test('both tokens from another device: nothing is written', async () => {
    // Mutation caught: an empty update written anyway.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_OTHER, fcmToken: DEVICE_OTHER });

    await clearDevicePushTokens(beginPushSessionEnd());

    expect(userPrivateWrites('u1')).toEqual([]);
    expect(userPrivate('u1')).toMatchObject({ expoPushToken: EXPO_OTHER, fcmToken: DEVICE_OTHER });
  });

  test('the signed-in uid no longer the departing one before the transaction: no transaction, nothing written', async () => {
    // Mutation caught: the uid check before the transaction removed.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    const departing = beginPushSessionEnd();
    world.authUid = 'u2';

    await clearDevicePushTokens(departing);

    expect(world.log).not.toContain('tx:start');
    expect(userPrivate('u1')).toMatchObject({ expoPushToken: EXPO_A, fcmToken: DEVICE_A });
  });

  test('the uid changes inside the transaction: nothing is written', async () => {
    // Mutation caught: the uid check inside the transaction removed.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    const departing = beginPushSessionEnd();
    world.onTransactionStart = () => {
      world.authUid = 'u2';
    };

    await clearDevicePushTokens(departing);

    expect(world.log).toContain('tx:start');
    expect(userPrivateWrites('u1')).toEqual([]);
  });

  test('no departing uid: nothing is attempted', async () => {
    world.authUid = null;
    await clearDevicePushTokens(beginPushSessionEnd());
    expect(world.log).not.toContain('tx:start');
  });

  test('a hanging transaction resolves the clear after the bound, not before', async () => {
    // Mutation caught: the race against the timer removed (the clear never resolves).
    jest.useFakeTimers();
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    world.transactionMode = 'hang';
    let done = false;
    const clearing = clearDevicePushTokens(beginPushSessionEnd()).then(() => {
      done = true;
    });

    await jest.advanceTimersByTimeAsync(TOKEN_CLEAR_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await clearing;
    expect(done).toBe(true);
    expect(TOKEN_CLEAR_TIMEOUT_MS).toBe(5000);
  });

  test('a rejected transaction resolves the clear, never rejects', async () => {
    // Mutation caught: the error rethrown.
    world.store.set('userPrivate/u1', { uid: 'u1', expoPushToken: EXPO_A, fcmToken: DEVICE_A });
    world.transactionMode = 'reject';

    await expect(clearDevicePushTokens(beginPushSessionEnd())).resolves.toBeUndefined();
    expect(userPrivate('u1')).toMatchObject({ expoPushToken: EXPO_A });
  });
});
