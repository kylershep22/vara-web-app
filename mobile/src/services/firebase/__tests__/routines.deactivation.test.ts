/**
 * routines.service: createRoutine reports what it deactivated (ROUTINE-REMINDERS R-H).
 *
 * The service cannot cancel a reminder itself: reminderScheduler.service imports
 * this module, so a call back would be circular. It returns the ids instead, and
 * both createRoutine call sites cancel them (pinned in RoutineEditor and
 * RoutinesTab tests). Firestore is mocked at its module boundary.
 */
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'new1' });

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: () => mockGetDocs(),
  addDoc: (...a: unknown[]) => mockAddDoc(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  deleteDoc: jest.fn(),
  doc: (_db: unknown, _c: string, id: string) => ({ id }),
  serverTimestamp: () => '__ts__',
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  Timestamp: {},
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));

import { createRoutine } from '../routines.service';

const data = {
  name: 'Morning',
  type: 'morning' as const,
  activities: [],
  active: true,
  reminderTime: null,
  mode: 'checklist' as const,
};

beforeEach(() => jest.clearAllMocks());

describe('createRoutine', () => {
  test('returns the new id and every routine of the same type it deactivated', async () => {
    // Mutation caught: deactivateRoutinesOfType returning nothing.
    mockGetDocs.mockResolvedValue({ docs: [{ id: 'old1' }, { id: 'old2' }] });

    await expect(createRoutine('u1', data)).resolves.toEqual({
      id: 'new1',
      deactivatedIds: ['old1', 'old2'],
    });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });

  test('returns no ids when nothing was active', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await expect(createRoutine('u1', data)).resolves.toEqual({ id: 'new1', deactivatedIds: [] });
  });
});
