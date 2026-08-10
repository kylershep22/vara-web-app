// OnboardingV3WeekStart — the arc's week-start step.
//
// Two things worth pinning. Sunday is 0, so every falsy-guard bug in this arc
// eats exactly one answer and no other; and the step is SKIPPABLE, because a
// null start day is a legitimate outcome that falls back to the open-date
// anchoring the app already had.
//
// Also covers the arc's shape, which nothing pinned before: V3_ORDER drives the
// step indicator but NOT the navigate chain, so the two can silently disagree.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('../../../../components/onboarding/OnboardingScaffold', () => ({
  OnboardingScaffold: ({ onPrimary, onSkip, children }: any) => {
    const { Text, TouchableOpacity, View } = require('react-native');
    return (
      <View>
        <TouchableOpacity testID="v3-primary" onPress={onPrimary}>
          <Text>continue</Text>
        </TouchableOpacity>
        {onSkip && (
          <TouchableOpacity testID="v3-skip" onPress={onSkip}>
            <Text>skip</Text>
          </TouchableOpacity>
        )}
        {children}
      </View>
    );
  },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { OnboardingV3WeekStartScreen } from '../OnboardingV3WeekStartScreen';
import { OnboardingV3Provider } from '../OnboardingV3Context';
import { V3_ORDER, V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from '../routes';

const renderStep = () =>
  render(
    <OnboardingV3Provider>
      <OnboardingV3WeekStartScreen />
    </OnboardingV3Provider>
  );

describe('OnboardingV3WeekStartScreen', () => {
  beforeEach(() => mockNavigate.mockReset());

  test('offers all seven days', () => {
    const screen = renderStep();

    for (let day = 0; day <= 6; day++) {
      expect(screen.getByTestId(`v3-weekstart-${day}`)).toBeTruthy();
    }
  });

  test('marks the tapped day as selected', () => {
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-weekstart-3'));

    expect(screen.getByTestId('v3-weekstart-3').props.accessibilityState.selected).toBe(
      true
    );
    expect(screen.getByTestId('v3-weekstart-4').props.accessibilityState.selected).toBe(
      false
    );
  });

  test('selecting is single-choice', () => {
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-weekstart-1'));
    fireEvent.press(screen.getByTestId('v3-weekstart-5'));

    expect(screen.getByTestId('v3-weekstart-1').props.accessibilityState.selected).toBe(
      false
    );
    expect(screen.getByTestId('v3-weekstart-5').props.accessibilityState.selected).toBe(
      true
    );
  });

  test('SUNDAY is selectable, and 0 is not swallowed as falsy', () => {
    // The whole arc guards on `!== null` for this field precisely because
    // Sunday is 0. If a truthiness check creeps back in anywhere, Sunday is the
    // one answer that vanishes, and only this assertion would notice.
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-weekstart-0'));

    expect(screen.getByTestId('v3-weekstart-0').props.accessibilityState.selected).toBe(
      true
    );
  });

  test('announces the full day name, not the abbreviation', () => {
    const screen = renderStep();

    expect(screen.getByTestId('v3-weekstart-3').props.accessibilityLabel).toBe(
      'Wednesday'
    );
  });

  test('continuing advances to the first-win step', () => {
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-weekstart-2'));
    fireEvent.press(screen.getByTestId('v3-primary'));

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.FirstWin);
  });

  test('is skippable, and skipping still advances', () => {
    // A null start day falls back to open-date anchoring, which is exactly what
    // the app did before this question existed. Skipping costs nothing.
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-skip'));

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.FirstWin);
  });

  test('continuing without a selection is allowed', () => {
    // The primary is never disabled: an unanswered week start is a real
    // outcome, not an incomplete form.
    const screen = renderStep();

    fireEvent.press(screen.getByTestId('v3-primary'));

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.FirstWin);
  });
});

describe('the V3 arc shape', () => {
  test('is nine steps', () => {
    expect(V3_TOTAL_STEPS).toBe(9);
  });

  test('week-start sits between the floor and the first win', () => {
    expect(v3StepNumber(V3_ROUTES.WeekStart)).toBe(v3StepNumber(V3_ROUTES.Floor) + 1);
    expect(v3StepNumber(V3_ROUTES.FirstWin)).toBe(
      v3StepNumber(V3_ROUTES.WeekStart) + 1
    );
  });

  test('every route in V3_ROUTES appears exactly once in V3_ORDER', () => {
    // V3_ORDER drives the step indicator. A route missing from it renders
    // "step 0 of 9"; a duplicate quietly renumbers everything after it.
    const names = Object.values(V3_ROUTES);
    expect([...V3_ORDER].sort()).toEqual([...names].sort());
    expect(new Set(V3_ORDER).size).toBe(V3_ORDER.length);
  });
});
