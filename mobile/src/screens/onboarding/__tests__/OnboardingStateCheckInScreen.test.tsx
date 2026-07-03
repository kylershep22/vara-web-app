/**
 * OnboardingStateCheckInScreen (screen 2) — the arriving state read, rehosted
 * onto the shipped two-tap circumplex component. Onboarding pins the just_reset
 * situation (chip hidden) and bridges the {arousal, valence} result to the
 * legacy five-state value it carries forward, so the downstream valence-branched
 * screens (drivers/peak/bridge/anchor) keep working unchanged.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
}));

const mockSaveInitialState = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveInitialState: (...args: unknown[]) => mockSaveInitialState(...args),
  saveOnboardingStep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

let mockReduceMotion = false;
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

import OnboardingStateCheckInScreen from '../OnboardingStateCheckInScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
});

describe('OnboardingStateCheckInScreen — two-tap circumplex read', () => {
  it('renders the two-tap read with the pinned-situation chip hidden', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingStateCheckInScreen />);
    expect(getByTestId('checkin-flow-arousal-title')).toBeTruthy();
    expect(queryByTestId('checkin-flow-state-pick-situation')).toBeNull();
    // No five-state chips anymore.
    expect(queryByTestId('brain-state-radio-wired')).toBeNull();
  });

  it('bridges revved+hard (Tense) to wired, saves it, and advances to the driver screen', () => {
    const { getByTestId } = render(<OnboardingStateCheckInScreen />);
    fireEvent.press(getByTestId('checkin-flow-arousal-revved'));
    fireEvent.press(getByTestId('checkin-flow-valence-hard'));

    expect(mockSaveInitialState).toHaveBeenCalledWith('u1', 'wired');
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingStressor', { state: 'wired' });
  });

  it('bridges low+good (Calm) to steady so the downstream positive-valence branch fires', () => {
    const { getByTestId } = render(<OnboardingStateCheckInScreen />);
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));
    fireEvent.press(getByTestId('checkin-flow-valence-good'));

    expect(mockNavigate).toHaveBeenCalledWith('OnboardingStressor', { state: 'steady' });
  });
});
