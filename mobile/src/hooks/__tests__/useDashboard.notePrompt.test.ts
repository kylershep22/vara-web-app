// useDashboard — the dashboard grid completion call site.
//
// The highest-traffic completion surface, and the one whose one-tap guarantee
// the note prompt must not disturb. Companion to
// useHabitsScreen.notePrompt.test.ts; same three assertions, same reasoning.
//
// Uses the real useHabitNotePrompt so noteTarget exercises call site and
// decision together.

const mockMarkHabitComplete = jest.fn();
const mockUnmarkHabitComplete = jest.fn();
const mockGetHabitCompletions = jest.fn();
const mockIsHabitCompletedToday = jest.fn();
const mockSetCompletionNote = jest.fn();
const mockGetCompletionNote = jest.fn();

let mockHabits: any[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: () => undefined,
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showNotificationToast: jest.fn(), showToast: jest.fn() }),
}));

jest.mock('../useHabits', () => ({
  useHabits: () => ({ habits: mockHabits, loading: false, error: null }),
}));
jest.mock('../useGoals', () => ({
  useGoals: () => ({ goals: [], loading: false, error: null }),
}));
// No useTasks mock: TB-2a removed the hook's dormant subscription, so
// useDashboard no longer imports it and a mock here would stub nothing.
jest.mock('../useJournal', () => ({
  useJournal: () => ({ entries: [], loading: false, error: null }),
}));
jest.mock('../useFeatureDiscovery', () => ({
  useFeatureDiscovery: () => ({
    trackEngagement: jest.fn().mockResolvedValue(undefined),
    evaluateTriggers: jest.fn().mockResolvedValue(undefined),
    pendingToasts: [],
    markToastShown: jest.fn(),
    markFeatureVisited: jest.fn(),
  }),
}));
jest.mock('../useNotificationOptInCards', () => ({
  useNotificationOptInCards: () => ({
    activeCard: null,
    onOptIn: jest.fn(),
    onDismiss: jest.fn(),
  }),
}));

jest.mock('../../services/firebase', () => ({
  markHabitComplete: (...a: any[]) => mockMarkHabitComplete(...a),
  unmarkHabitComplete: (...a: any[]) => mockUnmarkHabitComplete(...a),
  getHabitCompletions: (...a: any[]) => mockGetHabitCompletions(...a),
  isHabitCompletedToday: (...a: any[]) => mockIsHabitCompletedToday(...a),
  setCompletionNote: (...a: any[]) => mockSetCompletionNote(...a),
  getCompletionNote: (...a: any[]) => mockGetCompletionNote(...a),
  calculateWellnessScore: jest.fn().mockResolvedValue(null),
  refreshWellnessScore: jest.fn().mockResolvedValue(null),
  getTodayWellnessScore: jest.fn().mockResolvedValue(null),
  getTodayEntry: jest.fn().mockResolvedValue(null),
  getWellnessScoreEnabled: jest.fn().mockResolvedValue(false),
  setWellnessScoreEnabled: jest.fn().mockResolvedValue(undefined),
  getTodayBrainStateCheckIn: jest.fn().mockResolvedValue(null),
  getTodayDailyReflection: jest.fn().mockResolvedValue(null),
  saveDailyReflection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/firebase/routines.service', () => ({
  fetchUserRoutines: jest.fn().mockResolvedValue([]),
  getRoutineCompletionToday: jest.fn().mockResolvedValue(false),
  createRoutine: jest.fn(),
}));

jest.mock('../../services/api/ai.service', () => ({
  generateDailyPlan: jest.fn().mockResolvedValue({ plan: '' }),
}));

import { renderHook, act } from '@testing-library/react-native';

import { useDashboard } from '../useDashboard';

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
  mockGetHabitCompletions.mockResolvedValue([]);
  mockIsHabitCompletedToday.mockResolvedValue(false);
  mockGetCompletionNote.mockResolvedValue(null);
});

describe('useDashboard — the grid completion call site', () => {
  it('writes the completion and prompts for a flagged habit', async () => {
    const { result } = renderHook(() => useDashboard());
    await act(async () => {
      await result.current.handleHabitToggle('h1', TODAY);
    });

    expect(mockMarkHabitComplete).toHaveBeenCalledWith('h1', 'u1', TODAY);
    expect(result.current.noteTarget).toEqual({
      habitId: 'h1',
      date: TODAY,
      habitName: 'Morning walk',
    });
  });

  it('writes the completion and does NOT prompt for an unflagged habit', async () => {
    const { result } = renderHook(() => useDashboard());
    await act(async () => {
      await result.current.handleHabitToggle('h2', TODAY);
    });

    // One tap still completes. The flag governs the prompt, never the write.
    expect(mockMarkHabitComplete).toHaveBeenCalledWith('h2', 'u1', TODAY);
    expect(result.current.noteTarget).toBeNull();
  });

  it('does not prompt until the completion write has resolved', async () => {
    const write = deferred();
    mockMarkHabitComplete.mockReturnValue(write.promise);

    const { result } = renderHook(() => useDashboard());

    let toggled!: Promise<void>;
    act(() => {
      toggled = result.current.handleHabitToggle('h1', TODAY);
    });

    await act(async () => {
      // Let the pre-write haptics settle without resolving the write itself.
      await Promise.resolve();
    });
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

    const { result } = renderHook(() => useDashboard());
    await act(async () => {
      await result.current.handleHabitToggle('h1', TODAY);
    });

    expect(result.current.noteTarget).toBeNull();
  });
});
