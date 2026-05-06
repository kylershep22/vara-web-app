// Mocks must precede the module-under-test import.

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

// Match the existing AsyncStorage mock convention in this codebase
// (see sessionMarker.test.ts) — top-level methods, no __esModule
// wrapper. The default-imported AsyncStorage value resolves to this
// object via Babel's _interopRequireDefault when __esModule is absent.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
}));

import {
  _FIRST_SHIFT_FOOTER_MARKER_KEY_PREFIX,
  _firstShiftFooterMarkerKeyFor,
  readMarker,
  writeMarker,
} from '../firstShiftFooterMarker';
import { logger } from '../logger';

const TEST_USER_ID = 'user-abc-123';

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  mockSetItem.mockReset();
  mockGetItem.mockReset();
  mockSetItem.mockResolvedValue(undefined);
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('writeMarker', () => {
  it('writes the timestamp string under a userId-scoped key', async () => {
    await writeMarker(TEST_USER_ID, 1_700_000_000_000);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem.mock.calls[0][0]).toBe(
      _firstShiftFooterMarkerKeyFor(TEST_USER_ID)
    );
    expect(mockSetItem.mock.calls[0][1]).toBe('1700000000000');
  });

  it('round-8 marker scoping: key includes userId, prefixed with the canonical prefix', async () => {
    await writeMarker(TEST_USER_ID, 1);
    const key = mockSetItem.mock.calls[0][0] as string;
    expect(key.startsWith(_FIRST_SHIFT_FOOTER_MARKER_KEY_PREFIX)).toBe(true);
    expect(key).toContain(TEST_USER_ID);
    // Two different userIds produce different keys.
    await writeMarker('other-user', 2);
    const otherKey = mockSetItem.mock.calls[1][0] as string;
    expect(otherKey).not.toBe(key);
    expect(otherKey).toContain('other-user');
  });

  it('swallows storage errors and logs a warning', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(writeMarker(TEST_USER_ID, 123)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/writeMarker failed/);
  });
});

describe('readMarker', () => {
  it('returns null when nothing is stored for that user', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(readMarker(TEST_USER_ID)).resolves.toBeNull();
  });

  it('round-trips a previously written timestamp', async () => {
    mockGetItem.mockResolvedValueOnce('1700000000000');
    await expect(readMarker(TEST_USER_ID)).resolves.toBe(1_700_000_000_000);
  });

  it('returns null on non-numeric stored value and logs a warning', async () => {
    mockGetItem.mockResolvedValueOnce('not a number');
    await expect(readMarker(TEST_USER_ID)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('swallows storage errors and returns null', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage offline'));
    await expect(readMarker(TEST_USER_ID)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('reads from the userId-scoped key', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await readMarker(TEST_USER_ID);
    expect(mockGetItem.mock.calls[0][0]).toBe(
      _firstShiftFooterMarkerKeyFor(TEST_USER_ID)
    );
  });
});

describe('round-trip integration', () => {
  it('write → read for the same user returns the same timestamp', async () => {
    const stored: Record<string, string> = {};
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      stored[key] = value;
    });
    mockGetItem.mockImplementation(async (key: string) => stored[key] ?? null);

    await writeMarker(TEST_USER_ID, 1_700_000_000_000);
    const recovered = await readMarker(TEST_USER_ID);
    expect(recovered).toBe(1_700_000_000_000);
  });

  it('round-8 scoping: read for a DIFFERENT user returns null even if another user wrote first', async () => {
    const stored: Record<string, string> = {};
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      stored[key] = value;
    });
    mockGetItem.mockImplementation(async (key: string) => stored[key] ?? null);

    // User A writes their marker.
    await writeMarker('user-a', 1_700_000_000_000);
    // User B reads — should NOT see user A's marker. This is the
    // round-8 fix: prior implementation used a device-global key,
    // which silently no-op'd the footer for any second user on the
    // same device.
    await expect(readMarker('user-b')).resolves.toBeNull();
    // But user A still sees their own marker.
    await expect(readMarker('user-a')).resolves.toBe(1_700_000_000_000);
  });
});
