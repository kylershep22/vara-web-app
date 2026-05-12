jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EndEarlyConfirmModal } from '../EndEarlyConfirmModal';
import * as Haptics from 'expo-haptics';

describe('EndEarlyConfirmModal', () => {
  beforeEach(() => {
    (Haptics.impactAsync as jest.Mock).mockClear();
  });

  it('renders the body copy aligned with the trigger verb', () => {
    const { getByText } = render(
      <EndEarlyConfirmModal visible onCancel={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(
      getByText("End early? We'll still save this session.")
    ).toBeTruthy();
  });

  it('renders both buttons with verb-aligned labels', () => {
    const { getByTestId } = render(
      <EndEarlyConfirmModal visible onCancel={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(getByTestId('end-early-modal-keep-going')).toBeTruthy();
    expect(getByTestId('end-early-modal-confirm')).toBeTruthy();
  });

  it('does NOT render the body when visible=false', () => {
    const { queryByText } = render(
      <EndEarlyConfirmModal
        visible={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    expect(
      queryByText("End early? We'll still save this session.")
    ).toBeNull();
  });

  it('Keep going calls onCancel and fires light haptic', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <EndEarlyConfirmModal visible onCancel={onCancel} onConfirm={onConfirm} />
    );
    fireEvent.press(getByTestId('end-early-modal-keep-going'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('End early calls onConfirm and fires light haptic', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <EndEarlyConfirmModal visible onCancel={onCancel} onConfirm={onConfirm} />
    );
    fireEvent.press(getByTestId('end-early-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('exposes accessibility labels on both buttons', () => {
    const { getByLabelText } = render(
      <EndEarlyConfirmModal visible onCancel={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(getByLabelText('Keep going')).toBeTruthy();
    expect(getByLabelText('End early')).toBeTruthy();
  });
});
