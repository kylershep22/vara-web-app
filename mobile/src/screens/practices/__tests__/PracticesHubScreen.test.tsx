// Practices tab root — IA restructure step 2.
//
// A shell has exactly two things worth pinning: it mounts (so the tab is real
// and walkable), and it offers nothing to press (so nobody walks the build and
// reports a broken button that was never wired). The second assertion is the
// one that earns its keep: content lands here in steps 3-5, and this test fails
// the moment something tappable arrives without the destination to match.

import React from 'react';
import { render } from '@testing-library/react-native';

import { PracticesHubScreen } from '../PracticesHubScreen';

describe('PracticesHubScreen — step 2 shell', () => {
  it('mounts as a tab root', () => {
    const { getByTestId, getByText } = render(<PracticesHubScreen />);

    expect(getByTestId('practices-hub')).toBeTruthy();
    expect(getByText('Practices')).toBeTruthy();
  });

  it('renders placeholder copy still marked as a copy gap', () => {
    const { getByText } = render(<PracticesHubScreen />);

    // The marker renders ON SCREEN, per the weekly-loop convention: a
    // walkthrough build must never be mistaken for finished product.
    expect(getByText(/^\[COPY GAP\]/)).toBeTruthy();
  });

  it('has nothing tappable', () => {
    const { UNSAFE_root } = render(<PracticesHubScreen />);

    const pressable = UNSAFE_root.findAll(
      (node: { props?: Record<string, unknown> }) =>
        typeof node.props?.onPress === 'function' ||
        node.props?.accessibilityRole === 'button'
    );

    expect(pressable).toHaveLength(0);
  });
});
