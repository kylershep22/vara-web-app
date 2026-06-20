import React from 'react';
import { render } from '@testing-library/react-native';

import { InsightCard } from '../InsightCard';

describe('InsightCard', () => {
  it('renders the eyebrow cap, injected title + body', () => {
    const { getByText } = render(
      <InsightCard insight={{ title: 'Test title', body: 'Test body line.' }} />
    );
    expect(getByText('A small insight')).toBeTruthy();
    expect(getByText('Test title')).toBeTruthy();
    expect(getByText('Test body line.')).toBeTruthy();
  });

  it('falls back to today\'s curated insight when none is injected', () => {
    const { getByTestId } = render(<InsightCard />);
    expect(getByTestId('dashboard-insight')).toBeTruthy();
  });
});
