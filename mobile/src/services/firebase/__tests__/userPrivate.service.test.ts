const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));
const mockServerTimestamp = jest.fn(() => '__ts__');
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the
// handle for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import { getUserPrivate, setUserPrivate } from '../userPrivate.service';

/** Shorthand for the two getDoc outcomes the service branches on. */
const absent = { exists: () => false };
const present = (data: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => data,
});

describe('userPrivate.service', () => {
  beforeEach(() => {
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  describe('document targeting', () => {
    test('addresses userPrivate/{uid} — a top-level collection, not a users subdoc', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await getUserPrivate('u1');
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'userPrivate', 'u1');
    });

    test('the uid is the document ID, so no userId field is queried or written', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await setUserPrivate('u1', { weekStartDay: 1 });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written).not.toHaveProperty('userId');
      expect(mockDoc.mock.calls[0][2]).toBe('u1');
    });
  });

  describe('getUserPrivate', () => {
    test('returns null when the document does not exist', async () => {
      mockGetDoc.mockResolvedValue(absent);
      expect(await getUserPrivate('u1')).toBeNull();
    });

    test('returns the stored fields with uid attached', async () => {
      mockGetDoc.mockResolvedValue(
        present({
          floorCommitment: 'ten minutes, even on a bad day',
          antiGoals: ['side projects'],
          weekStartDay: 1,
        })
      );
      expect(await getUserPrivate('u1')).toEqual({
        uid: 'u1',
        floorCommitment: 'ten minutes, even on a bad day',
        antiGoals: ['side projects'],
        weekStartDay: 1,
      });
    });

    test('returns an empty doc as {uid} rather than null — created but unpopulated is a real state', async () => {
      mockGetDoc.mockResolvedValue(present({}));
      expect(await getUserPrivate('u1')).toEqual({ uid: 'u1' });
    });

    test('uid comes from the argument, not the stored field', async () => {
      // A stored uid disagreeing with the document ID must not win: the ID is
      // what the security rule matches on, so it is the authority.
      mockGetDoc.mockResolvedValue(present({ uid: 'someone-else' }));
      expect((await getUserPrivate('u1'))?.uid).toBe('u1');
    });
  });

  describe('setUserPrivate', () => {
    test('upserts with merge so a partial patch does not clobber other fields', async () => {
      mockGetDoc.mockResolvedValue(present({ antiGoals: ['x'] }));
      await setUserPrivate('u1', { floorCommitment: 'one walk' });
      expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
    });

    test('stamps createdAt and updatedAt on the first write', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await setUserPrivate('u1', { activeOutcome: 'steadier-weeks' });
      expect(mockSetDoc.mock.calls[0][1]).toEqual({
        uid: 'u1',
        activeOutcome: 'steadier-weeks',
        createdAt: '__ts__',
        updatedAt: '__ts__',
      });
    });

    test('stamps only updatedAt on a subsequent write, never resetting createdAt', async () => {
      mockGetDoc.mockResolvedValue(present({ createdAt: 'original' }));
      await setUserPrivate('u1', { activeOutcome: 'steadier-weeks' });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written).toHaveProperty('updatedAt', '__ts__');
      expect(written).not.toHaveProperty('createdAt');
    });

    test('writes the patch fields through unchanged', async () => {
      mockGetDoc.mockResolvedValue(present({}));
      await setUserPrivate('u1', {
        floorCommitment: 'ten minutes',
        antiGoals: ['side projects', 'early alarms'],
        activeOutcome: 'steadier-weeks',
        weekStartDay: 0,
        energyWindow: null,
      });
      expect(mockSetDoc.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          floorCommitment: 'ten minutes',
          antiGoals: ['side projects', 'early alarms'],
          activeOutcome: 'steadier-weeks',
          weekStartDay: 0,
          energyWindow: null,
        })
      );
    });

    test('an empty patch still stamps updatedAt (a touch is a legitimate write)', async () => {
      mockGetDoc.mockResolvedValue(present({}));
      await setUserPrivate('u1', {});
      expect(mockSetDoc.mock.calls[0][1]).toEqual({
        uid: 'u1',
        updatedAt: '__ts__',
      });
    });

    test('the caller cannot overwrite uid or the timestamps through the patch (new doc)', async () => {
      mockGetDoc.mockResolvedValue(absent);
      // UserPrivatePatch omits these at the type level; these two tests assert
      // the runtime also refuses them, on BOTH the create and update paths.
      await setUserPrivate('u1', {
        uid: 'attacker',
        createdAt: 'forged',
        updatedAt: 'forged',
      } as never);
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.uid).toBe('u1');
      expect(written.createdAt).toBe('__ts__');
      expect(written.updatedAt).toBe('__ts__');
    });

    test('the caller cannot forge createdAt on the update path either', async () => {
      // The update path adds no createdAt of its own, so spread order alone
      // would not have stopped this — the key has to be stripped.
      mockGetDoc.mockResolvedValue(present({ createdAt: 'original' }));
      await setUserPrivate('u1', {
        uid: 'attacker',
        createdAt: 'forged',
        updatedAt: 'forged',
      } as never);
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.uid).toBe('u1');
      expect(written).not.toHaveProperty('createdAt');
      expect(written.updatedAt).toBe('__ts__');
    });
  });
});
