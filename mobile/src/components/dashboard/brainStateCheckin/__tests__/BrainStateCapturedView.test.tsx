import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BrainStateCapturedView } from '../BrainStateCapturedView';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('BrainStateCapturedView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the selected state label, description, and dot', () => {
    const { getByText, getByTestId } = render(
      <BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />
    );
    expect(getByText('Clear')).toBeTruthy();
    expect(getByText('Calm, present, ready')).toBeTruthy();
    expect(getByTestId('brain-state-dot-clear')).toBeTruthy();
  });

  it('shows a checkmark on the selected state row', () => {
    const { getByTestId } = render(
      <BrainStateCapturedView selectedState="foggy" onComplete={jest.fn()} />
    );
    expect(getByTestId('brain-state-check-foggy')).toBeTruthy();
  });

  it('renders all five options initially so non-winners can fade', () => {
    const { getByTestId } = render(
      <BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />
    );
    expect(getByTestId('brain-state-dot-wired')).toBeTruthy();
    expect(getByTestId('brain-state-dot-foggy')).toBeTruthy();
    expect(getByTestId('brain-state-dot-okay')).toBeTruthy();
    expect(getByTestId('brain-state-dot-clear')).toBeTruthy();
    expect(getByTestId('brain-state-dot-energized')).toBeTruthy();
  });

  it('calls onComplete after 1200ms', () => {
    const onComplete = jest.fn();
    render(<BrainStateCapturedView selectedState="clear" onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1199);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires the success haptic at ~800ms', () => {
    const haptics = require('expo-haptics');
    render(<BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />);

    expect(haptics.notificationAsync).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});
