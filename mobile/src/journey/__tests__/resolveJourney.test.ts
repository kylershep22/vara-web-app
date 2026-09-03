// The resolver ladder and its migration branch (journey slice 2).
//
// THE RUNG ORDER IS THE PRODUCT, so every test below names the rung it is
// pinning. Two failures this suite exists to make loud:
//
//   1. A GUESSED DESTINATION. Rung (d) must fall through to 'legacy' and must
//      NOT default to 'focus'. A wrong destination is invisible to the user and
//      is what the whole product is organised around.
//   2. A UID IN A LOG LINE. The fallback warning names a digest, never the uid.
const mockGetJourneyState = jest.fn();
const mockCreateJourneyState = jest.fn();
jest.mock('../../services/firebase/journeyState.service', () => ({
  getJourneyState: (...a: any[]) => mockGetJourneyState(...a),
  createJourneyState: (...a: any[]) => mockCreateJourneyState(...a),
}));

const mockGetLatestCycle = jest.fn();
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
}));

const mockGetUserPrivate = jest.fn();
jest.mock('../../services/firebase/userPrivate.service', () => ({
  getUserPrivate: (...a: any[]) => mockGetUserPrivate(...a),
}));

const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

const mockWarn = jest.fn();
const mockError = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: (...a: any[]) => mockWarn(...a), error: (...a: any[]) => mockError(...a) },
}));

import { destinationForOutcome, resolveJourney, uidDigest } from '../resolveJourney';
import { legacyPhaseFor } from '../../protocolEngine';

const UID = 'alice123';

/** A stored journey state, as getJourneyState returns it. */
const state = (over: Record<string, unknown> = {}) => ({
  id: UID,
  userId: UID,
  destination: 'focus',
  phaseKey: 'remove',
  enteredAt: { seconds: 100 },
  history: [],
  skipped: [],
  advanceOfferedAt: null,
  advanceDeclinedAt: null,
  adjustOfferedAt: null,
  adjustDeclinedAt: null,
  createdAt: { seconds: 100 },
  updatedAt: { toMillis: () => 1_700_000_000_000 },
  ...over,
});

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  userId: UID,
  weekStart: '2026-08-03',
  outcome: 'focus',
  capacityInitial: 'normal',
  capacityCurrent: 'normal',
  protocolId: 'focus-normal',
  ...over,
});

describe('the vocabulary bridge', () => {
  test('stress maps to calm', () => {
    expect(destinationForOutcome('stress')).toBe('calm');
  });

  test('the other three are identities', () => {
    for (const key of ['focus', 'routines', 'energy'] as const) {
      expect(destinationForOutcome(key)).toBe(key);
    }
  });

  test('legacyOutcomeFor IS GONE, and its replacement is not its inverse', () => {
    // Slice 3a removed the destination -> OutcomeKey direction entirely: the
    // engine speaks phase natively, so nothing needs to translate back.
    //
    // What remains is legacyPhaseFor, outcome -> PhaseKey, and it is LOSSY on
    // purpose: three outcomes collapse onto 'recover' because their content
    // did. Asserted here so nobody reads the two functions as a round-trip
    // pair and reintroduces the shim to "restore" it.
    expect(legacyPhaseFor('focus')).toBe('refocus');
    for (const key of ['stress', 'routines', 'energy'] as const) {
      expect(legacyPhaseFor(key)).toBe('recover');
    }
    expect(new Set(['stress', 'routines', 'energy'].map(legacyPhaseFor as any)).size).toBe(1);
  });
});

describe('uidDigest', () => {
  test('is stable, short, and not the uid', () => {
    expect(uidDigest(UID)).toBe(uidDigest(UID));
    expect(uidDigest(UID)).toHaveLength(8);
    expect(uidDigest(UID)).not.toContain(UID);
  });

  test('distinguishes two users', () => {
    expect(uidDigest('alice123')).not.toBe(uidDigest('bob456'));
  });
});

describe('resolveJourney', () => {
  beforeEach(() => {
    mockGetJourneyState.mockReset().mockResolvedValue(null);
    mockCreateJourneyState.mockReset().mockResolvedValue(undefined);
    mockGetLatestCycle.mockReset().mockResolvedValue(null);
    mockGetUserPrivate.mockReset().mockResolvedValue(null);
    mockLogEvent.mockReset();
    mockWarn.mockReset();
    mockError.mockReset();
  });

  // ---- rung (a) ----

  describe('rung (a): a journey already exists', () => {
    test("resolves 'today' from the stored state", async () => {
      mockGetJourneyState.mockResolvedValue(state({ destination: 'calm', phaseKey: 'rewire' }));
      const result = await resolveJourney(UID);

      expect(result.target).toBe('today');
      expect(result.target === 'today' && result.phase.destination).toBe('calm');
      expect(result.target === 'today' && result.phase.phaseKey).toBe('rewire');
    });

    test('WRITES NOTHING. An existing journey is never re-created', async () => {
      mockGetJourneyState.mockResolvedValue(state());
      await resolveJourney(UID);

      expect(mockCreateJourneyState).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('reads capacitySeed off the latest cycle (shim 2)', async () => {
      mockGetJourneyState.mockResolvedValue(state());
      mockGetLatestCycle.mockResolvedValue(cycle({ capacityInitial: 'slammed' }));
      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.capacitySeed).toBe('slammed');
    });

    test("falls back to 'normal' when there is no cycle to seed from", async () => {
      mockGetJourneyState.mockResolvedValue(state());
      mockGetLatestCycle.mockResolvedValue(null);
      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.capacitySeed).toBe('normal');
    });

    test('revisionToken comes from updatedAt millis', async () => {
      mockGetJourneyState.mockResolvedValue(state());
      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.revisionToken).toBe(1_700_000_000_000);
    });

    test('revisionToken tolerates a raw {seconds} timestamp', async () => {
      mockGetJourneyState.mockResolvedValue(state({ updatedAt: { seconds: 1700 } }));
      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.revisionToken).toBe(1_700_000);
    });

    test('revisionToken is 0 for an unresolved serverTimestamp', async () => {
      mockGetJourneyState.mockResolvedValue(state({ updatedAt: null }));
      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.revisionToken).toBe(0);
    });
  });

  // ---- rung (b) ----

  describe('rung (b): migrate from the latest weekly cycle', () => {
    test('creates a journey at phase remove, from the cycle outcome', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'routines' }));
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'routines' })
      );

      const result = await resolveJourney(UID);

      expect(mockCreateJourneyState).toHaveBeenCalledWith(UID, {
        destination: 'routines',
        phaseKey: 'remove',
      });
      expect(result.target).toBe('today');
    });

    test("MAPS stress TO calm. The one asymmetric pair", async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'stress' }));
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'calm' })
      );

      await resolveJourney(UID);

      expect(mockCreateJourneyState).toHaveBeenCalledWith(UID, {
        destination: 'calm',
        phaseKey: 'remove',
      });
    });

    test("logs journey_state_created with source 'migration_cycle'", async () => {
      mockGetLatestCycle.mockResolvedValue(cycle());
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(state());

      await resolveJourney(UID);

      expect(mockLogEvent).toHaveBeenCalledWith(UID, 'journey_state_created', {
        source: 'migration_cycle',
      });
    });

    test('BEATS activeOutcome when both exist', async () => {
      // The cycle is a choice the user re-made every week; activeOutcome is one
      // write from the onboarding terminal that nothing has read since.
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'energy' }));
      mockGetUserPrivate.mockResolvedValue({ uid: UID, activeOutcome: 'focus' });
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'energy' })
      );

      await resolveJourney(UID);

      expect(mockCreateJourneyState).toHaveBeenCalledWith(UID, {
        destination: 'energy',
        phaseKey: 'remove',
      });
      // Not even read: the cycle answered first.
      expect(mockGetUserPrivate).not.toHaveBeenCalled();
    });

    test('re-reads the created document rather than synthesising it', async () => {
      // enteredAt and updatedAt are serverTimestamp sentinels at write time, so
      // revisionToken is only knowable from a read-back.
      mockGetLatestCycle.mockResolvedValue(cycle());
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(state());

      await resolveJourney(UID);

      expect(mockGetJourneyState).toHaveBeenCalledTimes(2);
    });
  });

  // ---- rung (c) ----

  describe('rung (c): migrate from userPrivate.activeOutcome', () => {
    test('creates a journey when there is no cycle', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      mockGetUserPrivate.mockResolvedValue({ uid: UID, activeOutcome: 'stress' });
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'calm' })
      );

      const result = await resolveJourney(UID);

      expect(mockCreateJourneyState).toHaveBeenCalledWith(UID, {
        destination: 'calm',
        phaseKey: 'remove',
      });
      expect(result.target).toBe('today');
    });

    test("logs source 'migration_active_outcome'", async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      mockGetUserPrivate.mockResolvedValue({ uid: UID, activeOutcome: 'focus' });
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(state());

      await resolveJourney(UID);

      expect(mockLogEvent).toHaveBeenCalledWith(UID, 'journey_state_created', {
        source: 'migration_active_outcome',
      });
    });

    test('is reached when a cycle exists but carries no outcome', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: undefined }));
      mockGetUserPrivate.mockResolvedValue({ uid: UID, activeOutcome: 'routines' });
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'routines' })
      );

      await resolveJourney(UID);

      expect(mockCreateJourneyState).toHaveBeenCalledWith(UID, {
        destination: 'routines',
        phaseKey: 'remove',
      });
    });
  });

  // ---- rung (d) ----

  describe('rung (d): nothing to migrate from', () => {
    test("resolves 'legacy' and NEVER guesses a destination", async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      mockGetUserPrivate.mockResolvedValue(null);

      const result = await resolveJourney(UID);

      expect(result).toEqual({ target: 'legacy' });
      expect(mockCreateJourneyState).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test("does NOT default to 'focus'", async () => {
      // Named separately from the test above because 'focus' is the first key
      // in every list in this codebase and is exactly what a careless default
      // would pick.
      mockGetLatestCycle.mockResolvedValue(null);
      mockGetUserPrivate.mockResolvedValue({ uid: UID });

      const result = await resolveJourney(UID);

      expect(result.target).toBe('legacy');
      expect(JSON.stringify(mockCreateJourneyState.mock.calls)).not.toContain('focus');
    });

    test('warns with a DIGEST, never the uid', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      mockGetUserPrivate.mockResolvedValue(null);

      await resolveJourney(UID);

      expect(mockWarn).toHaveBeenCalled();
      const logged = JSON.stringify(mockWarn.mock.calls);
      expect(logged).toContain(uidDigest(UID));
      expect(logged).not.toContain(UID);
    });
  });

  // ---- failure ----

  describe('failure is always legacy, never a thrown resolver', () => {
    test("a failed read resolves 'legacy'", async () => {
      mockGetJourneyState.mockRejectedValue(new Error('offline'));

      expect(await resolveJourney(UID)).toEqual({ target: 'legacy' });
      expect(mockError).toHaveBeenCalled();
    });

    test("a failed create resolves 'legacy'", async () => {
      mockGetLatestCycle.mockResolvedValue(cycle());
      mockCreateJourneyState.mockRejectedValue(new Error('permission-denied'));

      expect(await resolveJourney(UID)).toEqual({ target: 'legacy' });
    });

    test("a create that does not read back resolves 'legacy'", async () => {
      mockGetLatestCycle.mockResolvedValue(cycle());
      mockGetJourneyState.mockResolvedValue(null);

      expect(await resolveJourney(UID)).toEqual({ target: 'legacy' });
    });
  });
});
