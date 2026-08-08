// CapacityResetCard — the dynamic in-week re-set (spec 7) on Home.
//
// Presentation only; the write lives in useTodayCard. What this guards is the
// shape of the control:
//
//   - Both directions are ONE TAP with no confirmation.
//   - At either end of the ladder the missing direction is a NOTE, never a
//     button that would do nothing. A tappable that does nothing teaches the
//     user the screen is broken.
//   - The tier order is read through the engine helpers, so this file never
//     restates it.
//   - Neither direction is framed as a failure or a reward: continuity is
//     measured against the floor commitment and never against the tier.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { CapacityResetCard } from '../CapacityResetCard';
import { TODAY_COPY } from '../../../screens/weekly/copy';

const props = (over: Record<string, unknown> = {}) => ({
  capacityCurrent: 'limited' as const,
  resetting: false,
  resetFailed: false,
  onChangeTier: jest.fn(),
  ...over,
});

describe('CapacityResetCard', () => {
  describe('both directions, one tap, no confirmation', () => {
    test('stepping down reports the transition from the tier on screen', () => {
      const onChangeTier = jest.fn();
      const screen = render(<CapacityResetCard {...props({ onChangeTier })} />);

      fireEvent.press(screen.getByTestId('home-reset-down'));

      expect(onChangeTier).toHaveBeenCalledTimes(1);
      expect(onChangeTier).toHaveBeenCalledWith('limited', 'slammed');
    });

    test('stepping up reports the transition from the tier on screen', () => {
      const onChangeTier = jest.fn();
      const screen = render(<CapacityResetCard {...props({ onChangeTier })} />);

      fireEvent.press(screen.getByTestId('home-reset-up'));

      expect(onChangeTier).toHaveBeenCalledWith('limited', 'normal');
    });
  });

  describe('the ends of the ladder', () => {
    test('the top tier offers no step up, and says so', () => {
      const screen = render(<CapacityResetCard {...props({ capacityCurrent: 'normal' })} />);

      expect(screen.queryByTestId('home-reset-up')).toBeNull();
      expect(screen.getByTestId('home-reset-down')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.resetAtHighest)).toBeTruthy();
    });

    test('the bottom tier offers no step down, and says so', () => {
      const screen = render(<CapacityResetCard {...props({ capacityCurrent: 'slammed' })} />);

      expect(screen.queryByTestId('home-reset-down')).toBeNull();
      expect(screen.getByTestId('home-reset-up')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.resetAtLowest)).toBeTruthy();
    });

    test('the middle tier offers both and states no edge', () => {
      const screen = render(<CapacityResetCard {...props()} />);

      expect(screen.getByTestId('home-reset-down')).toBeTruthy();
      expect(screen.getByTestId('home-reset-up')).toBeTruthy();
      expect(screen.queryByTestId('home-reset-edge')).toBeNull();
    });
  });

  describe('while a write is in flight', () => {
    test('both directions are disabled, so a second tap cannot land', () => {
      const onChangeTier = jest.fn();
      const screen = render(
        <CapacityResetCard {...props({ resetting: true, onChangeTier })} />
      );

      fireEvent.press(screen.getByTestId('home-reset-down'));

      expect(onChangeTier).not.toHaveBeenCalled();
    });
  });

  describe('when the write failed', () => {
    test('says the week is unchanged', () => {
      const screen = render(<CapacityResetCard {...props({ resetFailed: true })} />);

      expect(screen.getByTestId('home-reset-error')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.resetFailed)).toBeTruthy();
    });

    test('shows no error until one happens', () => {
      const screen = render(<CapacityResetCard {...props()} />);

      expect(screen.queryByTestId('home-reset-error')).toBeNull();
    });
  });
});
