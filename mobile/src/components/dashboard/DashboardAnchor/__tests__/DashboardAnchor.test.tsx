import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { DashboardAnchor } from '../DashboardAnchor';
import { getBrainStateBrief } from '../brainStateBriefs';

const foggyBrief = getBrainStateBrief('foggy');

const baseProps = {
  brainState: 'foggy' as const,
  onChangeStatePress: jest.fn(),
};

describe('DashboardAnchor', () => {
  it('renders the canonical brain-state card (label + message)', () => {
    const { getByText } = render(<DashboardAnchor {...baseProps} />);
    expect(getByText('Foggy')).toBeTruthy();
    expect(getByText(foggyBrief.message)).toBeTruthy();
  });

  it('calls onChangeStatePress when Change is tapped', () => {
    const onChangeStatePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchor {...baseProps} onChangeStatePress={onChangeStatePress} />
    );
    fireEvent.press(getByText('Change'));
    expect(onChangeStatePress).toHaveBeenCalledTimes(1);
  });

  // Regression guard for the removed sticky strip: the card must render
  // in normal document flow so it scrolls away with the rest of the
  // dashboard content rather than staying pinned to the top. Pinning was
  // previously achieved with position/transform/zIndex on a scroll-driven
  // Animated wrapper; none of those should be present anymore.
  it('does not pin to the top (no sticky positioning)', () => {
    const { getByTestId } = render(<DashboardAnchor {...baseProps} />);
    const card = getByTestId('dashboard-anchor-card');
    const flat = StyleSheet.flatten(card.props.style) || {};
    expect(flat.position).not.toBe('absolute');
    expect(flat.transform).toBeUndefined();
    expect(flat.zIndex).toBeUndefined();
  });
});
