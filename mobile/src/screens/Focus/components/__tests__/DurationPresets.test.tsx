import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DurationPresets, DURATION_CUSTOM_MIN, DURATION_CUSTOM_MAX } from '../DurationPresets';

const noop = () => {};

describe('DurationPresets', () => {
  it('renders 25 / 90 / Custom and marks 25 selected by default', () => {
    const { getByTestId } = render(
      <DurationPresets selectedDuration={25} onDurationChange={noop} />
    );
    expect(getByTestId('duration-preset-25')).toBeTruthy();
    expect(getByTestId('duration-preset-90')).toBeTruthy();
    expect(getByTestId('duration-preset-custom')).toBeTruthy();
    expect(getByTestId('duration-preset-25').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('duration-preset-90').props.accessibilityState.selected).toBe(false);
  });

  it('tapping 90 min selects the long cycle', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <DurationPresets selectedDuration={25} onDurationChange={onChange} />
    );
    fireEvent.press(getByTestId('duration-preset-90'));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('tapping 25 min selects the short cycle', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <DurationPresets selectedDuration={90} onDurationChange={onChange} />
    );
    fireEvent.press(getByTestId('duration-preset-25'));
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('does not show the custom input until Custom is tapped', () => {
    const { queryByTestId, getByTestId } = render(
      <DurationPresets selectedDuration={25} onDurationChange={noop} />
    );
    expect(queryByTestId('duration-custom-input')).toBeNull();
    fireEvent.press(getByTestId('duration-preset-custom'));
    expect(getByTestId('duration-custom-input')).toBeTruthy();
  });

  it('a valid custom value drives the duration', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <DurationPresets selectedDuration={25} onDurationChange={onChange} />
    );
    fireEvent.press(getByTestId('duration-preset-custom'));
    fireEvent.changeText(getByTestId('duration-custom-input'), '40');
    expect(onChange).toHaveBeenLastCalledWith(40);
    expect(queryOrNull(getByTestId, 'duration-custom-error')).toBeNull();
  });

  it.each(['0', '-5', 'abc', '', String(DURATION_CUSTOM_MAX + 1), String(DURATION_CUSTOM_MIN - 1)])(
    'rejects invalid custom value %p: no onDurationChange, shows an error (except empty)',
    (bad) => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <DurationPresets selectedDuration={25} onDurationChange={onChange} />
      );
      fireEvent.press(getByTestId('duration-preset-custom'));
      onChange.mockClear();
      fireEvent.changeText(getByTestId('duration-custom-input'), bad);
      expect(onChange).not.toHaveBeenCalled();
      if (bad !== '') {
        expect(queryByTestId('duration-custom-error')).toBeTruthy();
      }
    }
  );

  it('preselects Custom and shows the value when selectedDuration is a custom number', () => {
    const { getByTestId } = render(
      <DurationPresets selectedDuration={40} onDurationChange={noop} />
    );
    expect(getByTestId('duration-preset-custom').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('duration-preset-25').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('duration-custom-input').props.value).toBe('40');
  });

  it('exposes sensible bounds', () => {
    expect(DURATION_CUSTOM_MIN).toBe(5);
    expect(DURATION_CUSTOM_MAX).toBe(180);
  });
});

// Small helper: getByTestId throws if absent, so guard for the "no error" case.
function queryOrNull(getByTestId: (id: string) => unknown, id: string): unknown {
  try {
    return getByTestId(id);
  } catch {
    return null;
  }
}
