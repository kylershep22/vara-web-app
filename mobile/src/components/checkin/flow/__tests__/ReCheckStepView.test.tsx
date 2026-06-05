// Phase 2.8.3 — verify the re-check H1 renders in Evergreen Teal
// per UI Standards section 4.2. Pre-2.8.3 the headline was Soft
// Charcoal; this test locks the corrected color so future drift
// is caught.

import React from 'react';
import { render } from '@testing-library/react-native';

import { ReCheckStepView } from '../ReCheckStepView';
import { Colors } from '../../../../constants';

// Minimal Protocol fixture — ReCheckStepView only reads `protocol.name`.
// Casting as any avoids dragging the full Protocol type into the test.
const TEST_PROTOCOL = { name: 'Box Breathing' } as any;

describe('ReCheckStepView — H1 color (Phase 2.8.3)', () => {
  it('renders the "How are you now?" headline in Evergreen Teal', () => {
    const { getByTestId } = render(
      <ReCheckStepView protocol={TEST_PROTOCOL} onSelect={jest.fn()} />
    );

    const title = getByTestId('checkin-flow-re-check-title');
    const titleStyle = Array.isArray(title.props.style)
      ? Object.assign({}, ...title.props.style)
      : title.props.style;

    expect(titleStyle.color).toBe(Colors.evergreenTeal);
  });
});
