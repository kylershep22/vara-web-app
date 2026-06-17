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

import { SlimResetAffordance } from '../SlimResetAffordance';
import { OVERWHELM_DEFAULT_PROTOCOL_ID } from '../../../constants/overwhelmDefaults';

beforeEach(() => mockNavigate.mockClear());

describe('SlimResetAffordance', () => {
  it('renders the mockup copy (label + "2 min ›")', () => {
    const { getByText } = render(<SlimResetAffordance />);
    expect(getByText('Need a reset right now?')).toBeTruthy();
    expect(getByText('2 min ›')).toBeTruthy();
  });

  it('reuses the locked overwhelm entry on press', () => {
    const { getByTestId } = render(<SlimResetAffordance />);
    fireEvent.press(getByTestId('dashboard-slim-reset'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'overwhelm_safety_card',
      protocolId: OVERWHELM_DEFAULT_PROTOCOL_ID,
    });
  });

  it('honors the onPress override', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SlimResetAffordance onPress={onPress} />);
    fireEvent.press(getByTestId('dashboard-slim-reset'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
