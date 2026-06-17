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

import { RightNowAcknowledgment } from '../RightNowAcknowledgment';
import {
  NEUTRAL_ACKNOWLEDGMENT,
  ACKNOWLEDGMENT_SUBLINE,
} from '../stateAcknowledgment';

beforeEach(() => mockNavigate.mockClear());

describe('RightNowAcknowledgment', () => {
  it('renders the felt phrase + label + completion-agnostic sub-line', () => {
    const { getByText, getByTestId } = render(
      <RightNowAcknowledgment quadrant="Calm" />
    );
    expect(getByText('Right now')).toBeTruthy();
    expect(getByTestId('dashboard-right-now-phrase').props.children).toBe('Settled');
    expect(getByText(ACKNOWLEDGMENT_SUBLINE)).toBeTruthy();
  });

  it('shows the neutral line when no quadrant is available', () => {
    const { getByTestId } = render(<RightNowAcknowledgment quadrant={null} />);
    expect(getByTestId('dashboard-right-now-phrase').props.children).toBe(
      NEUTRAL_ACKNOWLEDGMENT
    );
  });

  it('relaunches the standard check-in on "Check in again"', () => {
    const { getByTestId } = render(<RightNowAcknowledgment quadrant="Tense" />);
    fireEvent.press(getByTestId('dashboard-right-now-change'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'standard',
    });
  });

  it('honors the onChangePress override', () => {
    const onChangePress = jest.fn();
    const { getByTestId } = render(
      <RightNowAcknowledgment quadrant="Tense" onChangePress={onChangePress} />
    );
    fireEvent.press(getByTestId('dashboard-right-now-change'));
    expect(onChangePress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
