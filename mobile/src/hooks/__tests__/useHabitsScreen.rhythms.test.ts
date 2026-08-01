// useHabitsScreen — the focus-rhythms read that feeds the create sheet's nudge.
//
// The read lives here rather than in SimpleHabitCreateScreen so that sheet stays
// presentational: no auth, no Firestore, and therefore testable without mocking
// either. These tests pin that contract from the hook's side.

const mockGetFocusRhythms = jest.fn();
const mockScheduleHabitReminder = jest.fn();
const mockCancelHabitReminder = jest.fn();

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
  createHabit: jest.fn().mockResolvedValue('id'),
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  markHabitComplete: jest.fn(),
  unmarkHabitComplete: jest.fn(),
  isHabitCompletedToday: jest.fn().mockResolvedValue(false),
  setCompletionNote: jest.fn(),
  getCompletionNote: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetFocusRhythms(...a),
}));

// Reminders are OUT of scope for this slice. Mocked so the tests below can
// assert that nothing here ever reaches them.
// Mocked because the real module pulls in expo-notifications, whose
// EventEmitter init fails under the react-native jest preset (same reason
// expo-haptics is mocked globally). The habit save path calls into it to
// request notification permission.
jest.mock('../../services/notifications.service', () => ({
  ensureNotificationPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  scheduleHabitReminder: (...a: any[]) => mockScheduleHabitReminder(...a),
  cancelHabitReminder: (...a: any[]) => mockCancelHabitReminder(...a),
}));

jest.mock('../../components/habits/SimpleHabitCreateScreen', () => ({}));

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useHabitsScreen } from '../useHabitsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFocusRhythms.mockResolvedValue(['afternoon']);
});

describe('useHabitsScreen — reading focus rhythms', () => {
  it('does not read them until the create sheet opens', () => {
    renderHook(() => useHabitsScreen());
    // The habits list renders for everyone; the rhythms only matter to the
    // create sheet, so the read stays off the list's path.
    expect(mockGetFocusRhythms).not.toHaveBeenCalled();
  });

  it('reads them for the signed-in user when the sheet opens', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      result.current.setModalVisible(true);
    });

    await waitFor(() => expect(mockGetFocusRhythms).toHaveBeenCalledWith('u1'));
  });

  it('exposes the windows for the sheet to consume', async () => {
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      result.current.setModalVisible(true);
    });

    await waitFor(() => expect(result.current.focusRhythmWindows).toEqual(['afternoon']));
  });

  it('starts empty, so no nudge can show before the read lands', () => {
    const { result } = renderHook(() => useHabitsScreen());
    expect(result.current.focusRhythmWindows).toEqual([]);
  });

  it('leaves the windows empty when the read fails', async () => {
    // A failed read must degrade to "no suggestion", never block creation.
    mockGetFocusRhythms.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      result.current.setModalVisible(true);
    });

    await waitFor(() => expect(mockGetFocusRhythms).toHaveBeenCalled());
    expect(result.current.focusRhythmWindows).toEqual([]);
  });

  it('passes an empty array straight through when nothing is stored', async () => {
    mockGetFocusRhythms.mockResolvedValue([]);
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      result.current.setModalVisible(true);
    });

    await waitFor(() => expect(mockGetFocusRhythms).toHaveBeenCalled());
    expect(result.current.focusRhythmWindows).toEqual([]);
  });
});

describe('useHabitsScreen — reminders stay out of this', () => {
  it('schedules nothing when a habit is created with a time of day', async () => {
    // Layer 2 sets the timeOfDay VALUE only. Scheduling is a separate system
    // with its own brand review, and the simple create path has never touched
    // it (scheduleHabitReminder is wizard-only, driven by a time cue).
    const { result } = renderHook(() => useHabitsScreen());

    await act(async () => {
      await result.current.handleSimpleHabitSave({
        name: 'Deep work',
        category: 'focus_work',
        frequencyType: 'daily',
        specificDays: [],
        timeOfDay: 'morning',
        intention: '',
        notePromptEnabled: false,
      } as any);
    });

    expect(mockScheduleHabitReminder).not.toHaveBeenCalled();
    expect(mockCancelHabitReminder).not.toHaveBeenCalled();
  });
});
