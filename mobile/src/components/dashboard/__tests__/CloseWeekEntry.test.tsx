// CloseWeekEntry — the entry to the weekly close (spec 8) on Home.
//
// Outlined, not filled, and last on the surface. Spec 9 allows Home ONE primary
// action and that is the daily completion control; this is a quiet way into a
// ritual that belongs to the end of the week, not a second CTA competing with
// today's.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { CloseWeekEntry } from '../CloseWeekEntry';
import { TODAY_COPY } from '../../../screens/weekly/copy';

describe('CloseWeekEntry', () => {
  describe('while the week is open', () => {
    test('opens the close on press', () => {
      const onPress = jest.fn();
      const screen = render(<CloseWeekEntry closed={false} onPress={onPress} />);

      fireEvent.press(screen.getByTestId('home-close-entry'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    test('carries the close-entry label', () => {
      const screen = render(<CloseWeekEntry closed={false} onPress={jest.fn()} />);

      expect(screen.getByText(TODAY_COPY.closeEntry)).toBeTruthy();
    });

    test('is announced as a button', () => {
      const screen = render(<CloseWeekEntry closed={false} onPress={jest.fn()} />);

      expect(screen.getByTestId('home-close-entry').props.accessibilityRole).toBe('button');
    });

    test('shows no acknowledgment', () => {
      const screen = render(<CloseWeekEntry closed={false} onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-week-closed')).toBeNull();
    });
  });

  describe('once the week is closed', () => {
    // The close stops being an available action and becomes a STATEMENT of
    // where the week got to. Replaced rather than hidden: hiding answers "can I
    // close again?" without answering "did it work?", and the reported symptom
    // was not knowing whether the close had landed.

    test('the tappable entry is gone', () => {
      const screen = render(<CloseWeekEntry closed onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-close-entry')).toBeNull();
    });

    test('an acknowledgment stands in its place', () => {
      const screen = render(<CloseWeekEntry closed onPress={jest.fn()} />);

      expect(screen.getByTestId('home-week-closed')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.weekClosed)).toBeTruthy();
    });

    test('the acknowledgment is NOT tappable', () => {
      // It may never become a second CTA competing with today's completion
      // control, and there is nothing left to do here anyway.
      const onPress = jest.fn();
      const screen = render(<CloseWeekEntry closed onPress={onPress} />);

      const node = screen.getByTestId('home-week-closed');
      expect(node.props.onPress).toBeUndefined();
      expect(node.props.accessibilityRole).not.toBe('button');
      expect(onPress).not.toHaveBeenCalled();
    });

    test('does not celebrate, score or congratulate', () => {
      // Neutral accountability. A close is a close whether the floor held or
      // not, and the count that follows it is measured elsewhere.
      const screen = render(<CloseWeekEntry closed onPress={jest.fn()} />);

      expect(screen.queryByText(/%/)).toBeNull();
      expect(screen.queryByText(/streak|congrat|well done|nice work|score/i)).toBeNull();
    });
  });
});
