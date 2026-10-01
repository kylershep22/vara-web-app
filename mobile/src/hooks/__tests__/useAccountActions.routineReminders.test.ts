/**
 * useAccountActions: account deletion cancels routine reminders (ROUTINE-REMINDERS R-I).
 *
 * Deletion calls the deleteAccount Cloud Function and then logout(). The sign-out
 * cleanup in NotificationContext would also catch the uid going null, but this
 * path cancels explicitly and first, so it does not depend on logout()
 * succeeding. The dialogs are driven by calling the onPress captured from
 * jest.spyOn(Alert, 'alert').
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
const mockCancelAllRoutineReminders = jest.fn(async () => {
  callLog.push('cancelRoutineReminders');
});

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: () => mockDeleteFn,
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock('../../services/reminderScheduler.service', () => ({
  cancelAllRoutineReminders: () => mockCancelAllRoutineReminders(),
}));

import { useAccountActions } from '../useAccountActions';

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alertSpy.mockRestore());

async function pressButton(callIndex: number, text: string) {
  const buttons = alertSpy.mock.calls[callIndex][2] as AlertButton[];
  const button = buttons.find((b) => b.text === text)!;
  await act(async () => {
    await button.onPress!();
  });
}

describe('account deletion and routine reminders', () => {
  test('cancels every routine reminder after the deletion succeeds and before logout', async () => {
    // Mutation caught: removing the explicit cancel from the deletion path.
    const { result } = renderHook(() => useAccountActions());
    act(() => result.current.confirmDeleteAccount());
    await pressButton(0, 'Delete My Account');
    await pressButton(1, 'Yes, Delete Everything');

    expect(callLog).toEqual(['deleteAccount', 'cancelRoutineReminders', 'logout']);
  });

  test('a failed deletion cancels nothing', async () => {
    mockDeleteFn.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAccountActions());
    act(() => result.current.confirmDeleteAccount());
    await pressButton(0, 'Delete My Account');
    await pressButton(1, 'Yes, Delete Everything');

    expect(mockCancelAllRoutineReminders).not.toHaveBeenCalled();
  });
});
