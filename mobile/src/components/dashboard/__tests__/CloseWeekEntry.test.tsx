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
  test('opens the close on press', () => {
    const onPress = jest.fn();
    const screen = render(<CloseWeekEntry onPress={onPress} />);

    fireEvent.press(screen.getByTestId('home-close-entry'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('carries the close-entry label', () => {
    const screen = render(<CloseWeekEntry onPress={jest.fn()} />);

    expect(screen.getByText(TODAY_COPY.closeEntry)).toBeTruthy();
  });

  test('is announced as a button', () => {
    const screen = render(<CloseWeekEntry onPress={jest.fn()} />);

    expect(screen.getByTestId('home-close-entry').props.accessibilityRole).toBe('button');
  });
});
