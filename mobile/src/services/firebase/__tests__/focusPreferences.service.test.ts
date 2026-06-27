const mockUpdateDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));
const mockServerTimestamp = jest.fn(() => '__ts__');
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
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
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  test('saveFocusPreferences persists centerFirst on users/{uid} + updatedAt', async () => {
    await saveFocusPreferences('u1', { centerFirst: true });
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'users', 'u1');
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'focusPreferences.centerFirst': true,
        'focusPreferences.updatedAt': '__ts__',
      })
    );
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

  test('getFocusPreferences defaults to false when the user doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await getFocusPreferences('u1')).toEqual({ centerFirst: false });
  });
});
