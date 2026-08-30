/**
 * Rewritten for userPrivate migration slice 2. The four data-save functions now
 * write userPrivate/{uid} as NESTED objects rather than users/{uid} with dotted
 * field paths; saveOnboardingStep dual-writes, because the step is a gate field
 * that still steers AppNavigator for clients reading the public document.
 */
const mockUpdateDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ collection, id }));
const mockServerTimestamp = jest.fn(() => '__ts__');
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockSaveRecheckCheckIn = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve(undefined));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => (mockDoc as any)(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: () => ({
    set: (...a: any[]) => mockBatchSet(...a),
    update: (...a: any[]) => mockBatchUpdate(...a),
    commit: () => mockBatchCommit(),
  }),
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));
// Isolate from the brainStateCheckIn writer (and its catalog/selector deps).
jest.mock('../brainStateCheckIn.service', () => ({
  saveOnboardingRecheckCheckIn: (...a: any[]) => mockSaveRecheckCheckIn(...a),
}));

import {
  saveInitialState,
  saveStressors,
  savePeakWindow,
  saveRecheckShift,
  saveOnboardingStep,
  resolveInitialStep,
  persistRecheckAsDailyCheckIn,
} from '../onboardingStressRecovery.service';

describe('onboardingStressRecovery.service', () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockSetDoc.mockClear();
    mockBatchSet.mockClear();
    mockBatchUpdate.mockClear();
    mockBatchCommit.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });

  /** The (ref, data) of the single private write that was performed. */
  const privateWrite = () => ({
    ref: mockSetDoc.mock.calls[0][0] as any,
    data: mockSetDoc.mock.calls[0][1] as any,
  });

  // Data-save functions persist ONLY their data field + updatedAt. They do NOT
  // write onboardingStep (that's written on screen MOUNT via saveOnboardingStep,
  // so resume lands on where you ARE, not the step you just finished).
  test('saveInitialState writes the nested field to userPrivate, not users', async () => {
    await saveInitialState('u1', 'wired');
    expect(privateWrite().ref).toEqual({ collection: 'userPrivate', id: 'u1' });
    expect(privateWrite().data).toMatchObject({
      onboardingStressRecovery: { initialState: 'wired' },
    });
    expect(privateWrite().data).not.toHaveProperty('onboardingStep');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('saveStressors persists the array, no step', async () => {
    await saveStressors('u1', ['racing_mind', 'cant_switch_off']);
    expect(privateWrite().data.onboardingStressRecovery).toEqual({
      stressors: ['racing_mind', 'cant_switch_off'],
    });
    expect(privateWrite().data).not.toHaveProperty('onboardingStep');
  });

  test('savePeakWindow accepts null (skipped), no step', async () => {
    await savePeakWindow('u1', null);
    expect(privateWrite().data.onboardingStressRecovery).toEqual({ peakWindow: null });
    expect(privateWrite().data).not.toHaveProperty('onboardingStep');
  });

  test('no data-save function writes a dotted field-path key', async () => {
    // setDoc(merge) would read a key like
    // 'onboardingStressRecovery.peakWindow' as a literal field name containing
    // a dot: junk written, real value silently dropped.
    await savePeakWindow('u1', 'morning');
    for (const key of Object.keys(privateWrite().data as object)) {
      expect(key).not.toContain('.');
    }
  });

  test('saveRecheckShift persists stateAfter + shift, no step', async () => {
    await saveRecheckShift('u1', 'steady', 'improved');
    expect(privateWrite().data.onboardingStressRecovery).toEqual({
      recheckStateAfter: 'steady',
      recheckShift: 'improved',
    });
    expect(privateWrite().data).not.toHaveProperty('onboardingStep');
  });

  test('saveOnboardingStep dual-writes the gate field to BOTH documents', async () => {
    // MIGRATION_FALLBACK: the step steers AppNavigator resume, and a client
    // still reading users/{uid} must keep seeing it advance or it restarts the
    // flow. Slice 4 drops the public half.
    await saveOnboardingStep('u1', 'OnboardingProtocol');

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { collection: 'users', id: 'u1' },
      { onboardingStep: 'OnboardingProtocol', updatedAt: '__ts__' }
    );
    const [privateRef, privateData] = mockBatchSet.mock.calls[0];
    expect(privateRef).toEqual({ collection: 'userPrivate', id: 'u1' });
    expect(privateData).toMatchObject({ onboardingStep: 'OnboardingProtocol' });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  describe('persistRecheckAsDailyCheckIn', () => {
    beforeEach(() => {
      mockGetDoc.mockReset();
      mockSaveRecheckCheckIn.mockClear();
    });

    test('writes the re-check state as a daily check-in, stamped with the circumplex', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ onboardingStressRecovery: { recheckStateAfter: 'steady' } }),
      });
      await persistRecheckAsDailyCheckIn('u1');
      // steady bridges to Calm; onboarding pins just_reset — parity with the
      // dashboard's marker write so the acknowledgment card can read the quadrant.
      expect(mockSaveRecheckCheckIn).toHaveBeenCalledWith('u1', 'steady', {
        quadrant: 'Calm',
        situation: 'just_reset',
      });
    });

    test('no-op when the re-check state is absent (skipped / not reached)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ onboardingStressRecovery: {} }),
      });
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).not.toHaveBeenCalled();
    });

    test('no-op when NEITHER user document exists', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).not.toHaveBeenCalled();
    });

    test('finds a re-check state that still lives only on users/{uid}', async () => {
      // MIGRATION_FALLBACK from the other direction: a user who captured the
      // re-check on an older build. Missing it would silently re-gate them
      // behind a check-in they had already done.
      mockGetDoc.mockImplementation((ref: any) =>
        Promise.resolve(
          ref.collection === 'userPrivate'
            ? { exists: (): boolean => false, data: () => null }
            : {
                exists: (): boolean => true,
                data: () => ({
                  onboardingStressRecovery: { recheckStateAfter: 'steady' },
                }),
              }
        )
      );
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).toHaveBeenCalledWith('u1', 'steady', {
        quadrant: 'Calm',
        situation: 'just_reset',
      });
    });
  });

  describe('resolveInitialStep', () => {
    test('returns the persisted step when valid', () => {
      expect(resolveInitialStep({ onboardingStep: 'OnboardingProtocol' })).toBe('OnboardingProtocol');
    });
    test('falls back to the first screen when missing', () => {
      expect(resolveInitialStep({})).toBe('OnboardingProblem');
      expect(resolveInitialStep(null)).toBe('OnboardingProblem');
    });
    test('falls back to the first screen when the value is not a known route', () => {
      expect(resolveInitialStep({ onboardingStep: 'GarbageRoute' })).toBe('OnboardingProblem');
    });
  });
});
