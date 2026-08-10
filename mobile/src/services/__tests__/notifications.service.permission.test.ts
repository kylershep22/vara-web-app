/**
 * notifications.service — the permission/token split.
 *
 * registerForPushNotifications used to do both halves in one call, which forced
 * every caller to accept a network round-trip (getExpoPushTokenAsync) as the
 * price of showing a permission sheet. The halves are separable now so a
 * user-facing path can show the sheet immediately and fetch the token later.
 *
 * What these pin: the sheet half touches NO network, the token half is never
 * reached without permission, and the combined function keeps its old contract
 * for the three callers that still use it.
 */

const mockGetPerms = jest.fn((): Promise<{ status: string }> =>
  Promise.resolve({ status: 'granted' })
);
const mockRequestPerms = jest.fn((): Promise<{ status: string }> =>
  Promise.resolve({ status: 'granted' })
);
const mockGetExpoPushToken = jest.fn((..._a: unknown[]) =>
  Promise.resolve({ data: 'ExponentPushToken[abc]' })
);

const deviceState = { isDevice: true };

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  requestPermissionsAsync: () => mockRequestPerms(),
  getExpoPushTokenAsync: (...a: unknown[]) => mockGetExpoPushToken(...a),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}));

jest.mock('expo-device', () => ({
  get isDevice() {
    return deviceState.isDevice;
  },
}));
jest.mock('../../config/firebase', () => ({ db: null }));

import {
  registerForPushNotifications,
  registerPushToken,
  requestNotificationPermission,
} from '../notifications.service';

beforeEach(() => {
  deviceState.isDevice = true;
  mockGetPerms.mockReset();
  mockGetPerms.mockResolvedValue({ status: 'undetermined' });
  mockRequestPerms.mockReset();
  mockRequestPerms.mockResolvedValue({ status: 'granted' });
  mockGetExpoPushToken.mockReset();
  mockGetExpoPushToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
});

describe('requestNotificationPermission', () => {
  it('never touches the network', async () => {
    // The entire reason this half exists. If a token fetch ever creeps back in
    // here, the sheet inherits its latency again.
    await requestNotificationPermission();

    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
  });

  it('shows the sheet when permission is undetermined', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPerms).toHaveBeenCalledTimes(1);
  });

  it('does not re-prompt when already granted', async () => {
    mockGetPerms.mockResolvedValue({ status: 'granted' });

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  it('reports refusal', async () => {
    mockRequestPerms.mockResolvedValue({ status: 'denied' });

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });

  it('declines to prompt off a physical device', async () => {
    deviceState.isDevice = false;

    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  it('resolves false rather than throwing when the native call fails', async () => {
    mockGetPerms.mockRejectedValue(new Error('native module unavailable'));

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});

describe('registerPushToken', () => {
  it('returns the Expo token', async () => {
    await expect(registerPushToken()).resolves.toBe('ExponentPushToken[abc]');
  });

  it('resolves null rather than throwing when the fetch fails', async () => {
    // Expected in Expo Go and on a dead network. Callers treat null as "no
    // remote push", never as a reason to stop.
    mockGetExpoPushToken.mockRejectedValue(new Error('no APNs'));

    await expect(registerPushToken()).resolves.toBeNull();
  });
});

describe('registerForPushNotifications — the two halves composed', () => {
  it('still returns the token when permission is granted', async () => {
    mockGetPerms.mockResolvedValue({ status: 'granted' });

    await expect(registerForPushNotifications()).resolves.toBe(
      'ExponentPushToken[abc]'
    );
  });

  it('returns null and skips the token fetch when permission is refused', async () => {
    mockRequestPerms.mockResolvedValue({ status: 'denied' });

    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
  });

  it('asks before it fetches', async () => {
    const order: string[] = [];
    mockGetPerms.mockImplementation(() => {
      order.push('getPerms');
      return Promise.resolve({ status: 'granted' });
    });
    mockGetExpoPushToken.mockImplementation(() => {
      order.push('getToken');
      return Promise.resolve({ data: 'ExponentPushToken[abc]' });
    });

    await registerForPushNotifications();

    expect(order).toEqual(['getPerms', 'getToken']);
  });
});
