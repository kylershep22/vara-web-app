const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));

jest.mock('firebase/firestore', () => ({
  collection: (...a: any[]) => a,
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: () => '__ts__',
  setDoc: (...a: any[]) => mockSetDoc(...a),
  Timestamp: {},
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true }, firebaseError: null }));

import { setCompletionNote, getCompletionNote } from '../habits.service';
import { MAX_QUICK_NOTE_LENGTH } from '../../../constants/habitNotes';

describe('setCompletionNote', () => {
  beforeEach(() => {
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  test('merges onto the existing completion doc rather than creating a second one', async () => {
    await setCompletionNote('h1', '2026-07-23', 'legs heavy but got out anyway');

    // The completion doc id is the date — the same document markHabitComplete wrote.
    expect(mockDoc).toHaveBeenCalledWith(
      { __db: true },
      'habits',
      'h1',
      'completions',
      '2026-07-23'
    );
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  test('writes only quickNote, leaving completedAt/source/completed untouched', async () => {
    await setCompletionNote('h1', '2026-07-23', 'hills felt easier');
    expect(mockSetDoc.mock.calls[0][1]).toEqual({ quickNote: 'hills felt easier' });
  });

  test('trims surrounding whitespace before writing', async () => {
    await setCompletionNote('h1', '2026-07-23', '   spaced out   ');
    expect(mockSetDoc.mock.calls[0][1]).toEqual({ quickNote: 'spaced out' });
  });

  test('clamps to MAX_QUICK_NOTE_LENGTH', async () => {
    await setCompletionNote('h1', '2026-07-23', 'x'.repeat(300));
    expect(mockSetDoc.mock.calls[0][1].quickNote).toHaveLength(MAX_QUICK_NOTE_LENGTH);
  });

  test('writes nothing at all for an empty or whitespace-only note', async () => {
    await setCompletionNote('h1', '2026-07-23', '    ');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('getCompletionNote', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  test('returns the stored note', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ quickNote: 'a note' }) });
    expect(await getCompletionNote('h1', '2026-07-23')).toBe('a note');
  });

  test('returns null when the completion has no note', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ completed: true }) });
    expect(await getCompletionNote('h1', '2026-07-23')).toBeNull();
  });

  test('returns null when the completion does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await getCompletionNote('h1', '2026-07-23')).toBeNull();
  });

  test('returns null rather than throwing when the read fails', async () => {
    mockGetDoc.mockRejectedValue(new Error('offline'));
    expect(await getCompletionNote('h1', '2026-07-23')).toBeNull();
  });
});
