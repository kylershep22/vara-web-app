import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { CheckInInvite } from '../CheckInInvite';

beforeEach(() => mockNavigate.mockClear());

describe('CheckInInvite', () => {
  it('renders the bright invite with the mockup sub-line', () => {
    const { getByTestId, getByText } = render(<CheckInInvite />);
    expect(getByTestId('dashboard-checkin-invite')).toBeTruthy();
    expect(getByText('How are you right now?')).toBeTruthy();
    expect(getByText('A quick check-in, then one thing that fits.')).toBeTruthy();
  });

  it('launches the standard check-in on press', () => {
    const { getByTestId } = render(<CheckInInvite />);
    fireEvent.press(getByTestId('dashboard-checkin-invite'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'standard',
    });
  });

  it('honors the onPress override', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<CheckInInvite onPress={onPress} />);
    fireEvent.press(getByTestId('dashboard-checkin-invite'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
