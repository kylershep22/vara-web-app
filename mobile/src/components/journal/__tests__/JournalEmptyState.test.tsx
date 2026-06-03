// Verifies the Journal empty-state CTA fires the new-reflection action.
//
// The empty state is extracted into its own presentational component so
// the CTA wiring can be tested without mounting the full JournalScreen
// (which depends on auth, Firestore subscriptions, AI consent, toasts,
// and navigation). This mirrors the project's preference for small,
// directly-testable units over heavy screen integration tests.

// @expo/vector-icons is globally mocked in jest.setup.js to expose only
// MaterialCommunityIcons; the empty state uses Ionicons, so override the
// mock here with a renderable stub.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JournalEmptyState } from '../JournalEmptyState';

describe('JournalEmptyState', () => {
  it('fires onStartReflection when the CTA is pressed', () => {
    const onStartReflection = jest.fn();
    const { getByText } = render(
      <JournalEmptyState onStartReflection={onStartReflection} />
    );

    fireEvent.press(getByText('Start a reflection'));

    expect(onStartReflection).toHaveBeenCalledTimes(1);
  });

  it('renders the headline and non-italic supporting copy', () => {
    const { getByText } = render(
      <JournalEmptyState onStartReflection={jest.fn()} />
    );

    expect(getByText('Every thought matters')).toBeTruthy();
    expect(
      getByText(
        "Capture what's on your mind when you're ready. It only takes a moment."
      )
    ).toBeTruthy();
  });
});
