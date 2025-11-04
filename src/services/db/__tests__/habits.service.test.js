import { listHabits, createHabit, updateHabit, removeHabit } from '../habits.service';
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
const mockHabitId = 'habit123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Habits Service', () => {
  it('should list habits', async () => {
    const mockData = [{ id: '1', data: () => ({ name: 'Habit 1' }) }];
    getDocs.mockResolvedValue({ docs: mockData });

    const habits = await listHabits(mockUserId);

    expect(collection).toHaveBeenCalledWith(db, 'habits');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
    expect(habits).toEqual([{ id: '1', name: 'Habit 1' }]);
  });

  it('should create a habit', async () => {
    const mockPayload = { name: 'New Habit' };
    const mockDocRef = { id: mockHabitId };
    addDoc.mockResolvedValue(mockDocRef);

    const newHabit = await createHabit(mockUserId, mockPayload);

    expect(addDoc).toHaveBeenCalled();
    expect(newHabit).toHaveProperty('id', mockHabitId);
    expect(newHabit).toHaveProperty('name', 'New Habit');
  });

  it('should update a habit', async () => {
    const mockPatch = { name: 'Updated Habit' };
    const mockSnap = { id: mockHabitId, data: () => ({ name: 'Updated Habit' }) };
    updateDoc.mockResolvedValue();
    getDoc.mockResolvedValue(mockSnap);

    const updatedHabit = await updateHabit(mockHabitId, mockPatch);

    expect(updateDoc).toHaveBeenCalled();
    expect(updatedHabit).toHaveProperty('name', 'Updated Habit');
  });

  it('should remove a habit', async () => {
    deleteDoc.mockResolvedValue();

    const result = await removeHabit(mockHabitId);

    expect(deleteDoc).toHaveBeenCalled();
    expect(result).toEqual({ id: mockHabitId, deleted: true });
  });
});
