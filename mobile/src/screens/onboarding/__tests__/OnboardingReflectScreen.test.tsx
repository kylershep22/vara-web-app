/**
 * OnboardingReflectScreen — the adaptive snapshot card on "Here's where you're
 * starting." Rows render only for values the user actually provided.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

const mockNavigate = jest.fn();
let mockParams: any = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
  useRoute: () => ({ params: mockParams }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../../services/firebase/onboardingStressRecovery.service', () => ({
  saveOnboardingStep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../config/firebase', () => ({ db: null }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: ({ children }: any) => <View>{children}</View> };
});

import OnboardingReflectScreen from '../OnboardingReflectScreen';
import { STATE_COLORS } from '../onboardingShift';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('OnboardingReflectScreen snapshot card', () => {
  it('renders all three rows when state, drivers, and peak are present', () => {
    mockParams = {
      state: 'wired',
      stressorLabels: ['A racing mind', 'Feeling reactive'],
      peak: 'midday',
    };
    const { getByTestId, getByText } = render(<OnboardingReflectScreen />);
    expect(getByTestId('snapshot-row-arriving')).toBeTruthy();
    expect(getByTestId('snapshot-row-drivers')).toBeTruthy();
    expect(getByTestId('snapshot-row-peaks')).toBeTruthy();
    expect(getByText('Wired')).toBeTruthy();
    expect(getByText('A racing mind, Feeling reactive')).toBeTruthy();
    expect(getByText('Mid-day')).toBeTruthy();
  });

  it('drops the driver row when no drivers were selected', () => {
    mockParams = { state: 'wired', stressorLabels: [], peak: 'midday' };
    const { queryByTestId } = render(<OnboardingReflectScreen />);
    expect(queryByTestId('snapshot-row-arriving')).toBeTruthy();
    expect(queryByTestId('snapshot-row-drivers')).toBeNull();
    expect(queryByTestId('snapshot-row-peaks')).toBeTruthy();
  });

  it('drops the peak row when no peak was selected', () => {
    mockParams = { state: 'wired', stressorLabels: ['A racing mind'], peak: null };
    const { queryByTestId } = render(<OnboardingReflectScreen />);
    expect(queryByTestId('snapshot-row-peaks')).toBeNull();
  });

  it('uses the singular "Driver" label for exactly one driver', () => {
    mockParams = { state: 'wired', stressorLabels: ['A racing mind'], peak: null };
    const { getByText, queryByText } = render(<OnboardingReflectScreen />);
    expect(getByText('Driver')).toBeTruthy();
    expect(queryByText('Drivers')).toBeNull();
  });

  it('uses the plural "Drivers" label for two or more drivers', () => {
    mockParams = {
      state: 'wired',
      stressorLabels: ['A racing mind', 'Feeling reactive'],
      peak: null,
    };
    const { getByText } = render(<OnboardingReflectScreen />);
    expect(getByText('Drivers')).toBeTruthy();
  });

  it('colors the state dot with the brain-state color (Wired = terracotta)', () => {
    mockParams = { state: 'wired', stressorLabels: [], peak: null };
    const { getByTestId } = render(<OnboardingReflectScreen />);
    const flat = StyleSheet.flatten(getByTestId('snapshot-state-dot').props.style);
    expect(flat.backgroundColor).toBe(STATE_COLORS.wired);
  });

  it('shows the five-minute reset lead-in below the card', () => {
    mockParams = { state: 'wired', stressorLabels: [], peak: null };
    const { getByText } = render(<OnboardingReflectScreen />);
    expect(
      getByText("Here's a five-minute reset to help your system downshift.")
    ).toBeTruthy();
  });
});
