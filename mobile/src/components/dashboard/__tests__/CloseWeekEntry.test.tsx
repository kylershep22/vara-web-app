// CloseWeekEntry — the entry to the weekly close (spec 8) on Home.
//
// Outlined, not filled, and last on the surface. Spec 9 allows Home ONE primary
// action and that is the daily completion control; this is a quiet way into a
// ritual that belongs to the end of the week, not a second CTA competing with
// today's.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { CloseWeekEntry } from '../CloseWeekEntry';
import { OUTCOME_LABELS, TODAY_COPY } from '../../../screens/weekly/copy';
import type { WeeklyCycle } from '../../../types/models';

// 2026-08-16 is a SUNDAY and 2026-08-22 the Saturday that ends that week, so
// "next week starts" should resolve to Sunday again.
const cycle = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: '2026-08-16',
    weekEnd: '2026-08-22',
    outcome: 'routines',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'routines-normal',
    ...over,
  }) as WeeklyCycle;

describe('CloseWeekEntry', () => {
  describe('while the week is open', () => {
    test('opens the close on press', () => {
      const onPress = jest.fn();
      const screen = render(<CloseWeekEntry closed={false} cycle={cycle()} onPress={onPress} />);

      fireEvent.press(screen.getByTestId('home-close-entry'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    test('carries the close-entry label', () => {
      const screen = render(<CloseWeekEntry closed={false} cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.getByText(TODAY_COPY.closeEntry)).toBeTruthy();
    });

    test('is announced as a button', () => {
      const screen = render(<CloseWeekEntry closed={false} cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.getByTestId('home-close-entry').props.accessibilityRole).toBe('button');
    });

    test('shows no acknowledgment', () => {
      const screen = render(<CloseWeekEntry closed={false} cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-week-closed')).toBeNull();
    });
  });

  describe('once the week is closed', () => {
    // The close stops being an available action and becomes a STATEMENT of
    // where the week got to. Replaced rather than hidden: hiding answers "can I
    // close again?" without answering "did it work?", and the reported symptom
    // was not knowing whether the close had landed.

    test('the tappable entry is gone', () => {
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-close-entry')).toBeNull();
    });

    test('an acknowledgment stands in its place', () => {
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.getByTestId('home-week-closed')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.weekClosed)).toBeTruthy();
    });

    test('the acknowledgment is NOT tappable', () => {
      // It may never become a second CTA competing with today's completion
      // control, and there is nothing left to do here anyway.
      const onPress = jest.fn();
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={onPress} />);

      const node = screen.getByTestId('home-week-closed');
      expect(node.props.onPress).toBeUndefined();
      expect(node.props.accessibilityRole).not.toBe('button');
      expect(onPress).not.toHaveBeenCalled();
    });

    test('names the outcome the week was run on', () => {
      // The acknowledgment should close a named week, not an anonymous seven
      // days the user has to remember the shape of.
      const screen = render(
        <CloseWeekEntry closed cycle={cycle({ outcome: 'routines' })} onPress={jest.fn()} />
      );

      expect(screen.getByTestId('home-week-closed-outcome')).toBeTruthy();
      expect(screen.getByText(OUTCOME_LABELS.routines)).toBeTruthy();
    });

    test('says when the next week starts, from the stored boundary', () => {
      // weekEnd + 1 IS the next anchor by construction. Saturday 2026-08-22
      // ends the week, so the next one begins Sunday.
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.getByTestId('home-week-closed-next')).toBeTruthy();
      expect(screen.getByText(/Sunday/)).toBeTruthy();
    });

    test('omits the next-week line for a legacy cycle with no stored boundary', () => {
      // resolveWeekEnd would fall back to weekStart + 6, naming a weekday this
      // user never chose. Saying nothing is more honest than saying that.
      const screen = render(
        <CloseWeekEntry closed cycle={cycle({ weekEnd: undefined })} onPress={jest.fn()} />
      );

      expect(screen.queryByTestId('home-week-closed-next')).toBeNull();
    });

    test('still acknowledges the close for a legacy cycle', () => {
      // Only the boundary line is gated. The acknowledgment itself, and the
      // outcome, do not depend on a stored weekEnd.
      const screen = render(
        <CloseWeekEntry closed cycle={cycle({ weekEnd: undefined })} onPress={jest.fn()} />
      );

      expect(screen.getByTestId('home-week-closed')).toBeTruthy();
      expect(screen.getByTestId('home-week-closed-outcome')).toBeTruthy();
    });

    test('does not count down to the next week', () => {
      // Calm orientation, never urgency. "Next week starts Sunday" is a place;
      // "3 days left" is a deadline, and the weekly model exists to remove that.
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.queryByText(/days? left|remaining|hurry|only \d/i)).toBeNull();
    });

    test('does not celebrate, score or congratulate', () => {
      // Neutral accountability. A close is a close whether the floor held or
      // not, and the count that follows it is measured elsewhere.
      const screen = render(<CloseWeekEntry closed cycle={cycle()} onPress={jest.fn()} />);

      expect(screen.queryByText(/%/)).toBeNull();
      expect(screen.queryByText(/streak|congrat|well done|nice work|score/i)).toBeNull();
    });
  });
});
