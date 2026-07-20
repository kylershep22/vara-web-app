/**
 * EnergyHubScreen — secondary library entries (B-3d.2/B-3d.3).
 *
 * Guards that the library surfaces re-homed into the Energy hub navigate to
 * their AppStack routes. B-3d.2 covers Journal (Rest / evening wind-down).
 */

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
// The docked Guide pill pulls the AI chat + consent stack; stub it out so the
// hub unit test stays focused on the hub's own content and navigation.
jest.mock('../../../components/ai/GuidePill', () => ({
  GuidePill: () => null,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EnergyHubScreen } from '../EnergyHubScreen';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('EnergyHubScreen — re-homed library entries', () => {
  it('renders the Journal secondary entry and navigates to the Journal route', () => {
    const { getByTestId } = render(<EnergyHubScreen />);
    const journal = getByTestId('energy-hub-secondary-journal');
    fireEvent.press(journal);
    expect(mockNavigate).toHaveBeenCalledWith('Journal');
  });

  it('renders the Learn entry and navigates to the Masterclass route', () => {
    const { getByTestId } = render(<EnergyHubScreen />);
    const learn = getByTestId('energy-hub-secondary-learn');
    fireEvent.press(learn);
    expect(mockNavigate).toHaveBeenCalledWith('Masterclass');
  });

  it('keeps the three protocol category cards primary', () => {
    const { getByTestId } = render(<EnergyHubScreen />);
    expect(getByTestId('energy-hub-card-regulate')).toBeTruthy();
    expect(getByTestId('energy-hub-card-rest')).toBeTruthy();
    expect(getByTestId('energy-hub-card-fuel')).toBeTruthy();
  });
});
