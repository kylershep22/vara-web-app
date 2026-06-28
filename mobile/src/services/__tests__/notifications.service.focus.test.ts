/**
 * notifications.service — focus-completion scheduling + permission gating
 * (B-3c.2 commit 3). Verifies the completion notification carries the
 * focus-complete deep-link data, fires on a DATE trigger at endsAt, and
 * DEGRADES GRACEFULLY (returns null, schedules nothing) when permission is
 * denied. expo-notifications is fully mocked.
 */

const mockSchedule = jest.fn((..._a: unknown[]) => Promise.resolve('notif-1'));
const mockGetPerms = jest.fn((): Promise<{ status: string }> =>
  Promise.resolve({ status: 'granted' })
);
const mockRequestPerms = jest.fn((): Promise<{ status: string }> =>
  Promise.resolve({ status: 'granted' })
);

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...a),
  getPermissionsAsync: () => mockGetPerms(),
  requestPermissionsAsync: () => mockRequestPerms(),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}));

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('../../config/firebase', () => ({ db: null }));

import {
  ensureNotificationPermission,
  scheduleFocusCompletionNotification,
} from '../notifications.service';

beforeEach(() => {
  mockSchedule.mockClear();
  mockSchedule.mockResolvedValue('notif-1');
  mockGetPerms.mockReset();
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockRequestPerms.mockReset();
  mockRequestPerms.mockResolvedValue({ status: 'granted' });
});

describe('ensureNotificationPermission', () => {
  it('returns true without prompting when already granted', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
    expect(await ensureNotificationPermission()).toBe(true);
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  it('requests when undetermined and reflects the result', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPerms.mockResolvedValueOnce({ status: 'granted' });
    expect(await ensureNotificationPermission()).toBe(true);
    expect(mockRequestPerms).toHaveBeenCalledTimes(1);
  });

  it('returns false when the request is denied', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPerms.mockResolvedValueOnce({ status: 'denied' });
    expect(await ensureNotificationPermission()).toBe(false);
  });
});

describe('scheduleFocusCompletionNotification', () => {
  it('schedules a DATE-triggered notification carrying focus-complete data', async () => {
    const endsAt = 1_700_000_000_000;
    const id = await scheduleFocusCompletionNotification('fs-1', endsAt);
    expect(id).toBe('notif-1');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const arg = mockSchedule.mock.calls[0][0] as unknown as {
      content: { data: Record<string, unknown> };
      trigger: { type: string; date: number };
    };
    expect(arg.content.data).toEqual({
      type: 'focus-complete',
      focusSessionId: 'fs-1',
      endsAt,
    });
    expect(arg.trigger).toEqual({ type: 'date', date: endsAt });
  });

  it('degrades gracefully: schedules nothing and returns null when denied', async () => {
    mockGetPerms.mockResolvedValueOnce({ status: 'denied' });
    mockRequestPerms.mockResolvedValueOnce({ status: 'denied' });
    const id = await scheduleFocusCompletionNotification('fs-1', 123);
    expect(id).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
