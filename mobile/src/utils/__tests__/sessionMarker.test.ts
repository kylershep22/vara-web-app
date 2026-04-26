// Mocks must precede the module-under-test import.

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();

// Match the existing AsyncStorage mock convention in this codebase
// (see DashboardAnchor.test.tsx) — top-level methods, no __esModule
// wrapper. The default-imported AsyncStorage value resolves to this
// object via Babel's _interopRequireDefault when __esModule is absent.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
  removeItem: (key: string) => mockRemoveItem(key),
}));

import {
  _SESSION_MARKER_MAX_AGE_MS,
  _SESSION_MARKER_STORAGE_KEY,
  buildRecoveredSummary,
  clearMarker,
  isExpired,
  readMarker,
  writeMarker,
  type SessionMarker,
} from '../sessionMarker';
import { logger } from '../logger';

const sampleMarker: SessionMarker = {
  protocolId: 'cyclic-sighing-2',
  stateBefore: 'wired',
  startedAt: 1_700_000_000_000,
  lastUpdatedAt: 1_700_000_000_000 + 30_000,
  currentStepIndex: 0,
  stepsCompleted: 0,
  totalSteps: 1,
};

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  mockSetItem.mockReset();
  mockGetItem.mockReset();
  mockRemoveItem.mockReset();
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('writeMarker', () => {
  it('writes the JSON-serialized marker to the canonical key', async () => {
    await writeMarker(sampleMarker);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem.mock.calls[0][0]).toBe(_SESSION_MARKER_STORAGE_KEY);
    expect(JSON.parse(mockSetItem.mock.calls[0][1])).toEqual(sampleMarker);
  });

  it('swallows storage errors and logs a warning', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(writeMarker(sampleMarker)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/writeMarker failed/);
  });
});

describe('readMarker', () => {
  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(readMarker()).resolves.toBeNull();
  });

  it('round-trips a previously written marker', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(sampleMarker));
    await expect(readMarker()).resolves.toEqual(sampleMarker);
  });

  it('returns null on malformed JSON and logs a warning', async () => {
    mockGetItem.mockResolvedValueOnce('not valid json');
    await expect(readMarker()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when stored object is missing required fields', async () => {
    const partial = { protocolId: 'cyclic-sighing-2' };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(partial));
    await expect(readMarker()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when a field has the wrong type', async () => {
    const wrongType = {
      ...sampleMarker,
      stepsCompleted: 'not-a-number',
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(wrongType));
    await expect(readMarker()).resolves.toBeNull();
  });

  it('swallows storage errors and returns null', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage offline'));
    await expect(readMarker()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('clearMarker', () => {
  it('removes the marker at the canonical key', async () => {
    await clearMarker();
    expect(mockRemoveItem).toHaveBeenCalledWith(_SESSION_MARKER_STORAGE_KEY);
  });

  it('swallows storage errors and logs a warning', async () => {
    mockRemoveItem.mockRejectedValueOnce(new Error('locked'));
    await expect(clearMarker()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('isExpired', () => {
  it('returns false when marker.startedAt is within MAX_AGE_MS of now', () => {
    const now = sampleMarker.startedAt + _SESSION_MARKER_MAX_AGE_MS - 1;
    expect(isExpired(sampleMarker, now)).toBe(false);
  });

  it('returns true when marker.startedAt is older than MAX_AGE_MS', () => {
    const now = sampleMarker.startedAt + _SESSION_MARKER_MAX_AGE_MS + 1;
    expect(isExpired(sampleMarker, now)).toBe(true);
  });

  it('returns false at exactly MAX_AGE_MS (boundary)', () => {
    const now = sampleMarker.startedAt + _SESSION_MARKER_MAX_AGE_MS;
    expect(isExpired(sampleMarker, now)).toBe(false);
  });
});

describe('buildRecoveredSummary', () => {
  it('produces a force_quit summary from marker fields', () => {
    const summary = buildRecoveredSummary(sampleMarker);
    expect(summary).toEqual({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      completed: false,
      durationActualSeconds: 30,
      stepsCompleted: 0,
      totalSteps: 1,
      abandonReason: 'force_quit',
      startedAt: sampleMarker.startedAt,
      endedAt: sampleMarker.lastUpdatedAt,
    });
  });

  it('clamps a negative duration to zero (defensive against bad clocks)', () => {
    const marker: SessionMarker = {
      ...sampleMarker,
      lastUpdatedAt: sampleMarker.startedAt - 5_000,
    };
    const summary = buildRecoveredSummary(marker);
    expect(summary.durationActualSeconds).toBe(0);
  });

  it('floors the duration so partial seconds are not over-counted', () => {
    const marker: SessionMarker = {
      ...sampleMarker,
      lastUpdatedAt: sampleMarker.startedAt + 30_950,
    };
    const summary = buildRecoveredSummary(marker);
    expect(summary.durationActualSeconds).toBe(30);
  });

  it('preserves stepsCompleted and totalSteps from the marker', () => {
    const marker: SessionMarker = {
      ...sampleMarker,
      stepsCompleted: 3,
      totalSteps: 5,
    };
    const summary = buildRecoveredSummary(marker);
    expect(summary.stepsCompleted).toBe(3);
    expect(summary.totalSteps).toBe(5);
  });
});

describe('round-trip integration', () => {
  it('write → read returns the same marker', async () => {
    let stored: string | null = null;
    mockSetItem.mockImplementation(async (_key, value: string) => {
      stored = value;
    });
    mockGetItem.mockImplementation(async () => stored);

    await writeMarker(sampleMarker);
    const recovered = await readMarker();
    expect(recovered).toEqual(sampleMarker);
  });

  it('write → clear → read returns null', async () => {
    let stored: string | null = null;
    mockSetItem.mockImplementation(async (_key, value: string) => {
      stored = value;
    });
    mockRemoveItem.mockImplementation(async () => {
      stored = null;
    });
    mockGetItem.mockImplementation(async () => stored);

    await writeMarker(sampleMarker);
    await clearMarker();
    const recovered = await readMarker();
    expect(recovered).toBeNull();
  });
});
