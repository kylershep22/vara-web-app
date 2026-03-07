/**
 * AnimatedCheckbox Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AnimatedCheckbox from '../AnimatedCheckbox';

// Track the mock return value so tests can change it
let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
    withSequence: (...args: any[]) => args[args.length - 1],
    Easing: { out: jest.fn(() => jest.fn()), ease: {} },
    interpolate: (_val: any, _input: any, output: any) => output[output.length - 1],
  };
});

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

describe('AnimatedCheckbox', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('renders in unchecked state', () => {
    const { getByRole } = render(
      <AnimatedCheckbox status="unchecked" onPress={jest.fn()} />
    );
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('renders in checked state', () => {
    const { getByRole } = render(
      <AnimatedCheckbox status="checked" onPress={jest.fn()} />
    );
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AnimatedCheckbox status="unchecked" onPress={onPress} />
    );
    fireEvent.press(getByRole('checkbox'));
    await waitFor(() => {
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AnimatedCheckbox status="unchecked" onPress={onPress} disabled />
    );
    fireEvent.press(getByRole('checkbox'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('respects useReducedMotion', () => {
    mockReducedMotion = true;
    const { getByRole } = render(
      <AnimatedCheckbox status="unchecked" onPress={jest.fn()} />
    );
    // Component renders without error when reduced motion is on
    expect(getByRole('checkbox')).toBeTruthy();
  });
});
