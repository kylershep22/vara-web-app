// Service-layer tests for brainStateCheckIn.service.ts.
//
// Three coverage areas:
//
//   1. saveBrainStateCheckIn with the optional protocolId param
//      (round-8 Bug F fix) — without explicit protocolId, the function
//      falls back to selectProtocol (V1 single-tap path); with one,
//      it uses the caller-supplied id.
//
//   2. writeBrainStateCheckInDoc + maybeMarkFirstShift (the round-14
//      split of the previous writeBrainStateCheckInLegacyEffects).
//      Tests assert legacy-doc write semantics, the protocolCompleted
//      flip on natural completion, and the firstShiftAt write
//      conditioned on outcome qualification + null-field. Mocks at
//      the firebase/firestore SDK level so the helpers' internals
//      execute.
//
//   3. writeStandardFlowSession overwhelm-branching (round-14 sensory
//      reset cancel state-revert fix). Asserts that overwhelm
//      terminals skip writeBrainStateCheckInDoc but still call
//      maybeMarkFirstShift; non-overwhelm terminals call both.

const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => '__SERVER_TIMESTAMP__'),
}));

jest.mock('../../../config/firebase', () => ({
  db: { __mockFirestore: true },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  saveBrainStateCheckIn,
  writeBrainStateCheckInDoc,
  maybeMarkFirstShift,
  writeStandardFlowSession,
} from '../brainStateCheckIn.service';
import type { TerminalFlowState } from '../../../components/checkin/flow/CheckInFlow';

// Stub writeProtocolSession so writeStandardFlowSession-level tests
// don't double-write or crash on the firestore mock surface area
// (the protocolSessions write path uses its own internal getDoc/
// setDoc dance that's exhaustively tested in protocolSession.service.test.ts).
jest.mock('../protocolSession.service', () => {
  const actual = jest.requireActual('../protocolSession.service');
  return {
    ...actual,
    writeProtocolSession: jest.fn().mockResolvedValue(undefined),
  };
});

const TEST_USER_ID = 'user-test-123';

beforeEach(() => {
  mockDoc.mockReset();
  mockDoc.mockImplementation((_db: unknown, _coll: string, id: string) => ({
    __mockDocRef: id,
  }));
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockReset();
  mockUpdateDoc.mockResolvedValue(undefined);
});

// ────────────────────────────────────────────────────────────
// saveBrainStateCheckIn — protocolId override (Bug F fix)
// ────────────────────────────────────────────────────────────
describe('saveBrainStateCheckIn — protocolId parameter (Bug F fix)', () => {
  it('uses the caller-supplied protocolId when provided (round 8 contract)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await saveBrainStateCheckIn(TEST_USER_ID, 'foggy', 'cold-water-reset-5');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const setDocPayload = mockSetDoc.mock.calls[0][1];
    expect(setDocPayload.protocolId).toBe('cold-water-reset-5');
  });

  it('updates the protocolId on an existing legacy doc when caller provides one', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        userId: TEST_USER_ID,
        date: '2026-05-06',
        brainState: 'foggy',
        protocolId: 'old-id',
        protocolCompleted: false,
      }),
    });

    await saveBrainStateCheckIn(TEST_USER_ID, 'foggy', 'mindful-walking-10');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = mockUpdateDoc.mock.calls[0][1];
    expect(updatePayload.protocolId).toBe('mindful-walking-10');
  });

  it('falls back to selectProtocol when protocolId is omitted (V1 single-tap path)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    // OnboardingV2CheckInScreen still calls without protocolId — the
    // legacy doc captures the recommended protocol pre-completion.
    // The selectProtocol fallback for foggy + 5min returns one of the
    // foggy-suitable 5-min protocols. We only assert the field is set
    // to a non-empty string (the specific selection is the recommender's
    // concern, covered by protocolSelector.service.test.ts).
    await saveBrainStateCheckIn(TEST_USER_ID, 'foggy');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const setDocPayload = mockSetDoc.mock.calls[0][1];
    expect(typeof setDocPayload.protocolId).toBe('string');
    expect(setDocPayload.protocolId.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────
// writeBrainStateCheckInDoc — round 14 split (was steps 1+2 of the
// previous writeBrainStateCheckInLegacyEffects helper). Writes the
// legacy brainStateCheckIns doc; conditionally flips
// protocolCompleted; does NOT touch the firstShiftAt marker.
// ────────────────────────────────────────────────────────────
describe('writeBrainStateCheckInDoc — Firestore SDK-level integration', () => {
  it('forwards protocolId to saveBrainStateCheckIn (Bug F fix preserved through round 14 split)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await writeBrainStateCheckInDoc(
      TEST_USER_ID,
      'foggy',
      true,
      'extended-exhale-2'
    );

    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect((legacyWrite![1] as { protocolId: string }).protocolId).toBe(
      'extended-exhale-2'
    );
  });

  it('flips protocolCompleted via markProtocolCompleted on natural completion (isFlowComplete=true)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await writeBrainStateCheckInDoc(
      TEST_USER_ID,
      'foggy',
      true,
      'extended-exhale-2'
    );

    // The protocolCompleted flip is via updateDoc with
    // protocolCompleted: true.
    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) =>
        (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeDefined();
  });

  it('does NOT flip protocolCompleted on abandoned (isFlowComplete=false)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await writeBrainStateCheckInDoc(
      TEST_USER_ID,
      'foggy',
      false,
      'cold-water-reset-5'
    );

    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) =>
        (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeUndefined();
  });

  it('dryRun skips both saveBrainStateCheckIn and markProtocolCompleted', async () => {
    await writeBrainStateCheckInDoc(
      TEST_USER_ID,
      'foggy',
      true,
      'cold-water-reset-5',
      { dryRun: true }
    );

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('does NOT touch the user profile (firstShiftAt is maybeMarkFirstShift\'s responsibility)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await writeBrainStateCheckInDoc(
      TEST_USER_ID,
      'foggy',
      true,
      'extended-exhale-2'
    );

    // No firstShiftAt write should appear — the helpers are split.
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────
// maybeMarkFirstShift — round 14 split (was step 3). Conditionally
// sets firstShiftAt on the user profile. Independent of the legacy
// doc write.
// ────────────────────────────────────────────────────────────
describe('maybeMarkFirstShift — Firestore SDK-level integration', () => {
  it("fires setFirstShiftAt for 'shifted' outcome when firstShiftAt is null", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

    await maybeMarkFirstShift(TEST_USER_ID, 'shifted');

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
    expect(
      (firstShiftWrite![1] as { firstShiftAt: unknown }).firstShiftAt
    ).toBe('__SERVER_TIMESTAMP__');
  });

  it("fires setFirstShiftAt for 'partial_shift' outcome (qualifies)", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

    await maybeMarkFirstShift(TEST_USER_ID, 'partial_shift');

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
  });

  it("does NOT fire setFirstShiftAt for 'maintenance' outcome (doesn't qualify, short-circuits before profile read)", async () => {
    await maybeMarkFirstShift(TEST_USER_ID, 'maintenance');

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('does NOT overwrite firstShiftAt when the field is already set on the user profile', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstShiftAt: '__EXISTING_TIMESTAMP__' }),
    });

    await maybeMarkFirstShift(TEST_USER_ID, 'shifted');

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeUndefined();
  });

  it('dryRun skips the firstShiftAt call entirely', async () => {
    await maybeMarkFirstShift(TEST_USER_ID, 'shifted', { dryRun: true });

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────
// writeStandardFlowSession — round 14 overwhelm-branching tests.
// Sensory reset cancel state-revert fix: overwhelm sessions skip
// the legacy doc write (their stateBefore is a system guess, not
// a user attestation), but still trigger first-shift if applicable.
// ────────────────────────────────────────────────────────────

// Minimal Protocol fixture for terminal payloads.
const SAMPLE_PROTOCOL = {
  id: 'sensory-reset-2',
  family: 'sensory-reset',
  name: 'Sensory Reset',
  description: '',
  whatItIs: '',
  whatYoullNeed: '',
  howItWorks: '',
  whenItFits: '',
  firstTimeOrientation: { whatYoullDo: '', whatYoullNeed: '', whyItWorks: '' },
  evidenceTier: 3,
  durationSeconds: 120,
  timeWindow: 2,
  modality: 'sensory',
  suitableForStates: [],
  suitableForTimesOfDay: [],
  steps: [],
} as unknown as TerminalFlowState['protocol'];

const STANDARD_PROTOCOL = {
  ...SAMPLE_PROTOCOL,
  id: 'box-breathing-2',
  family: 'box-breathing',
  name: 'Box Breathing',
  modality: 'breath',
} as unknown as TerminalFlowState['protocol'];

function overwhelmAbandonedTerminal(): TerminalFlowState {
  return {
    step: 'abandoned',
    entrySource: 'overwhelm_safety_card',
    stateBefore: 'wired',
    timeWindow: 2,
    protocol: SAMPLE_PROTOCOL,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_060_000,
    durationActualSeconds: 60,
  } as TerminalFlowState;
}

function overwhelmCompleteTerminal(stateAfter: 'steady' | 'wired'): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'overwhelm_safety_card',
    stateBefore: 'wired',
    timeWindow: 2,
    protocol: SAMPLE_PROTOCOL,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter,
    outcome: stateAfter === 'wired' ? 'not_shifted' : 'shifted',
    userChosenNextStep: 'dismissed',
  } as TerminalFlowState;
}

function standardCompleteTerminal(): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 2,
    protocol: STANDARD_PROTOCOL,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: 'steady',
    outcome: 'shifted',
    userChosenNextStep: 'dismissed',
  } as TerminalFlowState;
}

function standardAbandonedTerminal(): TerminalFlowState {
  return {
    step: 'abandoned',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 2,
    protocol: STANDARD_PROTOCOL,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_060_000,
    durationActualSeconds: 60,
    // AbandonedStep type omits stateAfter — re-check never ran.
  } as TerminalFlowState;
}

describe('writeStandardFlowSession — overwhelm-branching (round 14 sensory reset cancel fix)', () => {
  it('overwhelm cancel: skips legacy doc write entirely (preserves any prior brainStateCheckIns doc)', async () => {
    // No mock for getDoc means saveBrainStateCheckIn would crash if
    // it ran. The assertion: it didn't run. Even with a prior doc
    // sitting in Firestore (which we represent here as "the existence
    // is irrelevant because we never read it"), the cancel write
    // must not touch the brainStateCheckIns collection at all.
    await writeStandardFlowSession(
      TEST_USER_ID,
      overwhelmAbandonedTerminal(),
      'default'
    );

    // No setDoc / updateDoc on the brainStateCheckIns collection
    // (those carry brainState / protocolId fields). firstShiftAt
    // payloads also use setDoc but on the users collection — for
    // outcome='abandoned' qualifiesAsFirstShift returns false, so
    // maybeMarkFirstShift short-circuits before touching firestore.
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('overwhelm complete: skips legacy doc write entirely', async () => {
    await writeStandardFlowSession(
      TEST_USER_ID,
      overwhelmCompleteTerminal('wired'), // not_shifted, doesn't qualify
      'default'
    );

    // No legacy doc write fires (the bug: previously this would call
    // saveBrainStateCheckIn(userId, 'wired', 'sensory-reset-2') and
    // clobber any prior same-day attestation).
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeUndefined();
    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) =>
        (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeUndefined();
  });

  it('overwhelm with NO prior doc: still does not create a brainStateCheckIns doc', async () => {
    // Even with no prior check-in for the day, the overwhelm cancel/
    // complete must not seed the doc with the system-guessed 'wired'
    // state. The dashboard should continue to show the chip picker
    // (no check-in today).
    await writeStandardFlowSession(
      TEST_USER_ID,
      overwhelmAbandonedTerminal(),
      'default'
    );

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('overwhelm complete with qualifying outcome: maybeMarkFirstShift fires; firstShiftAt marker set', async () => {
    // The first-shift marker tracks state transitions in
    // protocolSessions data, not user attestations. Even though
    // the overwhelm session's stateBefore is a system guess, the
    // resulting transition (wired→steady = shifted) is real and
    // recorded in protocolSessions — it should mark first-shift.
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile, no firstShiftAt

    await writeStandardFlowSession(
      TEST_USER_ID,
      overwhelmCompleteTerminal('steady'), // shifted
      'default'
    );

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
  });

  it('non-overwhelm flow: BOTH writeBrainStateCheckInDoc AND maybeMarkFirstShift fire (regression check)', async () => {
    // Sequence for a standard shifted completion:
    //   getDoc(legacy) → setDoc(legacy) OR updateDoc(legacy) →
    //   updateDoc(legacy protocolCompleted) →
    //   getDoc(user profile) → setDoc(user profile firstShiftAt).
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile

    await writeStandardFlowSession(
      TEST_USER_ID,
      standardCompleteTerminal(),
      'default'
    );

    // Legacy write fires.
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    // protocolCompleted flips.
    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) =>
        (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeDefined();
    // First-shift marker set.
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────
// writeStandardFlowSession — Round 15 contract-locking tests for
// stateBefore-vs-stateAfter selection.
//
// Pre-round-15, writeStandardFlowSession passed terminal.stateBefore
// to writeBrainStateCheckInDoc — for both abandoned and flow_complete
// terminals. The legacy doc held the user's PRE-protocol state even
// after a successful re-check, so the dashboard summary card showed
// the start state instead of the post-protocol state.
//
// Round 15 fix: pass terminal.stateAfter for flow_complete (the
// captured re-check value), terminal.stateBefore for abandoned (the
// only state available; re-check never ran).
//
// These tests assert the exact value selection — the contract that
// was missing in the round-14 split tests (those asserted the write
// fired but not WHICH state value, allowing the bug to persist
// through a green test suite). Per the round-15 META process note:
// value assertions in write helpers must check semantic correctness,
// not just that some value was passed.
// ────────────────────────────────────────────────────────────
describe('writeStandardFlowSession — round 15 stateBefore-vs-stateAfter contract', () => {
  it('flow_complete: writes terminal.stateAfter to legacy doc (NOT stateBefore)', async () => {
    // standardCompleteTerminal() returns stateBefore='wired',
    // stateAfter='steady'. Pre-round-15 the legacy doc would receive
    // 'wired'; under the fix it receives 'steady'.
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy doc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile

    await writeStandardFlowSession(
      TEST_USER_ID,
      standardCompleteTerminal(),
      'default'
    );

    // Find the legacy-collection setDoc call (carries protocolId).
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    // The legacy doc's brainState field MUST be 'steady'
    // (post-re-check), NOT 'wired' (pre-protocol). serializeBrainState
    // is identity for canonical states ('steady' → 'steady').
    expect(
      (legacyWrite![1] as { brainState: string }).brainState
    ).toBe('steady');
    expect(
      (legacyWrite![1] as { brainState: string }).brainState
    ).not.toBe('wired');
  });

  it('abandoned: writes terminal.stateBefore to legacy doc (only state available — re-check never ran)', async () => {
    // standardAbandonedTerminal() returns stateBefore='wired' and
    // omits stateAfter (AbandonedStep type doesn't include it). The
    // step-based conditional must select stateBefore for this
    // variant. Note this isn't a "fix" of the abandoned path — it's
    // a regression guard against future changes that try to access
    // a stateAfter on the abandoned variant.
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });

    await writeStandardFlowSession(
      TEST_USER_ID,
      standardAbandonedTerminal(),
      'default'
    );

    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect(
      (legacyWrite![1] as { brainState: string }).brainState
    ).toBe('wired');
  });

  it('flow_complete with downward shift: writes the downward state (stateAfter), even when worse than stateBefore', async () => {
    // Defensive — confirms the fix doesn't accidentally favor a
    // "better" state. Steady → Wired (worse re-check) → legacy
    // doc holds 'wired' because that's what the user just attested
    // to, not 'steady' (the pre-protocol state). The dashboard
    // should reflect the user's current state honestly.
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

    const downwardTerminal: TerminalFlowState = {
      step: 'flow_complete',
      entrySource: 'standard',
      stateBefore: 'steady',
      timeWindow: 5,
      protocol: STANDARD_PROTOCOL,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_300_000,
      durationActualSeconds: 300,
      playerExitReason: 'completed',
      stateAfter: 'wired',
      outcome: 'not_shifted',
      userChosenNextStep: 'rest_later',
    } as TerminalFlowState;

    await writeStandardFlowSession(TEST_USER_ID, downwardTerminal, 'default');

    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect(
      (legacyWrite![1] as { brainState: string }).brainState
    ).toBe('wired'); // stateAfter, even though it's "worse"
  });
});
