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
import { DESTINATION_KEYS, PHASE_ORDER } from '../../constants/journey';

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

    // THE CAPACITY SEED, RE-HOMED IN SLICE 4. These two tests MOVED here from
    // the shim they used to pin; they were not deleted and replaced, because
    // the fallback they describe is still live for every account created
    // before userPrivate.capacitySeed existed.
    test('reads capacitySeed off userPrivate, its home since slice 4', async () => {
      mockGetJourneyState.mockResolvedValue(state());
      mockGetUserPrivate.mockResolvedValue({ uid: UID, capacitySeed: 'limited' });
      mockGetLatestCycle.mockResolvedValue(cycle({ capacityInitial: 'slammed' }));

      const result = await resolveJourney(UID);

      // userPrivate wins outright: the cycle says slammed and is ignored.
      expect(result.target === 'today' && result.phase.capacitySeed).toBe('limited');
    });

    test('does not read the weekly cycle at all when userPrivate has a seed', async () => {
      // The fallback is LAZY, and this is what says so. Without it the read
      // could quietly return, costing every journey user a Firestore read per
      // resolve for a value that was never used.
      mockGetJourneyState.mockResolvedValue(state());
      mockGetUserPrivate.mockResolvedValue({ uid: UID, capacitySeed: 'limited' });

      await resolveJourney(UID);

      expect(mockGetLatestCycle).not.toHaveBeenCalled();
    });

    test('falls back to the latest cycle for an account with no seed yet', async () => {
      // EVERY BETA ACCOUNT IS THIS CASE until it re-onboards, which it never
      // does. Removing this fallback does not throw; it silently serves
      // 'normal' to all of them, which is the failure the roadmap section 3.4
      // amendment describes.
      mockGetJourneyState.mockResolvedValue(state());
      mockGetUserPrivate.mockResolvedValue({ uid: UID });
      mockGetLatestCycle.mockResolvedValue(cycle({ capacityInitial: 'slammed' }));

      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.phase.capacitySeed).toBe('slammed');
    });

    test("falls back to 'normal' when there is neither a seed nor a cycle", async () => {
      mockGetJourneyState.mockResolvedValue(state());
      mockGetUserPrivate.mockResolvedValue(null);
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

  // ---- rung (a): the read boundary (slice 7e) ----
  //
  // THE TYPES DO NOT PROTECT THIS RUNG AND THAT IS THE WHOLE SUBJECT. Both
  // fields are declared as closed unions on JourneyState, so every case below
  // is unreachable to the compiler and reachable from the Firebase console. The
  // casts are the point, not a shortcut: they are how a test reproduces a
  // document the app itself cannot write.
  //
  // EACH CASE ASSERTS THREE THINGS, and all three are load bearing. The target
  // is 'legacy', so Home keeps the surface it already had. The warn fires
  // ONCE - a resolver that warned per field would put two lines in Sentry for
  // one bad document. And the digest is logged rather than the uid, which is
  // the second failure the head of this file names.
  describe('rung (a): a document with keys nothing can render', () => {
    const malformed = (over: Record<string, unknown>) =>
      mockGetJourneyState.mockResolvedValue(state(over));

    const cases: Array<[string, Record<string, unknown>]> = [
      ['phaseKey absent', { phaseKey: undefined }],
      // VERBATIM FROM THE WALK. A trailing space typed into the console field,
      // which is what took Home down on `main` during slice 7b's walk. It is
      // the fixture rather than an illustration because it is the only one of
      // these five that has actually happened.
      ['phaseKey "remove " with a trailing space', { phaseKey: 'remove ' }],
      ['phaseKey outside the union', { phaseKey: 'reboot' }],
      ['destination absent', { destination: undefined }],
      ['destination outside the union', { destination: 'stress' }],
    ];

    test.each(cases)('%s resolves to legacy', async (_name, over) => {
      malformed(over);
      const result = await resolveJourney(UID);

      expect(result.target).toBe('legacy');
    });

    test.each(cases)('%s warns exactly once, on the digest', async (_name, over) => {
      malformed(over);
      await resolveJourney(UID);

      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn.mock.calls[0][1]).toBe(uidDigest(UID));
      expect(JSON.stringify(mockWarn.mock.calls[0])).not.toContain(UID);
    });

    // 'stress' IS THE ONE NEAR MISS WORTH ITS OWN ASSERTION. It is a real key
    // in the WEEKLY vocabulary and reads 'calm' in this one, so a document
    // carrying it looks correct to a human reading the console. It must not be
    // bridged here: destinationForOutcome exists for the migration rungs, where
    // a legacy outcome is being converted once, and reusing it at rung (a)
    // would silently rewrite a stored journey's destination on every read.
    test('an OutcomeKey in the destination field is not bridged, it is refused', async () => {
      malformed({ destination: 'stress' });
      const result = await resolveJourney(UID);

      expect(result.target).toBe('legacy');
      expect(mockCreateJourneyState).not.toHaveBeenCalled();
    });

    // THE GUARD MUST NOT WRITE. A read path that repaired the document would
    // hide the data problem the warning exists to surface, and would do it
    // from the one code path that runs on every launch.
    test('REPAIRS NOTHING. No write and no analytics event', async () => {
      malformed({ phaseKey: 'remove ' });
      await resolveJourney(UID);

      expect(mockCreateJourneyState).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    // The guard sits ahead of every other read off the document, so a malformed
    // row costs one Firestore read and not three. Asserted through the seed
    // reads because they are the observable half of that ordering.
    test('short-circuits BEFORE the capacity seed reads', async () => {
      malformed({ phaseKey: 'reboot' });
      await resolveJourney(UID);

      expect(mockGetUserPrivate).not.toHaveBeenCalled();
      expect(mockGetLatestCycle).not.toHaveBeenCalled();
    });

    // The other direction, and it is what stops the guard being vacuous: the
    // four valid phase keys and the four valid destinations all still resolve.
    test('all sixteen valid pairs still resolve to today, with no warning', async () => {
      for (const phaseKey of PHASE_ORDER) {
        for (const destination of DESTINATION_KEYS) {
          mockWarn.mockClear();
          mockGetJourneyState.mockResolvedValue(state({ phaseKey, destination }));
          const result = await resolveJourney(UID);

          expect(result.target).toBe('today');
          expect(mockWarn).not.toHaveBeenCalled();
        }
      }
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

    // THE ONCE-ONLY GUARD FOR A2. Home shows the route explanation while
    // `migratedFrom` is set, so "fires once" is a property of these two tests
    // together and of nothing else: no flag, no counter, no stored seen-field.
    // Testing only the first resolve would leave a screen that reappears on
    // every launch fully green.
    test('reports migratedFrom on the resolve that CREATES the journey', async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'stress' }));
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'calm' })
      );

      const result = await resolveJourney(UID);

      expect(result.target === 'today' && result.migratedFrom).toBe('migration_cycle');
    });

    test('reports NOTHING on the very next resolve, once the document exists', async () => {
      // Same account, second launch. Rung (a) answers, and the screen must not
      // come back. This is the assertion that fails if someone "fixes" the
      // resolver by reporting the source on every path.
      mockGetJourneyState.mockResolvedValue(state({ destination: 'calm' }));
      mockGetUserPrivate.mockResolvedValue({ uid: UID, capacitySeed: 'normal' });

      const result = await resolveJourney(UID);

      expect(result.target).toBe('today');
      expect(result.target === 'today' && result.migratedFrom).toBeUndefined();
      expect(mockCreateJourneyState).not.toHaveBeenCalled();
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
    });

    test('activeOutcome does not leak into the destination even though it is read', async () => {
      // THIS TEST REPLACES AN ASSERTION THAT userPrivate WAS NEVER READ. That
      // was true until slice 4 re-homed the capacity seed onto userPrivate, and
      // the resolver now reads that document on every path. The read economy
      // changed; the RULE did not, and the rule is what matters: when a cycle
      // outcome exists, activeOutcome contributes nothing to the destination.
      //
      // Pinned separately from the case above so that a future change to when
      // userPrivate is read cannot quietly turn the precedence rule green by
      // deleting the assertion that carries it.
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'energy' }));
      mockGetUserPrivate.mockResolvedValue({ uid: UID, activeOutcome: 'focus' });
      mockGetJourneyState.mockResolvedValueOnce(null).mockResolvedValueOnce(
        state({ destination: 'energy' })
      );

      await resolveJourney(UID);

      expect(mockLogEvent).toHaveBeenCalledWith(UID, 'journey_state_created', {
        source: 'migration_cycle',
      });
      const created = mockCreateJourneyState.mock.calls[0][1];
      expect(created.destination).toBe('energy');
      expect(created.destination).not.toBe('focus');
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
