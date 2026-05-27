const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({ __ref: true }));
const mockServerTimestamp = jest.fn(() => '__ts__');

jest.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => mockDoc(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));

import {
  saveInitialState,
  saveStressors,
  savePeakWindow,
  saveRecheckShift,
  saveOnboardingStep,
  resolveInitialStep,
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
