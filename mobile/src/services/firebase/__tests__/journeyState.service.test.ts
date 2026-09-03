// The journeyStates persistence layer (journey slice 1).
//
// Same harness as dailyLog.service.test.ts: the ref echoes the arguments it
// was built from, so an assertion can tell which document a write addressed
// without the test having to reach into a real Firestore.
//
// WHAT THIS SUITE IS REALLY GUARDING is the offer reset. Every phase change
// has to clear all four offer/decline timestamps, and forgetting one is
// silent: a stale advanceDeclinedAt would suppress the next phase's advance
// offer forever with nothing in the logs to say so. Each phase-change test
// asserts all four, deliberately, rather than trusting a spread.
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true, builtFrom: _a }));
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockSetDoc = jest.fn((..._a: any[]): any => undefined);
const mockUpdateDoc = jest.fn((..._a: any[]): any => undefined);
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  advancePhase,
  createJourneyState,
  getJourneyState,
  recordAdjustDeclined,
  recordAdjustOffered,
  recordAdvanceDeclined,
  recordAdvanceOffered,
  recordRemoveCapture,
  skipToPhase,
  stepBackToPhase,
} from '../journeyState.service';
import { PHASE_ORDER } from '../../../constants/journey';
import type { JourneyState, PhaseKey } from '../../../types/models';

const ALICE = 'alice123';
const absent = { exists: () => false };
const present = (data: Record<string, unknown>) => ({
  exists: () => true,
  data: () => data,
});

/** A stored state document, as getDoc returns it (no `id`; that comes from the uid). */
function stored(over: Partial<JourneyState> = {}): Record<string, unknown> {
  return {
    userId: ALICE,
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
    updatedAt: { seconds: 100 },
    ...over,
  };
}

/** The patch handed to updateDoc by the call under test. */
const patch = () => mockUpdateDoc.mock.calls[0][1] as Record<string, any>;

const ALL_OFFER_FIELDS = [
  'advanceOfferedAt',
  'advanceDeclinedAt',
  'adjustOfferedAt',
  'adjustDeclinedAt',
];

describe('journeyState.service', () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockGetDoc.mockReset();
    mockSetDoc.mockClear();
    mockUpdateDoc.mockClear();
  });

  describe('PHASE_ORDER is the sequence this service walks', () => {
    test('four phases, remove first and refocus last', () => {
      expect(PHASE_ORDER).toEqual(['remove', 'recover', 'rewire', 'refocus']);
    });
  });

  describe('getJourneyState', () => {
    test('addresses journeyStates/{uid}', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await getJourneyState(ALICE);
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'journeyStates', ALICE);
    });

    test('returns null before the user has started a journey', async () => {
      mockGetDoc.mockResolvedValue(absent);
      expect(await getJourneyState(ALICE)).toBeNull();
    });

    test('carries the uid onto the row as its id', async () => {
      mockGetDoc.mockResolvedValue(present(stored()));
      const state = await getJourneyState(ALICE);
      expect(state?.id).toBe(ALICE);
      expect(state?.phaseKey).toBe('remove');
    });
  });

  describe('createJourneyState', () => {
    test('writes journeyStates/{uid}', async () => {
      await createJourneyState(ALICE, { destination: 'calm', phaseKey: 'remove' });
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'journeyStates', ALICE);
    });

    test('stores the destination, the opening phase and the owner', async () => {
      await createJourneyState(ALICE, { destination: 'calm', phaseKey: 'remove' });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.destination).toBe('calm');
      expect(written.phaseKey).toBe('remove');
      expect(written.userId).toBe(ALICE);
    });

    test('opens with empty history and nothing skipped', async () => {
      await createJourneyState(ALICE, { destination: 'focus', phaseKey: 'remove' });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.history).toEqual([]);
      expect(written.skipped).toEqual([]);
    });

    test('opens with all four offer timestamps null', async () => {
      await createJourneyState(ALICE, { destination: 'focus', phaseKey: 'remove' });
      const written = mockSetDoc.mock.calls[0][1];
      for (const field of ALL_OFFER_FIELDS) {
        expect(written[field]).toBeNull();
      }
    });

    test('stores NO counter of any kind', async () => {
      // Section 3.1: counters are derived, never stored. A consistentDays
      // field appearing here is the regression this test exists to catch.
      await createJourneyState(ALICE, { destination: 'focus', phaseKey: 'remove' });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written).not.toHaveProperty('consistentDays');
      expect(written).not.toHaveProperty('calendarDays');
    });

    test('does NOT merge, so starting over drops a previous run', async () => {
      await createJourneyState(ALICE, { destination: 'focus', phaseKey: 'remove' });
      expect(mockSetDoc.mock.calls[0][2]).toBeUndefined();
    });
  });

  describe('advancePhase', () => {
    test('moves to the next phase in PHASE_ORDER', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await advancePhase(ALICE);
      expect(patch().phaseKey).toBe('recover');
    });

    test('re-stamps enteredAt for the new phase', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'recover' })));
      await advancePhase(ALICE);
      expect(patch().enteredAt).toEqual({ __serverTimestamp: true });
    });

    test("closes the outgoing phase with exitReason 'advanced'", async () => {
      mockGetDoc.mockResolvedValue(
        present(stored({ phaseKey: 'recover', enteredAt: { seconds: 42 } as any }))
      );
      await advancePhase(ALICE);
      const entry = patch().history.at(-1);
      expect(entry.phaseKey).toBe('recover');
      expect(entry.enteredAt).toEqual({ seconds: 42 });
      expect(entry.exitReason).toBe('advanced');
      expect(entry.exitedAt).toBeInstanceOf(Date);
    });

    test('appends to history rather than replacing it', async () => {
      const existing = [
        { phaseKey: 'remove', enteredAt: {}, exitedAt: {}, exitReason: 'advanced' },
      ];
      mockGetDoc.mockResolvedValue(
        present(stored({ phaseKey: 'recover', history: existing as any }))
      );
      await advancePhase(ALICE);
      expect(patch().history).toHaveLength(2);
      expect(patch().history[0]).toBe(existing[0]);
    });

    test('RESETS all four offer timestamps', async () => {
      mockGetDoc.mockResolvedValue(
        present(
          stored({
            phaseKey: 'remove',
            advanceOfferedAt: { seconds: 1 } as any,
            advanceDeclinedAt: { seconds: 2 } as any,
            adjustOfferedAt: { seconds: 3 } as any,
            adjustDeclinedAt: { seconds: 4 } as any,
          })
        )
      );
      await advancePhase(ALICE);
      for (const field of ALL_OFFER_FIELDS) {
        expect(patch()[field]).toBeNull();
      }
    });

    test('is a NO-OP at the last phase', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'refocus' })));
      await advancePhase(ALICE);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('is a no-op when no journey has been started', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await advancePhase(ALICE);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('skipToPhase', () => {
    test('lands on the target phase', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await skipToPhase(ALICE, 'refocus');
      expect(patch().phaseKey).toBe('refocus');
    });

    test('marks the phase in progress AND every phase jumped over as skipped', async () => {
      // remove -> refocus jumps recover and rewire, and leaves remove itself
      // unfinished. All three are skipped; the target is not.
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await skipToPhase(ALICE, 'refocus');
      expect(patch().skipped).toEqual(['remove', 'recover', 'rewire']);
    });

    test("every closed entry carries exitReason 'skipped'", async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await skipToPhase(ALICE, 'refocus');
      const history = patch().history as any[];
      expect(history).toHaveLength(3);
      expect(history.map((h) => h.exitReason)).toEqual(['skipped', 'skipped', 'skipped']);
      expect(history.map((h) => h.phaseKey)).toEqual(['remove', 'recover', 'rewire']);
    });

    test('a one-step skip records only the outgoing phase', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await skipToPhase(ALICE, 'recover');
      expect(patch().skipped).toEqual(['remove']);
      expect(patch().history).toHaveLength(1);
    });

    test('appends to an existing skipped list rather than replacing it', async () => {
      mockGetDoc.mockResolvedValue(
        present(stored({ phaseKey: 'recover', skipped: ['remove'] as PhaseKey[] }))
      );
      await skipToPhase(ALICE, 'rewire');
      expect(patch().skipped).toEqual(['remove', 'recover']);
    });

    test('RESETS all four offer timestamps', async () => {
      mockGetDoc.mockResolvedValue(
        present(stored({ phaseKey: 'remove', adjustDeclinedAt: { seconds: 9 } as any }))
      );
      await skipToPhase(ALICE, 'rewire');
      for (const field of ALL_OFFER_FIELDS) {
        expect(patch()[field]).toBeNull();
      }
    });

    test('refuses to skip backwards', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'rewire' })));
      await skipToPhase(ALICE, 'remove');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('refuses to skip to the phase already in progress', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'rewire' })));
      await skipToPhase(ALICE, 'rewire');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('stepBackToPhase', () => {
    test('lands on the earlier phase', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'rewire' })));
      await stepBackToPhase(ALICE, 'recover');
      expect(patch().phaseKey).toBe('recover');
    });

    test("closes the outgoing phase with exitReason 'adjusted_back'", async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'rewire' })));
      await stepBackToPhase(ALICE, 'recover');
      const history = patch().history as any[];
      expect(history).toHaveLength(1);
      expect(history[0].phaseKey).toBe('rewire');
      expect(history[0].exitReason).toBe('adjusted_back');
    });

    test('marks NOTHING skipped: stepping back is not skipping', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'refocus' })));
      await stepBackToPhase(ALICE, 'remove');
      expect(patch()).not.toHaveProperty('skipped');
    });

    test('RESETS all four offer timestamps', async () => {
      mockGetDoc.mockResolvedValue(
        present(stored({ phaseKey: 'rewire', advanceDeclinedAt: { seconds: 5 } as any }))
      );
      await stepBackToPhase(ALICE, 'remove');
      for (const field of ALL_OFFER_FIELDS) {
        expect(patch()[field]).toBeNull();
      }
    });

    test('refuses to step forwards', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await stepBackToPhase(ALICE, 'refocus');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('refuses to step to the phase already in progress', async () => {
      mockGetDoc.mockResolvedValue(present(stored({ phaseKey: 'remove' })));
      await stepBackToPhase(ALICE, 'remove');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('offer bookkeeping', () => {
    const cases: Array<[string, (uid: string) => Promise<void>, string]> = [
      ['recordAdvanceOffered', recordAdvanceOffered, 'advanceOfferedAt'],
      ['recordAdvanceDeclined', recordAdvanceDeclined, 'advanceDeclinedAt'],
      ['recordAdjustOffered', recordAdjustOffered, 'adjustOfferedAt'],
      ['recordAdjustDeclined', recordAdjustDeclined, 'adjustDeclinedAt'],
    ];

    cases.forEach(([name, fn, field]) => {
      test(`${name} stamps ${field} and touches no other offer field`, async () => {
        await fn(ALICE);
        expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'journeyStates', ALICE);
        expect(patch()[field]).toEqual({ __serverTimestamp: true });
        for (const other of ALL_OFFER_FIELDS.filter((f) => f !== field)) {
          expect(patch()).not.toHaveProperty(other);
        }
      });
    });

    test('every setter refreshes updatedAt', async () => {
      await recordAdvanceOffered(ALICE);
      expect(patch().updatedAt).toEqual({ __serverTimestamp: true });
    });
  });
});

describe('recordRemoveCapture refuses an empty capture', () => {
  // The backstop for the walk failure. The write is an updateDoc, so an empty
  // one does not merely record nothing: it nulls a real answer and stamps a
  // fresh removeCapturedAt over it. The call site guards too; this is the layer
  // that actually touches the row.
  beforeEach(() => {
    mockDoc.mockClear();
    mockUpdateDoc.mockClear();
  });

  test('throws, and writes nothing, when no target was named', async () => {
    await expect(recordRemoveCapture(ALICE, {})).rejects.toThrow(
      /no target/i
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('throws on explicit nulls too, not just missing keys', async () => {
    await expect(
      recordRemoveCapture(ALICE, {
        family: null,
        chipId: null,
        text: null,
        timing: 'evening',
      })
    ).rejects.toThrow(/no target/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('a chip alone is a target, so the guard is not over-broad', async () => {
    await recordRemoveCapture(ALICE, { chipId: 'scroll' });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].removeTargetChip).toBe('scroll');
  });

  test('free text alone is a target too', async () => {
    await recordRemoveCapture(ALICE, { text: 'scrolling at night' });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});
