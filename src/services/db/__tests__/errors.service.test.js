import { getGoal, getHabit } from '../goals.service';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

jest.mock('../../../firebase', () => ({
  db: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn()
}));

const mockGoalId = 'goal123';
const mockHabitId = 'habit123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Error Paths', () => {
  it('should handle permission denied error for getGoal', async () => {
    getDoc.mockRejectedValue({ code: 'permission-denied' });

    try {
      await getGoal(mockGoalId);
    } catch (error) {
      expect(error.code).toBe('permission-denied');
    }
  });

  it('should handle missing document error for getGoal', async () => {
    const mockSnap = { exists: jest.fn(() => false) };
    getDoc.mockResolvedValue(mockSnap);

    const goal = await getGoal(mockGoalId);

    expect(goal).toBeNull();
  });

  it('should handle permission denied error for getHabit', async () => {
    getDoc.mockRejectedValue({ code: 'permission-denied' });

    try {
      await getHabit(mockHabitId);
    } catch (error) {
      expect(error.code).toBe('permission-denied');
    }
  });

  it('should handle missing document error for getHabit', async () => {
    const mockSnap = { exists: jest.fn(() => false) };
    getDoc.mockResolvedValue(mockSnap);

    const habit = await getHabit(mockHabitId);

    expect(habit).toBeNull();
  });
});
