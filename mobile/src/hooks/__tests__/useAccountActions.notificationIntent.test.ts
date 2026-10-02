/**
 * useAccountActions: account deletion clears the pending notification intent
 * (NPM-2, Decision 9), awaited, before sign-out, in addition to the
 * NotificationContext session-loss cleanup. Driven through the real dialogs,
 * as in useAccountActions.routineReminders.
 */
import { Alert, AlertButton } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

const callLog: string[] = [];
const mockDeleteFn = jest.fn(async () => {
  callLog.push('deleteAccount');
});
const mockLogout = jest.fn(async () => {
  callLog.push('logout');
});
let mockClearDone: (() => void) | null = null;

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: () => mockDeleteFn,
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock('../../services/reminderScheduler.service', () => ({
  cancelAllRoutineReminders: async () => {
    callLog.push('cancelRoutineReminders');
  },
}));
jest.mock('../../services/notificationIntentStore', () => ({
  clearNotificationIntent: (...a: unknown[]) => {
    callLog.push(`clearIntent(${a.length ? String(a[0]) : ''})`);
    return new Promise<void>((resolve) => {
      mockClearDone = () => {
        callLog.push('clearIntent:done');
        resolve();
      };
    });
  },
}));

import { useAccountActions } from '../useAccountActions';

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  mockClearDone = null;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alertSpy.mockRestore());

function button(callIndex: number, text: string): AlertButton {
  const buttons = alertSpy.mock.calls[callIndex][2] as AlertButton[];
  return buttons.find((b) => b.text === text)!;
}

describe('C3 [K5]: account deletion clears the pending notification intent', () => {
  test('cleared for whoever is stored, and awaited before logout', async () => {
    const { result } = renderHook(() => useAccountActions());
    act(() => result.current.confirmDeleteAccount());
    await act(async () => {
      await button(0, 'Delete My Account').onPress!();
    });

    let deleting!: Promise<void>;
    await act(async () => {
      deleting = Promise.resolve(button(1, 'Yes, Delete Everything').onPress!() as unknown as Promise<void>);
      await Promise.resolve();
      await Promise.resolve();
    });
    // Mutation caught: not awaiting the clear lets logout run before it finishes.
    expect(callLog).toEqual(['deleteAccount', 'cancelRoutineReminders', 'clearIntent()']);

    await act(async () => {
      mockClearDone!();
      await deleting;
    });
    // Mutation caught: removing the clear from the deletion path.
    expect(callLog).toEqual(['deleteAccount', 'cancelRoutineReminders', 'clearIntent()', 'clearIntent:done', 'logout']);
  });
});
