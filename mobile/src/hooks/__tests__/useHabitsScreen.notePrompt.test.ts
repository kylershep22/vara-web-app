// useHabitsScreen — the Habits-tab completion call site.
//
// The hook-level tests in useHabitNotePrompt.test.ts prove the flagged/unflagged
// DECISION. This file proves the CALL SITE: that the Habits tab actually reaches
// that decision, with the right habit, and only after the completion is durable.
//
// Deliberately uses the real useHabitNotePrompt rather than mocking it, so an
// assertion on noteTarget exercises call site and decision together.

const mockMarkHabitComplete = jest.fn();
const mockUnmarkHabitComplete = jest.fn();
const mockIsHabitCompletedToday = jest.fn();
const mockSetCompletionNote = jest.fn();
const mockGetCompletionNote = jest.fn();

let mockHabits: any[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../useHabits', () => ({
  useHabits: () => ({ habits: mockHabits, loading: false, error: null, retry: jest.fn() }),
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
  createHabit: jest.fn(),
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  markHabitComplete: (...a: any[]) => mockMarkHabitComplete(...a),
  unmarkHabitComplete: (...a: any[]) => mockUnmarkHabitComplete(...a),
  isHabitCompletedToday: (...a: any[]) => mockIsHabitCompletedToday(...a),
  setCompletionNote: (...a: any[]) => mockSetCompletionNote(...a),
  getCompletionNote: (...a: any[]) => mockGetCompletionNote(...a),
}));

// Mocked because the real module pulls in expo-notifications, whose
// EventEmitter init fails under the react-native jest preset (same reason
// expo-haptics is mocked globally). The habit save path calls into it to
// request notification permission.
jest.mock('../../services/notifications.service', () => ({
  ensureNotificationPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/reminderScheduler.service', () => ({
  scheduleHabitReminder: jest.fn(),
  cancelHabitReminder: jest.fn(),
}));

// Value import in the hook, used only as a type — keep its module out of the graph.
jest.mock('../../components/habits/SimpleHabitCreateScreen', () => ({}));

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useHabitsScreen } from '../useHabitsScreen';

const FLAGGED = {
  id: 'h1',
  name: 'Morning walk',
  notePromptEnabled: true,
  type: 'daily',
  frequency: 7,
  active: true,
};
const UNFLAGGED = { id: 'h2', name: 'Read', type: 'daily', frequency: 7, active: true };

const TODAY = new Date().toISOString().split('T')[0];

/** A promise whose resolution this test controls, for ordering assertions. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHabits = [FLAGGED, UNFLAGGED];
  mockMarkHabitComplete.mockResolvedValue(undefined);
  mockUnmarkHabitComplete.mockResolvedValue(undefined);
  mockIsHabitCompletedToday.mockResolvedValue(false);
  mockGetCompletionNote.mockResolvedValue(null);
});

describe('useHabitsScreen — the Habits-tab completion call site', () => {
  it('writes the completion and prompts for a flagged habit', async () => {
    const { result } = renderHook(() => useHabitsScreen());
    await act(async () => {
      await result.current.handleToggleCompletion('h1');
    });

    expect(mockMarkHabitComplete).toHaveBeenCalledWith('h1', 'u1', TODAY, { source: 'track' });
    expect(result.current.noteTarget).toEqual({
      habitId: 'h1',
      date: TODAY,
      habitName: 'Morning walk',
    });
  });

  it('writes the completion and does NOT prompt for an unflagged habit', async () => {
    const { result } = renderHook(() => useHabitsScreen());
    await act(async () => {
      await result.current.handleToggleCompletion('h2');
    });

    // The completion is written regardless of the flag — the flag governs the
    // prompt only, never whether the habit completes.
    expect(mockMarkHabitComplete).toHaveBeenCalledWith('h2', 'u1', TODAY, { source: 'track' });
    expect(result.current.noteTarget).toBeNull();
  });

  it('does not prompt until the completion write has resolved', async () => {
    const write = deferred();
    mockMarkHabitComplete.mockReturnValue(write.promise);

    const { result } = renderHook(() => useHabitsScreen());

    let toggled!: Promise<void>;
    act(() => {
      toggled = result.current.handleToggleCompletion('h1');
    });

    // Mid-flight: the write is issued but unresolved, so nothing has been asked.
    expect(mockMarkHabitComplete).toHaveBeenCalled();
    expect(result.current.noteTarget).toBeNull();

    await act(async () => {
      write.resolve();
      await toggled;
    });

    expect(result.current.noteTarget).not.toBeNull();
  });

  it('does not prompt when the completion write fails', async () => {
    mockMarkHabitComplete.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useHabitsScreen());
    await act(async () => {
      await result.current.handleToggleCompletion('h1');
    });

    expect(result.current.noteTarget).toBeNull();
  });

  it('does not prompt when un-completing', async () => {
    mockIsHabitCompletedToday.mockResolvedValue(true);
    const { result } = renderHook(() => useHabitsScreen());
    await waitFor(() => expect(result.current.completedToday.has('h1')).toBe(true));

    await act(async () => {
      await result.current.handleToggleCompletion('h1');
    });

    expect(mockUnmarkHabitComplete).toHaveBeenCalledWith('h1', TODAY);
    expect(mockMarkHabitComplete).not.toHaveBeenCalled();
    expect(result.current.noteTarget).toBeNull();
  });
});
