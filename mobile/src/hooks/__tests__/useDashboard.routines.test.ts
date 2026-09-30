// useDashboard, the routine card's load (ROUTINES-RESTORE).
//
// Renders the REAL hook. useFocusEffect is mocked to run its callback as an
// effect, so the on-focus load actually runs; everything under the hook that is
// not the routine load is stubbed to a quiet resolve.
//
// THE CLOCK AND THE ZONE ARE FIXED so that the local day and the UTC day differ.
// 2026-09-30 at 23:30 in New York is already 2026-10-01 in UTC. The first test
// asserts that divergence before it asserts anything else, so it cannot pass
// vacuously on a machine where the two happen to agree.
process.env.TZ = 'America/New_York';

const mockFetchUserRoutines = jest.fn();
const mockGetRoutineCompletionToday = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    // A focus is an effect whose dependency is the memoised callback.
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(callback, [callback]);
    },
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../useGoals', () => ({
  useGoals: () => ({ goals: [], loading: false, error: null }),
}));
jest.mock('../useFeatureDiscovery', () => ({
  useFeatureDiscovery: () => ({
    trackEngagement: jest.fn().mockResolvedValue(undefined),
    evaluateTriggers: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../useNotificationOptInCards', () => ({
  useNotificationOptInCards: () => ({ activeCard: null, onOptIn: jest.fn(), onDismiss: jest.fn() }),
}));
jest.mock('../../services/firebase', () => ({
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
jest.mock('../../services/firebase/userPrivate.service', () => ({
  setUserPrivate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/userMigrationRead', () => ({
  getMergedUserData: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/api/ai.service', () => ({
  generateDailyPlan: jest.fn().mockResolvedValue({ plan: '' }),
}));
jest.mock('../../services/firebase/routines.service', () => ({
  fetchUserRoutines: (...a: unknown[]) => mockFetchUserRoutines(...a),
  getRoutineCompletionToday: (...a: unknown[]) => mockGetRoutineCompletionToday(...a),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: (...a: unknown[]) => mockLoggerError(...a),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useDashboard } from '../useDashboard';
import { toIsoDate } from '../../utils/weekStart';

const NOW = new Date('2026-10-01T03:30:00Z'); // 23:30 on 2026-09-30 in New York
const LOCAL_DAY = '2026-09-30';
const UTC_DAY = '2026-10-01';

const R1 = { id: 'r1', name: 'Morning', active: true, activities: [] };
const R2 = { id: 'r2', name: 'Evening', active: true, activities: [] };
const OFF = { id: 'r3', name: 'Old', active: false, activities: [] };

type Snapshot = {
  routines: unknown[] | null;
  completions: Record<string, boolean>;
  dataLoading: boolean;
  dataErrors: string[];
};

/** Every render the hook produced, in order. */
function renderRecorded() {
  const renders: Snapshot[] = [];
  const hook = renderHook(() => {
    const r = useDashboard();
    renders.push({
      routines: r.dashboardRoutines,
      completions: r.routineCompletions,
      dataLoading: r.dataLoading,
      dataErrors: r.dataErrors,
    });
    return r;
  });
  return { ...hook, renders };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Only Date is faked: promises, timers and waitFor keep running for real.
  jest.useFakeTimers({
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
    now: NOW,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDashboard, the routine load', () => {
  test('completions are read under the LOCAL day, where UTC has already moved on', async () => {
    // The fixture really does split the two days, or this proves nothing.
    expect(toIsoDate(new Date())).toBe(LOCAL_DAY);
    expect(new Date().toISOString().split('T')[0]).toBe(UTC_DAY);

    mockFetchUserRoutines.mockResolvedValue([R1, OFF]);
    mockGetRoutineCompletionToday.mockResolvedValue({ date: LOCAL_DAY });
    const { result } = renderRecorded();

    await waitFor(() => expect(result.current.dashboardRoutines).toEqual([R1]));
    expect(mockGetRoutineCompletionToday).toHaveBeenCalledTimes(1);
    expect(mockGetRoutineCompletionToday).toHaveBeenCalledWith('r1', LOCAL_DAY);
    expect(result.current.routineCompletions).toEqual({ r1: true });
  });

  test('a failure leaves the routines null and touches neither dataErrors nor dataLoading', async () => {
    mockFetchUserRoutines.mockRejectedValue(new Error('offline'));
    const { result } = renderRecorded();

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    expect(mockLoggerError.mock.calls[0][0]).toMatch(/routines/);
    expect(result.current.dashboardRoutines).toBeNull();
    expect(result.current.dataErrors).toEqual([]);
    expect(result.current.dataLoading).toBe(false);
  });

  test('a pending load does not hold dataLoading', async () => {
    mockFetchUserRoutines.mockReturnValue(new Promise(() => {}));
    const { result, renders } = renderRecorded();

    await waitFor(() => expect(mockFetchUserRoutines).toHaveBeenCalledWith('u1'));
    expect(result.current.dataLoading).toBe(false);
    expect(result.current.dashboardRoutines).toBeNull();
    expect(renders.every((r) => r.dataLoading === false)).toBe(true);
  });

  test('routines and their completions arrive in one update', async () => {
    // The completion reads are held open, so a routine committed ahead of its
    // completion would have a render to show up in.
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    mockFetchUserRoutines.mockResolvedValue([R1, R2]);
    mockGetRoutineCompletionToday.mockImplementation(async (id: string) => {
      await held;
      return id === 'r1' ? { date: LOCAL_DAY } : null;
    });
    const { result, renders } = renderRecorded();

    await waitFor(() => expect(mockGetRoutineCompletionToday).toHaveBeenCalledTimes(2));
    expect(result.current.dashboardRoutines).toBeNull();

    release();
    await waitFor(() => expect(result.current.dashboardRoutines).toEqual([R1, R2]));

    const withRoutines = renders.filter((r) => r.routines !== null);
    expect(withRoutines.length).toBeGreaterThan(0);
    for (const r of withRoutines) expect(r.completions).toEqual({ r1: true, r2: false });
  });
});
