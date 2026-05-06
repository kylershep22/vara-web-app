// Service-layer tests for brainStateCheckIn.service.ts.
//
// Two coverage gaps round-8 closes:
//
//   1. saveBrainStateCheckIn with the optional protocolId param
//      (round-8 Bug F fix) — without explicit protocolId, the function
//      falls back to selectProtocol (V1 single-tap path); with one,
//      it uses the caller-supplied id.
//
//   2. writeBrainStateCheckInLegacyEffects → setFirstShiftAtIfNeeded
//      INTERNAL invocation. The CheckInFlow + BrowseRunFlow integration
//      tests mock the helper at the module boundary, which means
//      setFirstShiftAtIfNeeded's setDoc-on-user-profile never runs in
//      those tests. Round 7 shipped without test coverage for this path.
//      Round 8 closes that gap by mocking at the firebase/firestore
//      SDK level so the helper's internals execute.

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
  writeBrainStateCheckInLegacyEffects,
} from '../brainStateCheckIn.service';

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
// writeBrainStateCheckInLegacyEffects — forwards protocolId
// AND fires setFirstShiftAtIfNeeded internally (round 8 closes
// the test gap that hid the round-7 firstShiftAt path)
// ────────────────────────────────────────────────────────────
describe('writeBrainStateCheckInLegacyEffects — Firestore SDK-level integration', () => {
  it('forwards protocolId to saveBrainStateCheckIn (Bug F fix)', async () => {
    // No existing legacy doc; setDoc path. No existing user profile;
    // setDoc-merge for firstShiftAt will fire on a qualifying outcome.
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy doc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }); // user profile

    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'foggy',
      true,
      'shifted',
      'extended-exhale-2'
    );

    // Find the legacy-collection setDoc call (path includes
    // 'brainStateCheckIns' via the mocked doc ref).
    const legacyWrite = mockSetDoc.mock.calls.find(
      (call) => (call[1] as { protocolId?: string }).protocolId !== undefined
    );
    expect(legacyWrite).toBeDefined();
    expect((legacyWrite![1] as { protocolId: string }).protocolId).toBe(
      'extended-exhale-2'
    );
  });

  it("fires setFirstShiftAtIfNeeded's setDoc on user profile for 'shifted' outcome when firstShiftAt is null", async () => {
    // Sequence: getDoc(legacy) → setDoc(legacy) → updateDoc(legacy
    // protocolCompleted) → getDoc(user profile) → setDoc(user profile
    // firstShiftAt).
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy doc — first save
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // user profile — no firstShiftAt yet

    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'foggy',
      true,
      'shifted',
      'cold-water-reset-5'
    );

    // The firstShiftAt write sets a serverTimestamp via setDoc-merge.
    // Find that call by looking for a payload with the firstShiftAt field.
    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
    expect(
      (firstShiftWrite![1] as { firstShiftAt: unknown }).firstShiftAt
    ).toBe('__SERVER_TIMESTAMP__');
  });

  it("fires setFirstShiftAtIfNeeded's setDoc for 'partial_shift' outcome (qualifies as first shift)", async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'wired',
      true,
      'partial_shift',
      'box-breathing-2'
    );

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeDefined();
  });

  it("does NOT fire setFirstShiftAtIfNeeded's setDoc for 'maintenance' outcome (doesn't qualify)", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });
    // No user-profile read should fire because qualifiesAsFirstShift returns
    // false early — the function short-circuits.

    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'steady',
      true,
      'maintenance',
      'coherence-breathing-5'
    );

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeUndefined();
  });

  it("does NOT overwrite firstShiftAt when the field is already set on the user profile", async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // legacy doc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ firstShiftAt: '__EXISTING_TIMESTAMP__' }),
      }); // user profile already has it

    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'foggy',
      true,
      'shifted',
      'mindful-walking-10'
    );

    const firstShiftWrite = mockSetDoc.mock.calls.find(
      (call) =>
        (call[1] as { firstShiftAt?: unknown }).firstShiftAt !== undefined
    );
    expect(firstShiftWrite).toBeUndefined();
  });

  it('dryRun skips ALL writes (legacy + protocolCompleted + firstShiftAt)', async () => {
    await writeBrainStateCheckInLegacyEffects(
      TEST_USER_ID,
      'foggy',
      true,
      'shifted',
      'cold-water-reset-5',
      { dryRun: true }
    );

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
