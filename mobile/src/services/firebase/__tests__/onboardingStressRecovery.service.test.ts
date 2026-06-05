const mockUpdateDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));
const mockServerTimestamp = jest.fn(() => '__ts__');
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockSaveRecheckCheckIn = jest.fn((..._a: any[]) => Promise.resolve(undefined));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
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
  beforeEach(() => mockUpdateDoc.mockClear());

  // Data-save functions persist ONLY their data field + updatedAt. They do NOT
  // write onboardingStep (that's written on screen MOUNT via saveOnboardingStep,
  // so resume lands on where you ARE, not the step you just finished).
  test('saveInitialState writes only the nested field + updatedAt (no step)', async () => {
    await saveInitialState('u1', 'wired');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { __ref: true },
      { 'onboardingStressRecovery.initialState': 'wired', updatedAt: '__ts__' }
    );
    expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('saveStressors persists the array, no step', async () => {
    await saveStressors('u1', ['racing_mind', 'cant_switch_off']);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ 'onboardingStressRecovery.stressors': ['racing_mind', 'cant_switch_off'] })
    );
    expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('savePeakWindow accepts null (skipped), no step', async () => {
    await savePeakWindow('u1', null);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ 'onboardingStressRecovery.peakWindow': null })
    );
    expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('saveRecheckShift persists stateAfter + shift, no step', async () => {
    await saveRecheckShift('u1', 'steady', 'improved');
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        'onboardingStressRecovery.recheckStateAfter': 'steady',
        'onboardingStressRecovery.recheckShift': 'improved',
      })
    );
    expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('saveOnboardingStep is the ONLY writer of onboardingStep — writes the route name as-is', async () => {
    await saveOnboardingStep('u1', 'OnboardingProtocol');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { __ref: true },
      { onboardingStep: 'OnboardingProtocol', updatedAt: '__ts__' }
    );
  });

  describe('persistRecheckAsDailyCheckIn', () => {
    beforeEach(() => {
      mockGetDoc.mockReset();
      mockSaveRecheckCheckIn.mockClear();
    });

    test('writes the re-check state as a daily check-in when present', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ onboardingStressRecovery: { recheckStateAfter: 'steady' } }),
      });
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).toHaveBeenCalledWith('u1', 'steady');
    });

    test('no-op when the re-check state is absent (skipped / not reached)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ onboardingStressRecovery: {} }),
      });
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).not.toHaveBeenCalled();
    });

    test('no-op when the user doc does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      await persistRecheckAsDailyCheckIn('u1');
      expect(mockSaveRecheckCheckIn).not.toHaveBeenCalled();
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
