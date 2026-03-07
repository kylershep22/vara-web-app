/**
 * QuietFinish Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import QuietFinish from '../QuietFinish';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any, _config: any, cb: any) => {
      if (cb) cb(true);
      return val;
    },
    withDelay: (_delay: number, val: any) => val,
    Easing: { in: jest.fn(() => jest.fn()), out: jest.fn(() => jest.fn()), ease: {} },
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('QuietFinish', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders when visible is true', () => {
    const { toJSON } = render(
      <QuietFinish visible={true} onDismiss={jest.fn()} />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('does not render when visible is false', () => {
    const { toJSON } = render(
      <QuietFinish visible={false} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('auto-dismisses after 2.5 seconds (reduced motion path)', () => {
    const onDismiss = jest.fn();
    render(<QuietFinish visible={true} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not contain streak or confetti language', () => {
    const { toJSON } = render(
      <QuietFinish visible={true} onDismiss={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toMatch(/streak/i);
    expect(json).not.toMatch(/confetti/i);
  });
});
