/**
 * MomentOfRecognitionModal Tests
 * (Formerly StreakMilestoneModal)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import MomentOfRecognitionModal from '../StreakMilestoneModal';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
    Easing: { out: jest.fn(() => jest.fn()), ease: {} },
  };
});

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('MomentOfRecognitionModal', () => {
  it('does not display a streak number', () => {
    const { toJSON } = render(
      <MomentOfRecognitionModal visible={true} onDismiss={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    // Should not contain any number that looks like a streak count
    expect(json).not.toMatch(/\d+ day streak/i);
    expect(json).not.toMatch(/streak/i);
  });

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <MomentOfRecognitionModal visible={false} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders a continue button when visible', () => {
    const { getByText } = render(
      <MomentOfRecognitionModal visible={true} onDismiss={jest.fn()} />
    );
    expect(getByText('Continue')).toBeTruthy();
  });
});
