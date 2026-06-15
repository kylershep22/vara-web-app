// Service-layer tests for brainStateCheckIn.service.ts.
//
// Coverage areas:
//   1. saveBrainStateCheckIn protocolId override (unchanged — legacy/onboarding).
//   2. writeBrainStateCheckInDoc + maybeMarkFirstShift (unchanged helpers).
//   3. writeStandardFlowSession — the engine-wired terminal: pointer-only /
//      acknowledged terminals write nothing; practice / abandoned terminals
//      write the protocolSession (authoritative circumplex) + the bridged legacy
//      doc (non-overwhelm); firstShift qualifies ONLY on the strong-positive
//      reflection chip.

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
import type { Protocol } from '../../../types/models';
import type { ResolvedPlan } from '../../../engine';

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
// saveBrainStateCheckIn — protocolId override (Bug F fix, unchanged)
// ────────────────────────────────────────────────────────────
describe('saveBrainStateCheckIn — protocolId parameter (Bug F fix)', () => {
  it('uses the caller-supplied protocolId when provided', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await saveBrainStateCheckIn(TEST_USER_ID, 'foggy', 'cold-water-reset-5');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1].protocolId).toBe('cold-water-reset-5');
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
    expect(mockUpdateDoc.mock.calls[0][1].protocolId).toBe('mindful-walking-10');
  });

  it('falls back to selectProtocol when protocolId is omitted (V1 single-tap path)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await saveBrainStateCheckIn(TEST_USER_ID, 'foggy');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const setDocPayload = mockSetDoc.mock.calls[0][1];
    expect(typeof setDocPayload.protocolId).toBe('string');
    expect(setDocPayload.protocolId.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────
// writeBrainStateCheckInDoc (unchanged helper)
// ────────────────────────────────────────────────────────────
describe('writeBrainStateCheckInDoc — Firestore SDK-level integration', () => {
  it('forwards protocolId to saveBrainStateCheckIn', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await writeBrainStateCheckInDoc(TEST_USER_ID, 'foggy', true, 'extended-exhale-2');
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect((legacyWrite![1] as { protocolId: string }).protocolId).toBe('extended-exhale-2');
  });

  it('flips protocolCompleted on natural completion (isFlowComplete=true)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await writeBrainStateCheckInDoc(TEST_USER_ID, 'foggy', true, 'extended-exhale-2');
    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) => (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeDefined();
  });

  it('does NOT flip protocolCompleted on abandoned (isFlowComplete=false)', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await writeBrainStateCheckInDoc(TEST_USER_ID, 'foggy', false, 'cold-water-reset-5');
    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) => (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeUndefined();
  });

  it('dryRun skips both saveBrainStateCheckIn and markProtocolCompleted', async () => {
    await writeBrainStateCheckInDoc(TEST_USER_ID, 'foggy', true, 'cold-water-reset-5', {
      dryRun: true,
    });
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────
// maybeMarkFirstShift (unchanged outcome-gated helper)
// ────────────────────────────────────────────────────────────
describe('maybeMarkFirstShift — Firestore SDK-level integration', () => {
  it("fires setFirstShiftAt for 'shifted' when firstShiftAt is null", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
    await maybeMarkFirstShift(TEST_USER_ID, 'shifted');
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
    expect((firstShiftWrite![1] as { firstShiftAt: unknown }).firstShiftAt).toBe(
      '__SERVER_TIMESTAMP__'
    );
  });

  it("does NOT fire for 'maintenance' (short-circuits before profile read)", async () => {
    await maybeMarkFirstShift(TEST_USER_ID, 'maintenance');
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('does NOT overwrite firstShiftAt when already set', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstShiftAt: '__EXISTING_TIMESTAMP__' }),
    });
    await maybeMarkFirstShift(TEST_USER_ID, 'shifted');
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
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
// writeStandardFlowSession — engine-wired terminal
// ────────────────────────────────────────────────────────────
const SAMPLE_PROTOCOL = {
  id: 'sensory-reset-2',
  family: 'sensory-reset',
  name: 'Sensory Reset',
  modality: 'sensory',
  pillar: 'energy',
  regulationDirection: 'settle',
  timeWindow: 2,
} as unknown as Protocol;

const MINIMAL_PLAN: ResolvedPlan = {
  situation: 'just_reset',
  quadrant: 'Tense',
  slots: [],
};

function abandonedTerminal(
  entrySource: 'standard' | 'overwhelm_safety_card',
  quadrant: 'Tense' | 'Calm' = 'Tense'
): TerminalFlowState {
  return {
    step: 'abandoned',
    entrySource,
    situation: 'just_reset',
    arousal: 'revved',
    valence: 'hard',
    quadrant,
    timeWindow: 2,
    plan: MINIMAL_PLAN,
    protocol: SAMPLE_PROTOCOL,
    pillar: 'energy',
    direction: 'settle',
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_060_000,
    durationActualSeconds: 60,
  } as TerminalFlowState;
}

function practiceTerminal(
  entrySource: 'standard' | 'overwhelm_safety_card',
  reflectionId: string,
  quadrant: 'Tense' | 'Calm' = 'Tense'
): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource,
    situation: 'just_reset',
    arousal: quadrant === 'Calm' ? 'low' : 'revved',
    valence: quadrant === 'Calm' ? 'good' : 'hard',
    quadrant,
    timeWindow: 2,
    plan: MINIMAL_PLAN,
    completion: {
      kind: 'practice',
      protocol: SAMPLE_PROTOCOL,
      pillar: 'energy',
      direction: 'settle',
      reflection: reflectionId,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_120_000,
      durationActualSeconds: 120,
      pointerLaunched: null,
    },
  } as TerminalFlowState;
}

function pointerOnlyTerminal(): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    situation: 'get_through_hard',
    arousal: 'revved',
    valence: 'good',
    quadrant: 'Activated',
    timeWindow: 5,
    plan: MINIMAL_PLAN,
    completion: {
      kind: 'pointer_only',
      pointerLaunched: { pillar: 'focus', type: 'focus-session' },
    },
  } as TerminalFlowState;
}

describe('writeStandardFlowSession — pointer-only / acknowledged terminals write nothing', () => {
  it('pointer-only hand-off writes neither a protocolSession nor a legacy doc', async () => {
    await writeStandardFlowSession(TEST_USER_ID, pointerOnlyTerminal(), 'default');
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('writeStandardFlowSession — overwhelm branching (legacy doc skipped)', () => {
  it('overwhelm abandoned: skips the legacy doc; abandoned never qualifies firstShift', async () => {
    await writeStandardFlowSession(TEST_USER_ID, abandonedTerminal('overwhelm_safety_card'), 'default');
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('overwhelm practice, negative reflection: skips legacy doc, no firstShift', async () => {
    await writeStandardFlowSession(
      TEST_USER_ID,
      practiceTerminal('overwhelm_safety_card', 'still_wound_up'),
      'default'
    );
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeUndefined();
  });

  it('overwhelm practice, strong-positive reflection: firstShift marker is set', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile
    await writeStandardFlowSession(
      TEST_USER_ID,
      practiceTerminal('overwhelm_safety_card', 'calmer'),
      'default'
    );
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
  });
});

describe('writeStandardFlowSession — legacy doc bridges the quadrant to a BrainState', () => {
  it('practice completion (non-overwhelm) writes the bridged BrainState + flips protocolCompleted', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy doc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile
    // Calm quadrant → bridged 'steady'.
    await writeStandardFlowSession(TEST_USER_ID, practiceTerminal('standard', 'calmer', 'Calm'), 'default');

    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect((legacyWrite![1] as { brainState: string }).brainState).toBe('steady');
    expect((legacyWrite![1] as { protocolId: string }).protocolId).toBe('sensory-reset-2');

    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) => (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeDefined();
  });

  it('abandoned (non-overwhelm) writes the bridged BrainState (Tense → wired) and does NOT flip completion', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null });
    await writeStandardFlowSession(TEST_USER_ID, abandonedTerminal('standard', 'Tense'), 'default');

    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect((legacyWrite![1] as { brainState: string }).brainState).toBe('wired');

    const completedFlip = mockUpdateDoc.mock.calls.find(
      (call) => (call[1] as { protocolCompleted?: boolean }).protocolCompleted === true
    );
    expect(completedFlip).toBeUndefined();
  });

  it('strong-positive reflection qualifies firstShift; middle chip does not', async () => {
    // Strong-positive ('calmer') → firstShift fires.
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile
    await writeStandardFlowSession(TEST_USER_ID, practiceTerminal('standard', 'calmer', 'Calm'), 'default');
    expect(
      mockSetDoc.mock.calls.find(
        (call) => (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
      )
    ).toBeDefined();

    // Middle chip ('a_little') → no firstShift.
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => null }); // legacy only
    await writeStandardFlowSession(TEST_USER_ID, practiceTerminal('standard', 'a_little', 'Calm'), 'default');
    expect(
      mockSetDoc.mock.calls.find(
        (call) => (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
      )
    ).toBeUndefined();
  });
});
