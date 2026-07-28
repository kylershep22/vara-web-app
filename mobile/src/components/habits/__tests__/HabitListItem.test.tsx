// HabitListItem — the habit preview card, and specifically the category chip.
//
// The chip closes the loop on a field the user is REQUIRED to pick at creation:
// a required value that never reappears reads as busywork. These tests pin that
// it shows the friendly label (never the stored key, never the derived pillar),
// that it uses the shared Tag rather than a bespoke chip style, and that a habit
// created before the capture renders no chip at all rather than an empty one.

jest.mock('../../celebrations', () => {
  const { View } = jest.requireActual('react-native');
  return { AnimatedCheckbox: () => <View testID="checkbox" /> };
});

import React from 'react';
import { render } from '@testing-library/react-native';

import { HabitListItem } from '../HabitListItem';
import {
  HABIT_CATEGORY_KEYS,
  HABIT_CATEGORY_LABELS,
  HABIT_CATEGORY_MAPPING,
} from '../../../constants/habitTaxonomy';

function habitFixture(over: Record<string, any> = {}) {
  return {
    id: 'h1',
    userId: 'u1',
    name: 'Morning walk',
    type: 'daily',
    frequency: 7,
    streak: 0,
    longestStreak: 0,
    active: true,
    ...over,
  } as any;
}

function renderCard(over: Record<string, any> = {}) {
  return render(
    <HabitListItem
      habit={habitFixture(over)}
      isCompleted={false}
      onToggle={jest.fn()}
      onNavigateToDetail={jest.fn()}
    />
  );
}

describe('HabitListItem — the category chip', () => {
  it.each([...HABIT_CATEGORY_KEYS])('shows the friendly label for %s', (key) => {
    const { getByTestId } = renderCard({ habitCategory: key });
    const chip = getByTestId('habit-card-category');
    expect(chip).toBeTruthy();
    // The chip's own text node carries the label.
    const { getByText } = renderCard({ habitCategory: key });
    expect(getByText(HABIT_CATEGORY_LABELS[key])).toBeTruthy();
  });

  it('never renders the stored key', () => {
    const { queryByText } = renderCard({ habitCategory: 'sleep_rest' });
    expect(queryByText('sleep_rest')).toBeNull();
    expect(queryByText(/_/)).toBeNull();
  });

  it('never renders the derived pillar', () => {
    // 'connection' maps to pillar 'community'; the card shows neither the key
    // nor the pillar, only the label.
    const { getByText, queryByText } = renderCard({ habitCategory: 'connection' });
    expect(getByText('Connection')).toBeTruthy();
    expect(queryByText('community')).toBeNull();
    expect(HABIT_CATEGORY_MAPPING.connection.pillar).toBe('community');
  });

  it('renders no chip for a habit created before the capture', () => {
    const { queryByTestId } = renderCard(); // no habitCategory at all
    expect(queryByTestId('habit-card-category')).toBeNull();
  });

  it('renders no chip for an explicit null, and no empty tag or "None"', () => {
    const { queryByTestId, queryByText } = renderCard({ habitCategory: null });
    expect(queryByTestId('habit-card-category')).toBeNull();
    expect(queryByText('None')).toBeNull();
    expect(queryByText('')).toBeNull();
  });

  it('renders no chip for an unrecognised stored value', () => {
    const { queryByTestId } = renderCard({ habitCategory: 'not_a_key' });
    expect(queryByTestId('habit-card-category')).toBeNull();
  });
});

describe('HabitListItem — the chip is the shared Tag, used inertly', () => {
  it('adds no second touch target inside the card', () => {
    // Tag only wraps itself in a TouchableOpacity when given onPress. Passing
    // none keeps it a plain View, so it cannot compete with the card's own tap.
    const { getByTestId } = renderCard({ habitCategory: 'movement' });
    const chip = getByTestId('habit-card-category');
    expect(chip.props.onPress).toBeUndefined();
    expect(chip.props.accessibilityRole).toBeUndefined();
  });

  it('uses the shared Tag default variant, not a bespoke style', () => {
    const { getByTestId } = renderCard({ habitCategory: 'movement' });
    const flat = Object.assign(
      {},
      ...[getByTestId('habit-card-category').props.style].flat(Infinity).filter(Boolean)
    );
    // Tag's `default` variant: Dew Sage background (8.02:1 against Soft
    // Charcoal). NOT `sage`, whose muted text fails AA at this size.
    expect(flat.backgroundColor).toBe('#D5E3D1');
  });
});

describe('HabitListItem — the rest of the card is undisturbed', () => {
  it('still shows the habit name alongside the chip', () => {
    const { getByText } = renderCard({ habitCategory: 'movement' });
    expect(getByText('Morning walk')).toBeTruthy();
    expect(getByText('Movement')).toBeTruthy();
  });

  it('leaves the legacy CR badge driven by the legacy field only', () => {
    // 'Fitness' is a CR-flagged LEGACY category. The new key must neither
    // create nor suppress that badge.
    const { getByText } = renderCard({ category: 'Fitness', habitCategory: 'movement' });
    expect(getByText('🌿 CR')).toBeTruthy();
    expect(getByText('Movement')).toBeTruthy();
  });

  it('shows no CR badge for a new habit carrying only the controlled key', () => {
    const { queryByText, getByText } = renderCard({ habitCategory: 'movement' });
    expect(queryByText('🌿 CR')).toBeNull();
    expect(getByText('Movement')).toBeTruthy();
  });
});
