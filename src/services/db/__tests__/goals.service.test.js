import { listGoals, createGoal, updateGoal, removeGoal } from '../goals.service';
import { db } from '../../../firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

jest.mock('../../../firebase', () => ({
  db: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));

const mockUserId = 'user123';
const mockGoalId = 'goal123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Goals Service', () => {
  it('should list goals', async () => {
    const mockData = [{ id: '1', data: () => ({ title: 'Goal 1' }) }];
    getDocs.mockResolvedValue({ docs: mockData });

    const goals = await listGoals(mockUserId);

    expect(collection).toHaveBeenCalledWith(db, 'goals');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
    expect(goals).toEqual([{ id: '1', title: 'Goal 1' }]);
  });

  it('should create a goal', async () => {
    const mockPayload = { title: 'New Goal' };
    const mockDocRef = { id: mockGoalId };
    addDoc.mockResolvedValue(mockDocRef);

    const newGoal = await createGoal(mockUserId, mockPayload);

    expect(addDoc).toHaveBeenCalled();
    expect(newGoal).toHaveProperty('id', mockGoalId);
    expect(newGoal).toHaveProperty('title', 'New Goal');
  });

  it('should update a goal', async () => {
    const mockPatch = { title: 'Updated Goal' };
    const mockSnap = { id: mockGoalId, data: () => ({ title: 'Updated Goal' }) };
    updateDoc.mockResolvedValue();
    getDoc.mockResolvedValue(mockSnap);

    const updatedGoal = await updateGoal(mockGoalId, mockPatch);

    expect(updateDoc).toHaveBeenCalled();
    expect(updatedGoal).toHaveProperty('title', 'Updated Goal');
  });

  it('should remove a goal', async () => {
    deleteDoc.mockResolvedValue();

    const result = await removeGoal(mockGoalId);

    expect(deleteDoc).toHaveBeenCalled();
    expect(result).toEqual({ id: mockGoalId, deleted: true });
  });
});
