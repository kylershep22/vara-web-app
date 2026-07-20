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

beforeEach(() => mockNavigate.mockClear());

describe('RightNowAcknowledgment', () => {
  it('acknowledges the completed practice — never a state readback', () => {
    const { getByTestId, queryByText } = render(
      <RightNowAcknowledgment practiceName="Extended Exhale" />
    );
    expect(getByTestId('dashboard-right-now-completion').props.children).toBe(
      'Extended Exhale, done.'
    );
    // No state label, no "From your check-in." sub-line.
    expect(queryByText('Right now')).toBeNull();
    expect(queryByText('From your check-in.')).toBeNull();
  });

  it('adds the time of day when a completion time is available', () => {
    const { getByTestId } = render(
      <RightNowAcknowledgment
        practiceName="Box Breathing"
        completedAt={new Date(2026, 6, 20, 8, 0, 0)}
      />
    );
    expect(getByTestId('dashboard-right-now-completion').props.children).toBe(
      'Box Breathing, done this morning.'
    );
  });

  it('renders nothing when no practice completed — the slot collapses', () => {
    const { queryByTestId } = render(
      <RightNowAcknowledgment practiceName={null} />
    );
    expect(queryByTestId('dashboard-right-now')).toBeNull();
    expect(queryByTestId('dashboard-right-now-completion')).toBeNull();
  });

  it('relaunches the standard check-in on "Check in again"', () => {
    const { getByTestId } = render(
      <RightNowAcknowledgment practiceName="Box Breathing" />
    );
    fireEvent.press(getByTestId('dashboard-right-now-change'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'standard',
    });
  });

  it('honors the onChangePress override', () => {
    const onChangePress = jest.fn();
    const { getByTestId } = render(
      <RightNowAcknowledgment
        practiceName="Box Breathing"
        onChangePress={onChangePress}
      />
    );
    fireEvent.press(getByTestId('dashboard-right-now-change'));
    expect(onChangePress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
