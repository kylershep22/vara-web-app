// Mocks must precede the module-under-test import.

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItem: (key: string) => mockGetItem(key),
  removeItem: (key: string) => mockRemoveItem(key),
}));

import {
  _FLOW_SESSION_MARKER_MAX_AGE_MS,
  _FLOW_SESSION_MARKER_STORAGE_KEY,
  clearMarker,
  isExpired,
  readMarker,
  readMarkerForRecoveryOffer,
  writeMarker,
  type FlowSessionMarker,
} from '../flowSessionMarker';
import { logger } from '../logger';

const sampleMarker: FlowSessionMarker = {
  protocolId: 'cyclic-sighing-2',
  stateBefore: 'wired',
  timeWindowSelected: 2,
  sessionStartedAt: 1_700_000_000_000,
  sessionEndedAt: 1_700_000_000_000 + 120_000,
  durationActualSeconds: 120,
  intentPath: 'default',
  entrySource: 'standard',
  recoveryOfferedAt: null,
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

// ────────────────────────────────────────────────────────────
// Storage primitives
// ────────────────────────────────────────────────────────────

describe('writeMarker', () => {
  it('writes the JSON-serialized marker to the canonical key', async () => {
    await writeMarker(sampleMarker);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem.mock.calls[0][0]).toBe(_FLOW_SESSION_MARKER_STORAGE_KEY);
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
      sessionStartedAt: 'not-a-number',
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(wrongType));
    await expect(readMarker()).resolves.toBeNull();
  });

  it('accepts recoveryOfferedAt as null OR number', async () => {
    const offered = { ...sampleMarker, recoveryOfferedAt: 1_700_000_500_000 };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(offered));
    await expect(readMarker()).resolves.toEqual(offered);
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
    expect(mockRemoveItem).toHaveBeenCalledWith(
      _FLOW_SESSION_MARKER_STORAGE_KEY
    );
  });

  it('swallows storage errors and logs a warning', async () => {
    mockRemoveItem.mockRejectedValueOnce(new Error('locked'));
    await expect(clearMarker()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────
// isExpired — anchored to sessionEndedAt
// ────────────────────────────────────────────────────────────

describe('isExpired', () => {
  it('returns false when sessionEndedAt is within MAX_AGE_MS of now', () => {
    const now = sampleMarker.sessionEndedAt + _FLOW_SESSION_MARKER_MAX_AGE_MS - 1;
    expect(isExpired(sampleMarker, now)).toBe(false);
  });

  it('returns true when sessionEndedAt is older than MAX_AGE_MS', () => {
    const now = sampleMarker.sessionEndedAt + _FLOW_SESSION_MARKER_MAX_AGE_MS + 1;
    expect(isExpired(sampleMarker, now)).toBe(true);
  });

  it('returns false at exactly MAX_AGE_MS (boundary)', () => {
    const now = sampleMarker.sessionEndedAt + _FLOW_SESSION_MARKER_MAX_AGE_MS;
    expect(isExpired(sampleMarker, now)).toBe(false);
  });

  it('uses sessionEndedAt as the anchor (not sessionStartedAt)', () => {
    // Construct a marker where sessionStartedAt is 25 minutes ago but
    // sessionEndedAt is 1 minute ago (a 24-minute protocol that just
    // ended). The 30-min timeout should NOT consider this expired —
    // the player JUST finished, even though the session began earlier.
    const recentEnd: FlowSessionMarker = {
      ...sampleMarker,
      sessionStartedAt: 1_700_000_000_000,
      sessionEndedAt: 1_700_000_000_000 + 24 * 60 * 1000,
    };
    const now = recentEnd.sessionEndedAt + 60 * 1000; // 1 min after end
    expect(isExpired(recentEnd, now)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// readMarkerForRecoveryOffer — recovery-offer policy
// ────────────────────────────────────────────────────────────

describe('readMarkerForRecoveryOffer', () => {
  it('returns null when no marker is present', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(
      readMarkerForRecoveryOffer(sampleMarker.sessionEndedAt + 60_000)
    ).resolves.toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('within timeout AND recoveryOfferedAt null: writes back with recoveryOfferedAt set, returns marker', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(sampleMarker));
    const now = sampleMarker.sessionEndedAt + 60_000; // 1 min after end
    const result = await readMarkerForRecoveryOffer(now);

    expect(result).not.toBeNull();
    expect(result?.recoveryOfferedAt).toBe(now);
    // Marker was rewritten with recoveryOfferedAt set.
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(written.recoveryOfferedAt).toBe(now);
    // No clear in the eligible branch.
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('outside timeout: silent clear, returns null', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify(sampleMarker));
    const now =
      sampleMarker.sessionEndedAt + _FLOW_SESSION_MARKER_MAX_AGE_MS + 1;
    const result = await readMarkerForRecoveryOffer(now);

    expect(result).toBeNull();
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('within timeout BUT recoveryOfferedAt set: silent clear, returns null (one-shot guard)', async () => {
    // Force-quit-during-recovery-confirm scenario. The marker was
    // offered on a previous mount; we don't loop back through it.
    const alreadyOffered: FlowSessionMarker = {
      ...sampleMarker,
      recoveryOfferedAt: sampleMarker.sessionEndedAt + 30_000,
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(alreadyOffered));
    const now = sampleMarker.sessionEndedAt + 60_000;
    const result = await readMarkerForRecoveryOffer(now);

    expect(result).toBeNull();
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    // Importantly: not re-marked as offered (no setItem call).
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
