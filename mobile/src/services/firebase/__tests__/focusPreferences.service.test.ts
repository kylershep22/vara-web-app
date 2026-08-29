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

import {
  saveFocusPreferences,
  getFocusPreferences,
} from '../focusPreferences.service';

describe('focusPreferences.service', () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    mockDoc.mockClear();
  });

  // Repointed in userPrivate migration slice 2: this is a non-allowlist field,
  // so it may not stay on the world-readable profile past the slice-4 flip.
  test('saveFocusPreferences persists centerFirst on userPrivate, not users', async () => {
    await saveFocusPreferences('u1', { centerFirst: true });
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'userPrivate', 'u1');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockSetDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        focusPreferences: { centerFirst: true, updatedAt: '__ts__' },
      })
    );
  });

  test('the write is a nested object, never a dotted field-path key', async () => {
    await saveFocusPreferences('u1', { centerFirst: true });
    for (const key of Object.keys(mockSetDoc.mock.calls[0][1] as object)) {
      expect(key).not.toContain('.');
    }
  });

  test('getFocusPreferences returns the stored centerFirst', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ focusPreferences: { centerFirst: true } }),
    });
    expect(await getFocusPreferences('u1')).toEqual({ centerFirst: true });
  });

  test('getFocusPreferences defaults centerFirst to false when absent', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
    expect(await getFocusPreferences('u1')).toEqual({ centerFirst: false });
  });

  test('getFocusPreferences defaults to false when NEITHER document exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    expect(await getFocusPreferences('u1')).toEqual({ centerFirst: false });
  });

  test('getFocusPreferences still finds a value left on users/{uid}', async () => {
    // MIGRATION_FALLBACK: a user who set this before updating.
    mockGetDoc.mockImplementation((ref: any) =>
      Promise.resolve(
        ref.collection === 'userPrivate'
          ? { exists: (): boolean => false, data: () => null }
          : {
              exists: (): boolean => true,
              data: () => ({ focusPreferences: { centerFirst: true } }),
            }
      )
    );
    expect(await getFocusPreferences('u1')).toEqual({ centerFirst: true });
  });
});
