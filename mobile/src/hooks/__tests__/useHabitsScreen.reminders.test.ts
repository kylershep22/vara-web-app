// useHabitsScreen — what the create path does with a reminder.
//
// The sheet's own tests prove the toggle reaches the save callback. These prove
// the callback persists the fields, captures the new habit's id (it used to
// discard it, which left nothing to build a notification identifier from), and
// flips the master notification flag BEFORE scheduling — without that flip the
// reminder is scheduled and then wiped by the next foreground resync.

const mockCreateHabit = jest.fn().mockResolvedValue('new-habit-id');
const mockUpdateHabit = jest.fn();
const mockScheduleHabitReminder = jest.fn().mockResolvedValue(undefined);
const mockCancelHabitReminder = jest.fn().mockResolvedValue(undefined);
const mockEnsureRemindersAllowed = jest.fn().mockResolvedValue(undefined);

/** Ordered log, so "flip before schedule" can actually be asserted. */
const callOrder: string[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('../useHabits', () => ({
  useHabits: () => ({ habits: [], loading: false, error: null, retry: jest.fn() }),
}));
jest.mock('../useCelebrations', () => ({
  useCelebrations: () => ({
    allHabitsCompletedToday: false,
    setAllHabitsCompletedToday: jest.fn(),
  }),
}));
jest.mock('../useNotificationOptIn', () => ({
  useNotificationOptIn: () => ({ shouldShowPrompt: false, markPromptShown: jest.fn() }),
}));
jest.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showNotificationToast: jest.fn() }),
}));
jest.mock('../../services/firebase', () => ({
  createHabit: (...a: any[]) => mockCreateHabit(...a),
  updateHabit: (...a: any[]) => mockUpdateHabit(...a),
  deleteHabit: jest.fn(),
  markHabitComplete: jest.fn(),
  unmarkHabitComplete: jest.fn(),
  isHabitCompletedToday: jest.fn().mockResolvedValue(false),
  setCompletionNote: jest.fn(),
  getCompletionNote: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  scheduleHabitReminder: (...a: any[]) => {
    callOrder.push('schedule');
    return mockScheduleHabitReminder(...a);
  },
  cancelHabitReminder: (...a: any[]) => mockCancelHabitReminder(...a),
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  ensureRemindersAllowed: (...a: any[]) => {
    callOrder.push('ensureAllowed');
    return mockEnsureRemindersAllowed(...a);
  },
}));
jest.mock('../../components/habits/SimpleHabitCreateScreen', () => ({}));

import { renderHook, act } from '@testing-library/react-native';

import { useHabitsScreen } from '../useHabitsScreen';

function form(over: Record<string, any> = {}) {
  return {
    name: 'Morning walk',
    category: 'movement',
    frequencyType: 'daily',
    specificDays: [],
    timeOfDay: 'anytime',
    intention: '',
    notePromptEnabled: false,
    reminderEnabled: false,
    reminderTime: null,
    ...over,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  callOrder.length = 0;
  mockCreateHabit.mockResolvedValue('new-habit-id');
});

describe('creating a habit with a reminder', () => {
  test('persists reminderEnabled and the canonical {hour, minute} time', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(
        form({ reminderEnabled: true, reminderTime: { hour: 7, minute: 30 } })
      );
    });

    expect(mockCreateHabit).toHaveBeenCalledTimes(1);
    const written = mockCreateHabit.mock.calls[0][1];
    expect(written.reminderEnabled).toBe(true);
    expect(written.reminderTime).toEqual({ hour: 7, minute: 30 });
  });

  test('schedules against the id RETURNED by createHabit', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(
        form({ reminderEnabled: true, reminderTime: { hour: 7, minute: 30 } })
      );
    });

    // The id used to be discarded here, leaving nothing to derive
    // habit-reminder-${id} from.
    expect(mockScheduleHabitReminder).toHaveBeenCalledTimes(1);
    expect(mockScheduleHabitReminder.mock.calls[0][0]).toMatchObject({
      id: 'new-habit-id',
      reminderEnabled: true,
      reminderTime: { hour: 7, minute: 30 },
    });
  });

  test('flips the master notification flag BEFORE scheduling', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(
        form({ reminderEnabled: true, reminderTime: { hour: 7, minute: 30 } })
      );
    });

    expect(mockEnsureRemindersAllowed).toHaveBeenCalledWith('u1');
    // Ordered: syncAllReminders bails while the flag is off, so a reminder
    // scheduled before the flip would be wiped on the next foreground.
    expect(callOrder).toEqual(['ensureAllowed', 'schedule']);
  });

  test('carries the frequency through, so the scheduler can derive the days', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(
        form({
          frequencyType: 'specific_days',
          specificDays: [1, 3, 5],
          reminderEnabled: true,
          reminderTime: { hour: 7, minute: 0 },
        })
      );
    });

    expect(mockScheduleHabitReminder.mock.calls[0][0]).toMatchObject({
      frequencyType: 'specific_days',
      specificDays: [1, 3, 5],
    });
  });
});

describe('creating a habit without a reminder', () => {
  test('writes no reminder fields at all — an absent flag is off', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(form());
    });

    const written = mockCreateHabit.mock.calls[0][1];
    expect(written).not.toHaveProperty('reminderEnabled');
    expect(written).not.toHaveProperty('reminderTime');
  });

  test('touches neither the master flag nor the scheduler', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(form());
    });

    expect(mockEnsureRemindersAllowed).not.toHaveBeenCalled();
    expect(mockScheduleHabitReminder).not.toHaveBeenCalled();
  });

  test('a toggle with no time is not a reminder', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave(
        form({ reminderEnabled: true, reminderTime: null })
      );
    });

    expect(mockCreateHabit.mock.calls[0][1]).not.toHaveProperty('reminderEnabled');
    expect(mockScheduleHabitReminder).not.toHaveBeenCalled();
  });
});

describe('deleting a habit', () => {
  test('cancels its reminders', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useHabitsScreen());

    act(() => {
      result.current.handleDeleteHabit('h1');
    });

    // handleDeleteHabit routes through a confirmation; the destructive action
    // is the second button.
    const buttons = alertSpy.mock.calls[0][2] as any[];
    await act(async () => {
      await buttons[1].onPress();
    });

    expect(mockCancelHabitReminder).toHaveBeenCalledWith('h1');
    alertSpy.mockRestore();
  });
});
