// focusSession.service — persisted active-session record + stable-id finalize
// (B-3c.2 commit 2). Mocks precede the module-under-test import.

const mockSetItem = jest.fn((_k: string, _v: string) => Promise.resolve());
const mockGetItem = jest.fn((_k: string) => Promise.resolve(null as string | null));
const mockRemoveItem = jest.fn((_k: string) => Promise.resolve());

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
  removeItem: (key: string) => mockRemoveItem(key),
}));

const mockSetDoc = jest.fn((..._a: unknown[]) => Promise.resolve());
const mockDoc = jest.fn((...args: unknown[]): unknown => ({ __ref: args }));
const mockCollection = jest.fn((_db: unknown, name: string): unknown => ({ __coll: name }));
jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => '__TS__',
}));

jest.mock('../../../config/firebase', () => ({ db: { __mock: true } }));
jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

import {
  _FOCUS_SESSION_ACTIVE_KEY,
  clearActiveFocusSession,
  finalizeFocusSession,
  getActiveFocusSession,
  isFocusSessionElapsed,
  mintFocusSessionId,
  saveActiveFocusSession,
  type ActiveFocusSession,
} from '../focusSession.service';

const sample: ActiveFocusSession = {
  focusSessionId: 'fs-abc',
  userId: 'u1',
  durationMinutes: 25,
  type: 'pomodoro',
  taskLabel: 'Writing',
  startedAt: 1_700_000_000_000,
  endsAt: 1_700_000_000_000 + 25 * 60_000,
};

beforeEach(() => {
  mockSetItem.mockClear();
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
  mockRemoveItem.mockClear();
  mockSetDoc.mockClear();
  mockDoc.mockClear();
  mockCollection.mockClear();
});

describe('mintFocusSessionId', () => {
  it('returns an id from an unwritten focusSessions doc ref', () => {
    mockDoc.mockReturnValueOnce({ id: 'minted-123' });
    const id = mintFocusSessionId();
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'focusSessions');
    expect(id).toBe('minted-123');
    // Minting must NOT write anything.
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('active-session record persistence', () => {
  it('saves the record as JSON under the active key', async () => {
    await saveActiveFocusSession(sample);
    expect(mockSetItem).toHaveBeenCalledWith(
      _FOCUS_SESSION_ACTIVE_KEY,
      JSON.stringify(sample)
    );
  });

  it('round-trips the record back from storage', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(sample));
    const got = await getActiveFocusSession();
    expect(got).toEqual(sample);
  });

  it('returns null when no record is stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    expect(await getActiveFocusSession()).toBeNull();
  });

  it('returns null (does not throw) on a malformed record', async () => {
    mockGetItem.mockResolvedValueOnce('{"focusSessionId":123}');
    expect(await getActiveFocusSession()).toBeNull();
  });

  it('clears the record', async () => {
    await clearActiveFocusSession();
    expect(mockRemoveItem).toHaveBeenCalledWith(_FOCUS_SESSION_ACTIVE_KEY);
  });
});

describe('finalizeFocusSession', () => {
  it('writes the completed row to the stable focusSessions id via merge setDoc', async () => {
    const ref = { __ref: 'focusSessions/fs-abc' };
    mockDoc.mockReturnValueOnce(ref);
    await finalizeFocusSession({
      focusSessionId: 'fs-abc',
      userId: 'u1',
      durationMinutes: 25,
      type: 'pomodoro',
      taskLabel: 'Writing',
    });
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'focusSessions', 'fs-abc');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [passedRef, data, options] = mockSetDoc.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(passedRef).toBe(ref);
    expect(data).toEqual(
      expect.objectContaining({
        userId: 'u1',
        duration: 25,
        type: 'pomodoro',
        completed: true,
        taskLabel: 'Writing',
        interrupted: false,
      })
    );
    expect(options).toEqual({ merge: true });
  });
});

describe('isFocusSessionElapsed', () => {
  it('is true once the scheduled end has passed', () => {
    expect(isFocusSessionElapsed(sample, sample.endsAt + 1)).toBe(true);
    expect(isFocusSessionElapsed(sample, sample.endsAt)).toBe(true);
  });
  it('is false before the scheduled end', () => {
    expect(isFocusSessionElapsed(sample, sample.endsAt - 1)).toBe(false);
  });
});
