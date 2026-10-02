/**
 * routines.service: fetchUserRoutinesFromServer, the only read the routine
 * reminder reconcile accepts (ROUTINE-REMINDER-OFFLINE-RESILIENCE, Kyle's
 * ruling 2: a cache-backed empty result is not authoritative enough to justify
 * cancellation).
 *
 * Firestore is mocked at its module boundary. getDocs (cache-capable) and
 * getDocsFromServer are separate mocks, so a read through the wrong one shows.
 * That getDocsFromServer itself rejects offline is the SDK's behaviour, read
 * from its source at Step 0; the device walk is what observes it.
 */
const mockGetDocs = jest.fn();
const mockGetDocsFromServer = jest.fn();
const mockWhere = jest.fn((...a: unknown[]) => ({ where: a }));
let mockDb: { __db: true } | null = { __db: true };

jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ collection: name }),
  query: (...a: unknown[]) => ({ query: a }),
  where: (...a: unknown[]) => mockWhere(...a),
  getDocs: (...a: unknown[]) => mockGetDocs(...a),
  getDocsFromServer: (...a: unknown[]) => mockGetDocsFromServer(...a),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: () => '__ts__',
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  Timestamp: {},
}));
jest.mock('../../../config/firebase', () => ({
  get db() {
    return mockDb;
  },
  firebaseError: null,
}));

import { fetchUserRoutinesFromServer } from '../routines.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockDb = { __db: true };
});

describe('fetchUserRoutinesFromServer', () => {
  test("reads the user's routines through getDocsFromServer, never getDocs", async () => {
    // Mutation caught: reading through getDocs, which offline can resolve
    // from the memory cache with an empty or partial list.
    mockGetDocsFromServer.mockResolvedValue({
      docs: [{ id: 'r1', data: () => ({ userId: 'u1', name: 'Morning', active: true }) }],
    });

    await expect(fetchUserRoutinesFromServer('u1')).resolves.toEqual([
      { id: 'r1', userId: 'u1', name: 'Morning', active: true },
    ]);
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'u1');
  });

  test('a server read that fails offline rejects, rather than answering with no routines', async () => {
    // Mutation caught: catching the error and returning [].
    mockGetDocsFromServer.mockRejectedValue(
      new Error('Failed to get documents from server. (However, these documents may exist in the local cache.)')
    );

    await expect(fetchUserRoutinesFromServer('u1')).rejects.toThrow('Failed to get documents from server');
  });

  test('uninitialized Firestore rejects, rather than answering with no routines', async () => {
    // fetchUserRoutines answers [] here; the reconcile would read that as
    // "this user has no routines" and cancel every reminder.
    // Mutation caught: an `if (!db) return []` guard.
    mockDb = null;

    await expect(fetchUserRoutinesFromServer('u1')).rejects.toThrow('Firestore is not initialized');
    expect(mockGetDocsFromServer).not.toHaveBeenCalled();
  });
});
