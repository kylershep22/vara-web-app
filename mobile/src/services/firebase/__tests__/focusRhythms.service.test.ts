const mockUpdateDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ collection, id }));
const mockServerTimestamp = jest.fn(() => '__ts__');
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => (mockDoc as any)(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));

import { saveFocusRhythms, getFocusRhythms } from '../focusRhythms.service';

describe('focusRhythms.service', () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    mockDoc.mockClear();
  });

  // Repointed in userPrivate migration slice 2 — non-allowlist field.
  test('saveFocusRhythms persists the windows array on userPrivate, not users', async () => {
    await saveFocusRhythms('u1', ['early_morning', 'evening']);
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'userPrivate', 'u1');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    const patch = mockSetDoc.mock.calls[0][1];
    expect(patch).toEqual(
      expect.objectContaining({
        focusRhythms: { windows: ['early_morning', 'evening'], updatedAt: '__ts__' },
      })
    );
    // Capture only — no score / count fields ever written.
    expect(JSON.stringify(patch)).not.toMatch(/score|count|streak/i);
    // And a nested object, never a dotted field-path key.
    for (const key of Object.keys(patch as object)) {
      expect(key).not.toContain('.');
    }
  });

  test('saveFocusRhythms accepts an empty selection', async () => {
    await saveFocusRhythms('u1', []);
    expect((mockSetDoc.mock.calls[0][1] as any).focusRhythms.windows).toEqual([]);
  });

  test('getFocusRhythms returns the stored windows', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ focusRhythms: { windows: ['afternoon'] } }),
    });
    expect(await getFocusRhythms('u1')).toEqual(['afternoon']);
  });

  test('getFocusRhythms returns [] when the field is absent', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
    expect(await getFocusRhythms('u1')).toEqual([]);
  });

  test('getFocusRhythms returns [] when NEITHER document exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    expect(await getFocusRhythms('u1')).toEqual([]);
  });

  test('getFocusRhythms still finds windows left on users/{uid}', async () => {
    // MIGRATION_FALLBACK: a user who set these before updating.
    mockGetDoc.mockImplementation((ref: any) =>
      Promise.resolve(
        ref.collection === 'userPrivate'
          ? { exists: (): boolean => false, data: () => null }
          : {
              exists: (): boolean => true,
              data: () => ({ focusRhythms: { windows: ['afternoon'] } }),
            }
      )
    );
    expect(await getFocusRhythms('u1')).toEqual(['afternoon']);
  });
});
