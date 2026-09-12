// The journey document's read boundary on the service side (slice 7f).
//
// WHY THIS SUITE EXISTS SEPARATELY FROM resolveJourney's. The resolver's guard
// covers Today; this one covers every surface that reads `journeyStates`
// directly, which is the journey map. They share a predicate and nothing else,
// and a test that only pinned the resolver is what let this half ship broken
// through 7e.
//
// TWO FAILURES IT EXISTS TO MAKE LOUD:
//   1. An unrenderable document reaching a caller. The map indexes
//      PHASE_DISPLAY with `destination` during a render, and the app's single
//      ErrorBoundary sits above the navigator, so the cost of a miss is every
//      tab and not one screen.
//   2. A UID IN A LOG LINE. The warning names a digest, never the uid.
const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => ({ path: a.slice(1).join('/') }),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  increment: jest.fn(),
  serverTimestamp: () => ({ __sentinel: true }),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../ensureDb', () => ({
  requireDb: () => ({ __db: true }),
}));

const mockWarn = jest.fn();
jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: (...a: any[]) => mockWarn(...a),
    error: jest.fn(),
  },
}));

import {
  getJourneyState,
  getRenderableJourneyState,
} from '../journeyState.service';
import { uidDigest } from '../../../journey/journeyDocGuard';
import { DESTINATION_KEYS, PHASE_ORDER } from '../../../constants/journey';

const UID = 'alice123';

/** A stored journey document, as Firestore hands it back. */
const snap = (over: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => ({
    userId: UID,
    destination: 'focus',
    phaseKey: 'remove',
    enteredAt: { seconds: 100 },
    history: [],
    skipped: [],
    createdAt: { seconds: 100 },
    updatedAt: { seconds: 100 },
    ...over,
  }),
});

describe('getRenderableJourneyState', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockWarn.mockReset();
  });

  // THE TYPES DO NOT PROTECT THIS BOUNDARY AND THAT IS THE SUBJECT. Every case
  // below is unreachable to the compiler and reachable from the Firebase
  // console, which is why the fixtures are built as plain objects.
  const malformed: Array<[string, Record<string, unknown>]> = [
    ['destination absent', { destination: undefined }],
    // The near miss worth its own case: a real key in the WEEKLY vocabulary
    // that reads 'calm' in this one, so the document looks right to a human.
    ['destination "stress", an OutcomeKey', { destination: 'stress' }],
    ['destination with a trailing space', { destination: 'focus ' }],
    ['destination outside the union', { destination: 'wellbeing' }],
    ['phaseKey absent', { phaseKey: undefined }],
    // Verbatim from slice 7b's device walk.
    ['phaseKey "remove " with a trailing space', { phaseKey: 'remove ' }],
    ['phaseKey outside the union', { phaseKey: 'reboot' }],
  ];

  test.each(malformed)('%s resolves to null', async (_name, over) => {
    mockGetDoc.mockResolvedValue(snap(over));

    await expect(getRenderableJourneyState(UID)).resolves.toBeNull();
  });

  test.each(malformed)('%s warns exactly once, on the digest', async (_name, over) => {
    mockGetDoc.mockResolvedValue(snap(over));

    await getRenderableJourneyState(UID);

    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][1]).toBe(uidDigest(UID));
    expect(JSON.stringify(mockWarn.mock.calls[0])).not.toContain(UID);
  });

  // ABSENT IS NOT A FAILURE. A user who has not started a journey is the
  // ordinary case on this path, and warning about it would fill the log with
  // one line per launch for every pre-journey account.
  test('an ABSENT document returns null and does NOT warn', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    await expect(getRenderableJourneyState(UID)).resolves.toBeNull();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  // THE ANTI-VACUITY DIRECTION. Without this the guard could reject everything
  // and every test above would still pass.
  test('all sixteen valid pairs come back intact, with no warning', async () => {
    for (const phaseKey of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        mockWarn.mockClear();
        mockGetDoc.mockResolvedValue(snap({ phaseKey, destination }));

        const state = await getRenderableJourneyState(UID);

        expect(state).not.toBeNull();
        expect(state?.phaseKey).toBe(phaseKey);
        expect(state?.destination).toBe(destination);
        expect(mockWarn).not.toHaveBeenCalled();
      }
    }
  });

  // THE GUARD IS ON THE RENDERING READ ONLY, and this is what says so. The
  // writers in the service read the document to mutate it; a raw read that
  // returned null for an unrenderable row would turn advancePhase and
  // stepBackToPhase into silent no-ops on exactly the documents that need
  // fixing.
  test('getJourneyState is UNGUARDED and still returns the bad document', async () => {
    mockGetDoc.mockResolvedValue(snap({ phaseKey: 'remove ' }));

    const raw = await getJourneyState(UID);

    expect(raw?.phaseKey).toBe('remove ');
    expect(mockWarn).not.toHaveBeenCalled();
  });

  // IT DOES NOT REPAIR THE DOCUMENT. A read path that wrote would erase the
  // evidence of the data problem the warning exists to surface.
  test('WRITES NOTHING on a malformed document', async () => {
    const { setDoc, updateDoc } = jest.requireMock('firebase/firestore');
    mockGetDoc.mockResolvedValue(snap({ destination: 'stress' }));

    await getRenderableJourneyState(UID);

    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
