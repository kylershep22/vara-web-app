// Mocks must precede the module-under-test import.

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

// Matches the AsyncStorage mock convention in this codebase (sessionMarker and
// firstShiftFooterMarker) — top-level methods, no __esModule wrapper. The
// default-imported value resolves to this object through Babel's
// _interopRequireDefault when __esModule is absent.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
}));

import {
  _START_HERE_MARKER_KEY_PREFIX,
  _startHereMarkerKeyFor,
  readStartHereMarker,
  writeStartHereMarker,
} from '../startHereCollapseMarker';
import { logger } from '../logger';

const USER_A = 'user-aaa-111';
const USER_B = 'user-bbb-222';

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

describe('the key', () => {
  it('carries both the surface and the user id', () => {
    expect(_startHereMarkerKeyFor('practices', USER_A)).toBe(
      `${_START_HERE_MARKER_KEY_PREFIX}:practices:${USER_A}`
    );
  });

  it('differs by user on the same surface', () => {
    // THE DEFECT THIS SCOPING EXISTS TO AVOID. A device-global key silently
    // no-ops for the second account on a device: account switches, shared
    // devices, reinstalls, and every fresh test user during development.
    // firstShiftFooterMarker shipped that way and had to be re-scoped in its
    // Round 8; useNotificationOptInCards.ts:27 is still keyed that way and is a
    // known separate defect, queued rather than fixed here.
    expect(_startHereMarkerKeyFor('practices', USER_A)).not.toBe(
      _startHereMarkerKeyFor('practices', USER_B)
    );
  });

  it('differs by surface for the same user', () => {
    // One shared key would answer slice 7's question by accident: opening the
    // video on Practices would collapse a row on Today the user has never seen.
    expect(_startHereMarkerKeyFor('practices', USER_A)).not.toBe(
      _startHereMarkerKeyFor('today', USER_A)
    );
  });
});

describe('writeStartHereMarker', () => {
  it('writes the timestamp as a string under the scoped key', async () => {
    await writeStartHereMarker('practices', USER_A, 1_700_000_000_000);

    expect(mockSetItem).toHaveBeenCalledWith(
      _startHereMarkerKeyFor('practices', USER_A),
      '1700000000000'
    );
  });

  it('warns and resolves when the write fails', async () => {
    // Persistence is opportunistic. A failed write costs one more expanded
    // render and must never reject into the press handler that caused it.
    mockSetItem.mockRejectedValue(new Error('disk full'));

    await expect(
      writeStartHereMarker('practices', USER_A, 1)
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('readStartHereMarker', () => {
  it('returns null when nothing has been stored', async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(readStartHereMarker('practices', USER_A)).resolves.toBeNull();
  });

  it('returns the stored timestamp', async () => {
    mockGetItem.mockResolvedValue('1700000000000');

    await expect(readStartHereMarker('practices', USER_A)).resolves.toBe(
      1_700_000_000_000
    );
  });

  it('reads from the scoped key', async () => {
    mockGetItem.mockResolvedValue(null);

    await readStartHereMarker('today', USER_B);

    expect(mockGetItem).toHaveBeenCalledWith(
      _startHereMarkerKeyFor('today', USER_B)
    );
  });

  it('ignores a non-numeric value rather than collapsing on it', async () => {
    // A junk value means the marker is unreadable, not that the user has
    // watched the video. Treating it as collapsed would hide the gloss from
    // someone who has never opened it.
    mockGetItem.mockResolvedValue('nonsense');

    await expect(readStartHereMarker('practices', USER_A)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('warns and returns null when the read throws', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'));

    await expect(readStartHereMarker('practices', USER_A)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
