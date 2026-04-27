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
  _FIRST_SHIFT_FOOTER_MARKER_KEY,
  readMarker,
  writeMarker,
} from '../firstShiftFooterMarker';
import { logger } from '../logger';

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
  it('writes the timestamp string to the canonical key', async () => {
    await writeMarker(1_700_000_000_000);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem.mock.calls[0][0]).toBe(_FIRST_SHIFT_FOOTER_MARKER_KEY);
    expect(mockSetItem.mock.calls[0][1]).toBe('1700000000000');
  });

  it('swallows storage errors and logs a warning', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(writeMarker(123)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/writeMarker failed/);
  });
});

describe('readMarker', () => {
  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(readMarker()).resolves.toBeNull();
  });

  it('round-trips a previously written timestamp', async () => {
    mockGetItem.mockResolvedValueOnce('1700000000000');
    await expect(readMarker()).resolves.toBe(1_700_000_000_000);
  });

  it('returns null on non-numeric stored value and logs a warning', async () => {
    mockGetItem.mockResolvedValueOnce('not a number');
    await expect(readMarker()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('swallows storage errors and returns null', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage offline'));
    await expect(readMarker()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('round-trip integration', () => {
  it('write → read returns the same timestamp', async () => {
    let stored: string | null = null;
    mockSetItem.mockImplementation(async (_key, value: string) => {
      stored = value;
    });
    mockGetItem.mockImplementation(async () => stored);

    await writeMarker(1_700_000_000_000);
    const recovered = await readMarker();
    expect(recovered).toBe(1_700_000_000_000);
  });
});
