/**
 * EnergyHubScreen — the Journal entry, and the three category cards.
 *
 * REWRITTEN HEADER (LEARN-REHOUSE). It read "secondary library entries
 * (B-3d.2/B-3d.3)" and described guarding "the library surfaces re-homed into
 * the Energy hub" — plural. B-3d.3's Learn entry is gone: the podcast library
 * it pointed at now lives on the Learn tab, which is the IA roadmap's step 5.
 *
 * So one library surface remains, Journal (B-3d.2, Rest / evening wind-down),
 * and it is a standalone row rather than a member of a section. Its testID is
 * unchanged across that change on purpose — the test below and the device walk
 * both name it, and preserving it is what keeps this guard continuous rather
 * than re-established.
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

  // DELETED (LEARN-REHOUSE): 'renders the Learn entry and navigates to the
  // Masterclass route'. Its subject no longer exists on this screen — the entry
  // was removed, not moved or renamed — so there was nothing to adjust it to.
  // The destination it asserted is now reached from the Learn tab and is
  // covered in screens/learn/__tests__/LearnHubScreen.test.tsx.

  it('renders Journal as a standalone row, not inside a section', () => {
    const { getByTestId, queryByTestId } = render(<EnergyHubScreen />);

    expect(getByTestId('energy-hub-secondary-journal')).toBeTruthy();
    // The grouping dissolved with its second member. If a Learn row ever comes
    // back to this screen it should be a decision, not a reappearance.
    expect(queryByTestId('energy-hub-secondary-learn')).toBeNull();
  });

  it('keeps Journal reachable in its standalone shape', () => {
    const { getByTestId } = render(<EnergyHubScreen />);

    fireEvent.press(getByTestId('energy-hub-secondary-journal'));

    expect(mockNavigate).toHaveBeenCalledWith('Journal');
  });

  it('keeps the three protocol category cards primary', () => {
    const { getByTestId } = render(<EnergyHubScreen />);
    expect(getByTestId('energy-hub-card-regulate')).toBeTruthy();
    expect(getByTestId('energy-hub-card-rest')).toBeTruthy();
    expect(getByTestId('energy-hub-card-fuel')).toBeTruthy();
  });
});
