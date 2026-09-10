// The journeyStates persistence layer (journey slice 1).
//
// Same harness as dailyLog.service.test.ts: the ref echoes the arguments it
// was built from, so an assertion can tell which document a write addressed
// without the test having to reach into a real Firestore.
//
// WHAT THIS SUITE IS REALLY GUARDING is the offer reset. Every phase change
// has to clear ALL the offer bookkeeping, and forgetting one is silent: a stale
// advanceDeclinedAt would demote the next phase's advance offer to the map
// forever with nothing in the logs to say so, and a stale advanceExposures
// would spend the next phase's budget before its offer had been shown once.
// Each phase-change test asserts every field, deliberately, rather than
// trusting a spread.
//
// SEVEN FIELDS SINCE SLICE 7a, not four. ALL_OFFER_FIELDS below is the list, and
// it is what makes adding an eighth without resetting it a red build.
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
  // Echoes its argument so a test can assert "this field was incremented by 1"
  // without a real Firestore to resolve the sentinel against.
  increment: (n: number) => ({ __increment: n }),
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
  recordAdvanceExposure,
  recordRemoveCapture,
  recordRemoveReplacement,
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
    advanceExposures: 0,
    advanceFirstOfferedOn: null,
    advanceLastExposedOn: null,
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
  'advanceExposures',
  'advanceFirstOfferedOn',
  'advanceLastExposedOn',
];

/** What CLEARED_OFFERS must write. The three exposure fields joined in 7a. */
const CLEARED = {
  advanceOfferedAt: null,
  advanceDeclinedAt: null,
  adjustOfferedAt: null,
  adjustDeclinedAt: null,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
};

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

    test('opens with every offer field at its cleared value', async () => {
      await createJourneyState(ALICE, { destination: 'focus', phaseKey: 'remove' });
      const written = mockSetDoc.mock.calls[0][1];
      for (const field of ALL_OFFER_FIELDS) {
        expect(written[field]).toEqual(CLEARED[field as keyof typeof CLEARED]);
      }
    });

    test('stores NO DERIVABLE counter', async () => {
      // Section 3.1: counters that can be recomputed are derived, never stored.
      // A consistentDays field appearing here is the regression this test
      // exists to catch.
      //
      // `advanceExposures` IS STORED AND IS NOT A COUNTER-EXAMPLE. Nothing else
      // in the system records that a card was on screen - the analytics log is
      // `allow read: if false` even for its owner - so there is nothing for it
      // to be a second copy of and nothing for it to drift from. The full
      // argument is at the field in types/models.ts. This test names the two
      // fields that ARE derivable, deliberately, rather than banning the shape.
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
        expect(patch()[field]).toEqual(CLEARED[field as keyof typeof CLEARED]);
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
        expect(patch()[field]).toEqual(CLEARED[field as keyof typeof CLEARED]);
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
        expect(patch()[field]).toEqual(CLEARED[field as keyof typeof CLEARED]);
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
      await recordAdvanceDeclined(ALICE);
      expect(patch().updatedAt).toEqual({ __serverTimestamp: true });
    });
  });

  // -------------------------------------------------------------------------
  // recordAdvanceExposure (slice 7a)
  //
  // `recordAdvanceOffered` STOOD IN THE TABLE ABOVE AND IS GONE. It wrote
  // advanceOfferedAt alone, never had a caller, and is a strict subset of this
  // function; two writers of one field where only one keeps the exposure
  // bookkeeping is a coin flip for whoever picks next.
  // -------------------------------------------------------------------------
  describe('recordAdvanceExposure', () => {
    test('addresses journeyStates/{uid}', async () => {
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'journeyStates', ALICE);
    });

    test('increments the exposure count by exactly one', async () => {
      // increment(), not a read-modify-write. The document always exists by the
      // time an offer can be shown, so the featureDiscovery caveat about
      // increment resetting an absent counter to 1 does not apply here.
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(patch().advanceExposures).toEqual({ __increment: 1 });
    });

    test('anchors the cap on the FIRST exposure', async () => {
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(patch().advanceFirstOfferedOn).toBe('2026-09-10');
    });

    test('does NOT move the anchor on a later exposure', async () => {
      // The whole reason advanceFirstOfferedOn exists as its own field. If this
      // slid forward with each exposure the seven-day cap could never fire, and
      // that is precisely what reusing advanceOfferedAt would have done.
      await recordAdvanceExposure(ALICE, '2026-09-14', '2026-09-10');
      expect(patch().advanceFirstOfferedOn).toBe('2026-09-10');
    });

    test('stamps the day gate with today', async () => {
      await recordAdvanceExposure(ALICE, '2026-09-14', '2026-09-10');
      expect(patch().advanceLastExposedOn).toBe('2026-09-14');
    });

    test('refreshes advanceOfferedAt as the last-shown time', async () => {
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(patch().advanceOfferedAt).toEqual({ __serverTimestamp: true });
    });

    test('refreshes updatedAt', async () => {
      // Deliberate, and it costs one protocol refetch per calendar day: the
      // bump feeds revisionToken and Home re-resolves on focus. Omitting it
      // would save the refetch by making the document's own last-changed field
      // lie about when it last changed.
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(patch().updatedAt).toEqual({ __serverTimestamp: true });
    });

    test('touches no adjust field and no phase field', async () => {
      await recordAdvanceExposure(ALICE, '2026-09-10', null);
      expect(patch()).not.toHaveProperty('adjustOfferedAt');
      expect(patch()).not.toHaveProperty('adjustDeclinedAt');
      expect(patch()).not.toHaveProperty('advanceDeclinedAt');
      expect(patch()).not.toHaveProperty('phaseKey');
      expect(patch()).not.toHaveProperty('enteredAt');
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

describe('recordRemoveReplacement writes the pick and nothing else', () => {
  // The 3c-ii seed. THREE FIELDS ON journeyStates, and deliberately nothing in
  // the routines collection: createRoutine deactivates the user's existing
  // routine of the same type, the daytime slot has no RoutineType, and an
  // Activity needs a duration, icon and colour nobody authored. See the field
  // comment on JourneyState.
  beforeEach(() => {
    mockDoc.mockClear();
    mockUpdateDoc.mockClear();
  });

  test('writes exactly the three replacement fields plus updatedAt', async () => {
    await recordRemoveReplacement(ALICE, { optionId: 'morning_outside', slot: 'morning' });

    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'journeyStates', ALICE);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const written = mockUpdateDoc.mock.calls[0][1];
    expect(Object.keys(written).sort()).toEqual([
      'removeReplacementAt',
      'removeReplacementId',
      'removeReplacementSlot',
      'updatedAt',
    ]);
    expect(written.removeReplacementId).toBe('morning_outside');
    expect(written.removeReplacementSlot).toBe('morning');
    expect(written.removeReplacementAt).toEqual({ __serverTimestamp: true });
    expect(written.updatedAt).toEqual({ __serverTimestamp: true });
  });

  test('TOUCHES NONE OF THE FIVE CAPTURE FIELDS', async () => {
    // This is an updateDoc on the same row the capture lives on. Naming a
    // capture field here would blank a real answer.
    await recordRemoveReplacement(ALICE, { optionId: 'evening_read', slot: 'evening' });
    const written = mockUpdateDoc.mock.calls[0][1];
    for (const field of [
      'removeFamily',
      'removeTargetChip',
      'removeTargetText',
      'removeTiming',
      'removeCapturedAt',
    ]) {
      expect(written).not.toHaveProperty(field);
    }
  });

  test('throws, and writes nothing, when no option was named', async () => {
    await expect(
      recordRemoveReplacement(ALICE, { optionId: '', slot: 'day' })
    ).rejects.toThrow(/no option/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
