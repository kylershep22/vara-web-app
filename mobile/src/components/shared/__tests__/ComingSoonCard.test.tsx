// ComingSoonCard — the inert placeholder treatment. The point of these tests is
// the *absence* of affordance: it must never be pressable, never announce as a
// button, and never carry countdown / anticipation copy.

import React from 'react';
import { render } from '@testing-library/react-native';

import { ComingSoonCard } from '../ComingSoonCard';

describe('ComingSoonCard', () => {
  it('renders the title, body, and a quiet "Coming soon" tag', () => {
    const { getByText } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." />
    );
    expect(getByText('Time blocking')).toBeTruthy();
    expect(getByText('Shape the day.')).toBeTruthy();
    expect(getByText('Coming soon')).toBeTruthy();
  });

  it('is announced as static text, never as a button', () => {
    const { getByTestId } = render(
      <ComingSoonCard title="Task batching" body="Group similar work." testID="soon" />
    );
    const card = getByTestId('soon');
    expect(card.props.accessibilityRole).toBe('text');
    expect(card.props.accessible).toBe(true);
    expect(card.props.accessibilityLabel).toBe(
      'Task batching. Group similar work. Coming soon.'
    );
  });

  it('carries no press handler at all', () => {
    const { getByTestId } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." testID="soon" />
    );
    const card = getByTestId('soon');
    expect(card.props.onPress).toBeUndefined();
    expect(card.props.onStartShouldSetResponder).toBeUndefined();
  });

  it('has no countdown or hype copy', () => {
    const { queryByText } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." />
    );
    expect(queryByText(/unlocks in/i)).toBeNull();
    expect(queryByText(/\bnew\b/i)).toBeNull();
    expect(queryByText(/soon!/i)).toBeNull();
  });
});
