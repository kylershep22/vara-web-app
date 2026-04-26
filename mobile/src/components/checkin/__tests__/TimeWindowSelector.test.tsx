import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TimeWindowSelector } from '../TimeWindowSelector';

describe('TimeWindowSelector', () => {
  it('renders title, subtitle, and all five chips', () => {
    const { getByTestId, getByText } = render(
      <TimeWindowSelector onSelect={jest.fn()} />
    );
    expect(getByTestId('time-window-title').props.children).toBe(
      'How much time do you have?'
    );
    expect(
      getByText("We'll match you to something that fits.")
    ).toBeTruthy();
    for (const value of [2, 5, 10, 20, 45] as const) {
      expect(getByTestId(`time-window-chip-${value}`)).toBeTruthy();
    }
  });

  it('renders the spec-aligned framing copy on each chip', () => {
    const { getByText } = render(
      <TimeWindowSelector onSelect={jest.fn()} />
    );
    expect(getByText('A quick reset')).toBeTruthy();
    expect(getByText('A meaningful shift')).toBeTruthy();
    expect(getByText('Deeper recovery')).toBeTruthy();
    expect(getByText('Full reset')).toBeTruthy();
    expect(getByText('Focused work or deep rest')).toBeTruthy();
  });

  it('renders the "45+" label on the longest chip (not "45")', () => {
    const { getByText } = render(
      <TimeWindowSelector onSelect={jest.fn()} />
    );
    expect(getByText('45+ minutes')).toBeTruthy();
  });

  it('tapping a chip fires onSelect with that value', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TimeWindowSelector onSelect={onSelect} />
    );
    fireEvent.press(getByTestId('time-window-chip-10'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it('tapping different chips fires onSelect with each value', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TimeWindowSelector onSelect={onSelect} />
    );
    fireEvent.press(getByTestId('time-window-chip-2'));
    fireEvent.press(getByTestId('time-window-chip-45'));
    expect(onSelect).toHaveBeenNthCalledWith(1, 2);
    expect(onSelect).toHaveBeenNthCalledWith(2, 45);
  });

  it('renders Back button only when onBack is provided', () => {
    const { queryByTestId, rerender } = render(
      <TimeWindowSelector onSelect={jest.fn()} />
    );
    expect(queryByTestId('time-window-back')).toBeNull();

    rerender(
      <TimeWindowSelector onSelect={jest.fn()} onBack={jest.fn()} />
    );
    expect(queryByTestId('time-window-back')).not.toBeNull();
  });

  it('Back button fires onBack', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <TimeWindowSelector onSelect={jest.fn()} onBack={onBack} />
    );
    fireEvent.press(getByTestId('time-window-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Close button fires onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TimeWindowSelector onSelect={jest.fn()} onClose={onClose} />
    );
    fireEvent.press(getByTestId('time-window-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('initialValue applies a visual marker to the previously-selected chip but does NOT pre-select', () => {
    // The chip with the matching value renders with a different style;
    // tapping ANY chip (including a different one) still fires onSelect
    // normally. No chip is "pre-selected" in the input-state sense.
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TimeWindowSelector initialValue={10} onSelect={onSelect} />
    );
    // Sanity: initial render doesn't fire onSelect on its own.
    expect(onSelect).not.toHaveBeenCalled();

    // Tapping a different chip than initialValue still works.
    fireEvent.press(getByTestId('time-window-chip-5'));
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});
