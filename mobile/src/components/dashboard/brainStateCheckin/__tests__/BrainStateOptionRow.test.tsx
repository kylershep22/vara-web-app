import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BrainStateOptionRow } from '../BrainStateOptionRow';
import { BRAIN_STATES } from '../brainStateOptions';

const wired = BRAIN_STATES[0];

describe('BrainStateOptionRow', () => {
  it('renders label and description', () => {
    const { getByText } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(getByText('Wired')).toBeTruthy();
    expect(getByText("Racing thoughts, can't settle")).toBeTruthy();
  });

  it('renders a colored dot with the state-specific testID', () => {
    const { getByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(getByTestId('brain-state-dot-wired')).toBeTruthy();
  });

  it('calls onPress with the state when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <BrainStateOptionRow option={wired} onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('wired');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <BrainStateOptionRow option={wired} onPress={onPress} disabled />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a checkmark when selected', () => {
    const { getByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} selected />
    );
    expect(getByTestId('brain-state-check-wired')).toBeTruthy();
  });

  it('does not show a checkmark when not selected', () => {
    const { queryByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(queryByTestId('brain-state-check-wired')).toBeNull();
  });
});
