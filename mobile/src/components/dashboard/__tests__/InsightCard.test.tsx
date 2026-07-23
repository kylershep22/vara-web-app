import React from 'react';
import { render } from '@testing-library/react-native';

import { InsightCard } from '../InsightCard';

describe('InsightCard', () => {
  it('leads with the insight title, with no eyebrow ahead of it', () => {
    const { getByText, queryByText } = render(
      <InsightCard insight={{ title: 'Test title', body: 'Test body line.' }} />
    );
    expect(queryByText('A small insight')).toBeNull();
    expect(getByText('Test title')).toBeTruthy();
    expect(getByText('Test body line.')).toBeTruthy();
  });

  it('keeps the icon tile, which was anchored to the heading block not the eyebrow', () => {
    const { UNSAFE_getAllByType } = render(
      <InsightCard insight={{ title: 'Test title', body: 'Test body line.' }} />
    );
    const { MaterialCommunityIcons } = require('@expo/vector-icons');
    const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
    expect(icons.some((i: any) => i.props.name === 'lightbulb-outline')).toBe(true);
  });

  it('falls back to today\'s curated insight when none is injected', () => {
    const { getByTestId } = render(<InsightCard />);
    expect(getByTestId('dashboard-insight')).toBeTruthy();
  });
});
