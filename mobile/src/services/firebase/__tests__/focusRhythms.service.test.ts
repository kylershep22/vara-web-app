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

import { saveFocusRhythms, getFocusRhythms } from '../focusRhythms.service';

describe('focusRhythms.service', () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  test('saveFocusRhythms persists the windows array on users/{uid} + updatedAt, no scores', async () => {
    await saveFocusRhythms('u1', ['early_morning', 'evening']);
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'users', 'u1');
    const patch = mockUpdateDoc.mock.calls[0][1];
    expect(patch).toEqual(
      expect.objectContaining({
        'focusRhythms.windows': ['early_morning', 'evening'],
        'focusRhythms.updatedAt': '__ts__',
      })
    );
    // Capture only — no score / count fields ever written.
    expect(JSON.stringify(patch)).not.toMatch(/score|count|streak/i);
  });

  test('saveFocusRhythms accepts an empty selection', async () => {
    await saveFocusRhythms('u1', []);
    expect(mockUpdateDoc.mock.calls[0][1]['focusRhythms.windows']).toEqual([]);
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

  test('getFocusRhythms returns [] when the user doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await getFocusRhythms('u1')).toEqual([]);
  });
});
