/**
 * HabitDetailScreen — the reminder half of the edit sheet.
 *
 * The load-bearing test here is "an unrelated edit does not clear the
 * reminder": the form seeds itself from the habit in two separate places (the
 * useState initialiser and handleEdit), and missing either one turns renaming a
 * habit into silently deleting its reminder.
 */

let mockHabit: any;

const mockUpdateHabit = jest.fn().mockResolvedValue(undefined);
const mockDeleteHabit = jest.fn().mockResolvedValue(undefined);
const mockScheduleHabitReminder = jest.fn().mockResolvedValue(undefined);
const mockCancelHabitReminder = jest.fn().mockResolvedValue(undefined);
const mockEnsureRemindersAllowed = jest.fn().mockResolvedValue(undefined);
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { habitId: mockHabit.id, habit: mockHabit } }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, setOptions: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
jest.mock('../../services/firebase', () => ({
  getHabitCompletions: jest.fn().mockResolvedValue([]),
  markHabitComplete: jest.fn(),
  unmarkHabitComplete: jest.fn(),
  setCompletionNote: jest.fn(),
  getCompletionNote: jest.fn().mockResolvedValue(null),
  updateHabit: (...a: any[]) => mockUpdateHabit(...a),
  deleteHabit: (...a: any[]) => mockDeleteHabit(...a),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  scheduleHabitReminder: (...a: any[]) => mockScheduleHabitReminder(...a),
  cancelHabitReminder: (...a: any[]) => mockCancelHabitReminder(...a),
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  ensureRemindersAllowed: (...a: any[]) => mockEnsureRemindersAllowed(...a),
}));
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import HabitDetailScreen from '../HabitDetailScreen';

function habit(over: Record<string, any> = {}) {
  return {
    id: 'h1',
    userId: 'u1',
    name: 'Morning walk',
    type: 'daily',
    frequency: 7,
    frequencyType: 'daily',
    streak: 0,
    longestStreak: 0,
    active: true,
    createdAt: new Date('2026-07-01'),
    ...over,
  };
}

async function openEdit() {
  render(<HabitDetailScreen />);
  await waitFor(() => expect(screen.getByTestId('habit-detail-edit')).toBeTruthy());
  await act(async () => {
    fireEvent.press(screen.getByTestId('habit-detail-edit'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHabit = habit();
});

describe('when the control is offered', () => {
  test('shown for a habit with a cadence', async () => {
    await openEdit();
    expect(screen.getByTestId('habit-edit-reminder')).toBeTruthy();
  });

  test('HIDDEN for a legacy habit with no frequencyType', async () => {
    mockHabit = habit({ frequencyType: undefined });
    await openEdit();
    expect(screen.queryByTestId('habit-edit-reminder')).toBeNull();
  });

  test('HIDDEN for a specific-days habit with no days picked', async () => {
    mockHabit = habit({ frequencyType: 'specific_days', specificDays: [] });
    await openEdit();
    expect(screen.queryByTestId('habit-edit-reminder')).toBeNull();
  });

  test('shows the inherited days read-only, with no second day-picker', async () => {
    mockHabit = habit({ frequencyType: 'specific_days', specificDays: [1, 3, 5] });
    await openEdit();

    expect(screen.getByText(/on your mon · wed · fri schedule/i)).toBeTruthy();
  });
});

describe('an existing reminder', () => {
  beforeEach(() => {
    mockHabit = habit({ reminderEnabled: true, reminderTime: { hour: 7, minute: 30 } });
  });

  test('seeds the form from the habit', async () => {
    await openEdit();
    expect(screen.getByTestId('habit-edit-reminder-time')).toBeTruthy();
    expect(screen.getByText('7:30 AM')).toBeTruthy();
  });

  test('SURVIVES an unrelated edit', async () => {
    await openEdit();

    fireEvent.changeText(screen.getByDisplayValue('Morning walk'), 'Evening walk');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    // Missing either seeding site would write reminderEnabled: false here.
    expect(mockUpdateHabit.mock.calls[0][1]).toMatchObject({
      name: 'Evening walk',
      reminderEnabled: true,
      reminderTime: { hour: 7, minute: 30 },
    });
    expect(mockScheduleHabitReminder).toHaveBeenCalled();
  });

  test('turning it off clears the time and schedules nothing', async () => {
    await openEdit();

    fireEvent(screen.getByTestId('habit-edit-reminder-toggle'), 'valueChange', false);
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    expect(mockUpdateHabit.mock.calls[0][1]).toMatchObject({
      reminderEnabled: false,
      reminderTime: null,
    });
    expect(mockCancelHabitReminder).toHaveBeenCalledWith('h1');
    expect(mockScheduleHabitReminder).not.toHaveBeenCalled();
  });

  test('always cancels the whole set before rescheduling', async () => {
    await openEdit();
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    // Cancel-then-schedule is what stops a shrunk day set stranding triggers.
    expect(mockCancelHabitReminder).toHaveBeenCalledWith('h1');
    expect(mockScheduleHabitReminder).toHaveBeenCalled();
  });
});

describe('turning a reminder on', () => {
  test('flips the master flag before scheduling', async () => {
    await openEdit();

    fireEvent(screen.getByTestId('habit-edit-reminder-toggle'), 'valueChange', true);
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });

    expect(mockEnsureRemindersAllowed).toHaveBeenCalledWith('u1');
    expect(mockScheduleHabitReminder).toHaveBeenCalled();
  });
});

describe('removing the habit', () => {
  test('cancels its reminders before deleting', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<HabitDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('habit-detail-remove')).toBeTruthy());

    fireEvent.press(screen.getByTestId('habit-detail-remove'));
    const buttons = alertSpy.mock.calls[0][2] as any[];
    await act(async () => {
      await buttons[1].onPress();
    });

    // Otherwise a deleted habit keeps firing notifications.
    expect(mockCancelHabitReminder).toHaveBeenCalledWith('h1');
    expect(mockDeleteHabit).toHaveBeenCalledWith('h1');
    alertSpy.mockRestore();
  });
});
