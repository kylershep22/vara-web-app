/**
 * OnboardingRecheckScreen (screen 7) — the post-practice re-check, rehosted onto
 * the two-tap circumplex read followed by a felt-shift reveal. The read is the
 * same StatePickStepView as the arrival; the reveal states the shift in
 * circumplex terms and writes the authoritative circumplex fields on the
 * protocolSession (parity with the dashboard write).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
let mockParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockParams }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

const mockWriteProtocolSession = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/firebase/protocolSession.service', () => ({
  writeProtocolSession: (...a: unknown[]) => mockWriteProtocolSession(...a),
}));

const mockSaveRecheckShift = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveOnboardingStep: jest.fn().mockResolvedValue(undefined),
  saveRecheckShift: (...a: unknown[]) => mockSaveRecheckShift(...a),
}));

let mockReduceMotion = false;
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

import OnboardingRecheckScreen from '../OnboardingRecheckScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { state: 'wired', protocolId: 'box-breathing-2', durationActualSeconds: 120 };
  mockReduceMotion = false;
});

describe('OnboardingRecheckScreen — two-tap read → felt-shift reveal', () => {
  it('phase 1 renders the reframed two-tap read (acknowledges the practice, no shift line yet)', () => {
    const { getByTestId, getByText, queryByText } = render(<OnboardingRecheckScreen />);
    expect(getByText('How about now?')).toBeTruthy();
    expect(
      getByText('No right answer. Just notice where you actually are after those two minutes.')
    ).toBeTruthy();
    // Softened section prompt, not the initial read's full question.
    expect(getByTestId('checkin-flow-arousal-title').props.children).toBe('Your body:');
    expect(queryByText("How's your body right now?")).toBeNull();
    expect(queryByText(/You went from/)).toBeNull();
  });

  it('Tense → Calm shows the eased felt-win line after the two-tap', () => {
    const { getByTestId, getByText } = render(<OnboardingRecheckScreen />);
    // Re-check as low + good = Calm.
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));
    fireEvent.press(getByTestId('checkin-flow-valence-good'));
    expect(getByText('You went from wound up to settled in two minutes.')).toBeTruthy();
  });

  it('Continue writes the protocolSession with the authoritative circumplex fields', () => {
    const { getByTestId, getByLabelText } = render(<OnboardingRecheckScreen />);
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));
    fireEvent.press(getByTestId('checkin-flow-valence-good'));
    fireEvent.press(getByLabelText('Continue'));

    expect(mockWriteProtocolSession).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        stateBefore: 'wired',
        stateAfter: 'steady',
        situation: 'just_reset',
        arousal: 'revved',
        valence: 'hard',
        quadrant: 'Tense',
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingBridge', { state: 'wired' });
  });

  it('Tense → still Tense keeps the honest, non-shaming line (no false settle)', () => {
    const { getByTestId, getByText, queryByText } = render(<OnboardingRecheckScreen />);
    fireEvent.press(getByTestId('checkin-flow-arousal-revved'));
    fireEvent.press(getByTestId('checkin-flow-valence-hard'));
    expect(queryByText(/settled/)).toBeNull();
    expect(
      getByText("Recovery isn't linear. Some days the shift is quiet. Showing up is the part that compounds.")
    ).toBeTruthy();
  });
});
