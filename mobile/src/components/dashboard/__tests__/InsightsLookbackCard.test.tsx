/**
 * InsightsLookbackCard (B-3d.6) — Insights' quiet dashboard launch home.
 *
 * Guards reachability (tap -> Insights) and the outcomes-led copy.
 */

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InsightsLookbackCard } from '../InsightsLookbackCard';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('InsightsLookbackCard', () => {
  it('renders quiet, outcomes-led copy (no analytics/stats framing)', () => {
    const { getByText } = render(<InsightsLookbackCard />);
    expect(getByText('Look back')).toBeTruthy();
    expect(getByText('A gentle look at your patterns over time.')).toBeTruthy();
  });

  it('navigates to the Insights screen on press', () => {
    const { getByTestId } = render(<InsightsLookbackCard />);
    fireEvent.press(getByTestId('insights-lookback-card'));
    expect(mockNavigate).toHaveBeenCalledWith('Insights');
  });
});
