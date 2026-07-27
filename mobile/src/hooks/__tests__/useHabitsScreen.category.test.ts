// useHabitsScreen — what the create path actually persists for the new
// controlled category.
//
// The create sheet's own tests prove the key reaches the save callback. These
// prove the callback reaches Firestore with the key on the NEW field, and that
// the legacy free-text `category` is left entirely alone on the way through.

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();

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
  scheduleHabitReminder: jest.fn(),
  cancelHabitReminder: jest.fn(),
}));

// Value import in the hook, used only as a type — keep its module out of the graph.
jest.mock('../../components/habits/SimpleHabitCreateScreen', () => ({}));

import { renderHook, act } from '@testing-library/react-native';

import { useHabitsScreen } from '../useHabitsScreen';
import { HABIT_CATEGORY_KEYS } from '../../constants/habitTaxonomy';

function form(over: Record<string, any> = {}) {
  return {
    name: 'Morning walk',
    category: 'movement',
    frequencyType: 'daily',
    specificDays: [],
    timeOfDay: 'anytime',
    intention: '',
    notePromptEnabled: false,
    ...over,
  } as any;
}

async function save(over: Record<string, any> = {}) {
  const { result } = renderHook(() => useHabitsScreen());
  await act(async () => {
    await result.current.handleSimpleHabitSave(form(over));
  });
  return mockCreateHabit.mock.calls[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateHabit.mockResolvedValue('new-habit-id');
});

describe('useHabitsScreen — the new category reaches Firestore', () => {
  it('writes the key on habitCategory, for the signed-in user', async () => {
    const [uid, data] = await save({ category: 'focus_work' });
    expect(uid).toBe('u1');
    expect(data.habitCategory).toBe('focus_work');
  });

  it.each([...HABIT_CATEGORY_KEYS])('persists %s unchanged', async (key) => {
    const [, data] = await save({ category: key });
    expect(data.habitCategory).toBe(key);
  });

  it('stores only the key, never the derived pillar or focus-demand', async () => {
    // Deriving at read time is what lets a mapping change ship without a
    // habit migration. Denormalizing either one here would break that.
    const [, data] = await save({ category: 'focus_work' });
    expect(data).not.toHaveProperty('pillar');
    expect(data).not.toHaveProperty('focusDemand');
    expect(data).not.toHaveProperty('habitPillar');
  });

  it('does not write the legacy free-text category field', async () => {
    // The legacy field has live readers (Connection routing, the CR badge) that
    // key off its own separate vocabulary. The create path must not touch it.
    const [, data] = await save({ category: 'connection' });
    expect(data).not.toHaveProperty('category');
  });

  it('leaves the rest of the created habit exactly as before', async () => {
    const [, data] = await save({ category: 'movement' });
    expect(data).toMatchObject({
      name: 'Morning walk',
      type: 'daily',
      frequency: 7,
      frequencyType: 'daily',
      active: true,
      missedYesterday: false,
      consecutiveMisses: 0,
      scalingPhase: 'getting_started',
    });
  });
});
