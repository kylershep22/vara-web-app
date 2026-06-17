import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SuggestedActionCard } from '../SuggestedActionCard';
import type { Protocol } from '../../../types/models';

const protocol = {
  id: 'coherence-breathing-5',
  name: 'Coherence Breathing',
  timeWindow: 5,
} as unknown as Protocol;

describe('SuggestedActionCard', () => {
  it('renders the practice name and duration', () => {
    const { getByText } = render(
      <SuggestedActionCard protocol={protocol} onStart={jest.fn()} />
    );
    expect(getByText('Coherence Breathing')).toBeTruthy();
    expect(getByText('5 min')).toBeTruthy();
  });

  it('fires onStart when the CTA is pressed', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <SuggestedActionCard protocol={protocol} onStart={onStart} />
    );
    fireEvent.press(getByTestId('dashboard-suggested-action-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
