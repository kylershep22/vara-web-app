// BUG 1 (entry point): the dashboard check-in card must launch the NEW flow at
// situation_pick via entrySource 'standard' — not the retired five-state chips
// / state_preselected entry that bridged into the middle of the flow.

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } }),
}));

jest.mock('../../../hooks/useBrainStateWeekTrend', () => ({
  useBrainStateWeekTrend: () => ({ days: [], summary: null }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BrainStateCheckin } from '../BrainStateCheckin';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('BrainStateCheckin — dashboard entry launches the new flow', () => {
  it('pre-checkin renders a single CTA and NO five-state chips', () => {
    const { getByTestId, queryByText } = render(
      <BrainStateCheckin currentCheckIn={null} />
    );
    expect(getByTestId('brain-state-checkin-cta')).toBeTruthy();
    // The old five-state chips are retired as the entry.
    expect(queryByText('Wired')).toBeNull();
    expect(queryByText('Foggy')).toBeNull();
    expect(queryByText('Steady')).toBeNull();
    expect(queryByText('Clear')).toBeNull();
    expect(queryByText('Alive')).toBeNull();
  });

  it('tapping the CTA navigates to CheckInFlow with entrySource "standard"', () => {
    const { getByTestId } = render(<BrainStateCheckin currentCheckIn={null} />);
    fireEvent.press(getByTestId('brain-state-checkin-cta'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'standard',
    });
  });

  it('post-checkin "Change" also relaunches the standard flow (no state_preselected)', () => {
    const { getByText } = render(
      <BrainStateCheckin currentCheckIn={{ brainState: 'steady' }} />
    );
    // Collapsed view shows the bridged state + a Change affordance.
    fireEvent.press(getByText('Change'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'standard',
    });
  });
});
