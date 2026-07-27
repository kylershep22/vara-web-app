// HabitCompletionSheet routing — a REGRESSION GUARD for the legacy field.
//
// This sheet routes on `habit.category === 'Connection'`, an exact-string read
// of the OLD free-text category. The new controlled `habitCategory` taxonomy
// added alongside it contains a coincidentally-named `connection` key that
// means something different and must never influence this decision.
//
// These tests exist so that adding, changing or eventually retiring the new
// field cannot silently drop Connection habits into the standard sheet.

jest.mock('../../shared/EnhancedModal', () => {
  const { View } = jest.requireActual('react-native');
  return { EnhancedModal: ({ children }: any) => <View>{children}</View> };
});

jest.mock('../StandardSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return { StandardSheet: () => <Text testID="standard-sheet">standard</Text> };
});

jest.mock('../ConnectionSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return { ConnectionSheet: () => <Text testID="connection-sheet">connection</Text> };
});

import React from 'react';
import { render } from '@testing-library/react-native';

import { HabitCompletionSheet } from '../index';

function renderSheet(habit: Record<string, any>) {
  return render(
    <HabitCompletionSheet
      habit={habit as any}
      visible
      source="track"
      onComplete={jest.fn()}
      onDismiss={jest.fn()}
    />
  );
}

const BASE = { id: 'h1', name: 'Call a friend', type: 'daily', frequency: 7, active: true };

describe('legacy category still drives Connection routing', () => {
  it('routes to the connection sheet on the legacy value', () => {
    const { getByTestId } = renderSheet({ ...BASE, category: 'Connection' });
    expect(getByTestId('connection-sheet')).toBeTruthy();
  });

  it('routes to the standard sheet for any other legacy value', () => {
    const { getByTestId } = renderSheet({ ...BASE, category: 'Fitness' });
    expect(getByTestId('standard-sheet')).toBeTruthy();
  });

  it('routes to the standard sheet when the legacy value is absent', () => {
    const { getByTestId } = renderSheet({ ...BASE });
    expect(getByTestId('standard-sheet')).toBeTruthy();
  });

  it('keeps routing on the legacy value when the new field is also set', () => {
    // Both fields present, disagreeing. The legacy one wins, because it is the
    // one this reader was written against.
    const { getByTestId } = renderSheet({
      ...BASE,
      category: 'Connection',
      habitCategory: 'movement',
    });
    expect(getByTestId('connection-sheet')).toBeTruthy();
  });

  it('does NOT route on the new taxonomy key alone', () => {
    // `habitCategory: 'connection'` is a different vocabulary. A habit created
    // after the capture shipped has no legacy value, so it belongs in the
    // standard sheet exactly as it did before this slice.
    const { getByTestId } = renderSheet({ ...BASE, habitCategory: 'connection' });
    expect(getByTestId('standard-sheet')).toBeTruthy();
  });
});
