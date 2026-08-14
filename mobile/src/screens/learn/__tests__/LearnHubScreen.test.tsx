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

  // DELETED: 'renders placeholder copy still marked as a copy gap', which
  // asserted getByText(/^\[COPY GAP\]/). Its only job was proving the on-screen
  // marker rendered, and that convention is retired: no marker text may reach
  // the UI, so there is nothing left for it to assert. The tab's body text is
  // covered by the mount test above.

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
