// Learn tab root — IA restructure step 2. Same contract as the Practices shell:
// it mounts, it says it is unfinished, and there is nothing to press.

import React from 'react';
import { render } from '@testing-library/react-native';

import { LearnHubScreen } from '../LearnHubScreen';

describe('LearnHubScreen — step 2 shell', () => {
  it('mounts as a tab root', () => {
    const { getByTestId, getByText } = render(<LearnHubScreen />);

    expect(getByTestId('learn-hub')).toBeTruthy();
    expect(getByText('Learn')).toBeTruthy();
  });

  it('renders placeholder copy still marked as a copy gap', () => {
    const { getByText } = render(<LearnHubScreen />);

    expect(getByText(/^\[COPY GAP\]/)).toBeTruthy();
  });

  it('has nothing tappable', () => {
    const { UNSAFE_root } = render(<LearnHubScreen />);

    const pressable = UNSAFE_root.findAll(
      (node: { props?: Record<string, unknown> }) =>
        typeof node.props?.onPress === 'function' ||
        node.props?.accessibilityRole === 'button'
    );

    expect(pressable).toHaveLength(0);
  });
});
