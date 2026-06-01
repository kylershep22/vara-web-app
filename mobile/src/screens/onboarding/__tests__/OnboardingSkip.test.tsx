/**
 * Optional personalization steps (screens 3 & 4). These no longer render a
 * separate "Skip for now" button — Continue is always active and treats an empty
 * selection as skip, persisting a sensible empty/default value (no penalty) and
 * advancing the flow.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockSaveStressors = jest.fn().mockResolvedValue(undefined);
const mockSavePeakWindow = jest.fn().mockResolvedValue(undefined);
const mockSaveOnboardingStep = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { state: 'wired' } }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveStressors: (...a: any[]) => mockSaveStressors(...a),
  savePeakWindow: (...a: any[]) => mockSavePeakWindow(...a),
  saveOnboardingStep: (...a: any[]) => mockSaveOnboardingStep(...a),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import OnboardingStressorScreen from '../OnboardingStressorScreen';
import OnboardingPeakWindowScreen from '../OnboardingPeakWindowScreen';

describe('Onboarding skip behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test('screen 3 (Stressor) Continue with no selection persists [] and advances to PeakWindow', async () => {
    render(<OnboardingStressorScreen />);
    expect(screen.queryByLabelText('Skip for now')).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue'));
    await waitFor(() => expect(mockSaveStressors).toHaveBeenCalledWith('u1', []));
    expect(mockNavigate).toHaveBeenCalledWith(
      'OnboardingPeakWindow',
      expect.objectContaining({ stressorLabels: [] })
    );
  });

  test('screen 4 (PeakWindow) Continue with no selection persists null and advances to Reflect', async () => {
    render(<OnboardingPeakWindowScreen />);
    expect(screen.queryByLabelText('Skip for now')).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue'));
    await waitFor(() => expect(mockSavePeakWindow).toHaveBeenCalledWith('u1', null));
    expect(mockNavigate).toHaveBeenCalledWith(
      'OnboardingReflect',
      expect.objectContaining({ peak: null })
    );
  });

  test('records the current step on mount (resume)', () => {
    render(<OnboardingStressorScreen />);
    expect(mockSaveOnboardingStep).toHaveBeenCalledWith('u1', 'OnboardingStressor');
  });
});
