// ProtocolListItem — unit suite, added WITH the extraction (IA step 4b-ii-a).
//
// This row lived inside EnergyBrowseListScreen until this slice, and that screen
// has no unit suite of its own: its entire safety net was one integration test
// (components/checkin/flow/__tests__/BrowseRunFlow.prerollExit.integration.test.tsx),
// which exercises the row only incidentally on its way to the player. Moving a
// component out from behind its only coverage without giving it any of its own
// is how a silent regression gets in, so the coverage arrives in the same commit
// as the move.
//
// What these assertions are actually protecting: the row now renders on TWO
// surfaces (Energy browse lists, Stress Recovery). Everything below is a
// property both surfaces depend on and neither owns.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ProtocolListItem } from '../ProtocolListItem';
import type { Protocol } from '../../../types/models';

// Minimal fixture: only the four fields the row actually reads. Cast rather than
// fully populated on purpose — spelling out all ~20 Protocol fields would make
// this suite fail whenever the catalog TYPE grows, which says nothing about the
// row. A real catalog protocol is exercised end to end by the integration tests.
const protocol = {
  id: 'nsdr-10',
  name: 'NSDR',
  description: 'A guided non-sleep deep rest session.',
  timeWindow: 10,
} as Protocol;

describe('ProtocolListItem', () => {
  it('renders the practice name, duration and description', () => {
    const { getByText } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="x"
        onPress={jest.fn()}
      />
    );

    expect(getByText('NSDR')).toBeTruthy();
    expect(getByText('10 min')).toBeTruthy();
    expect(getByText('A guided non-sleep deep rest session.')).toBeTruthy();
  });

  it('scopes its testID to the calling surface', () => {
    // The reason the prefix is a required prop. Two surfaces render this row;
    // if both emitted the same testID, a failure message would name the wrong
    // screen and the two suites could not both target their own rows.
    const { getByTestId } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="stress-recovery-card"
        onPress={jest.fn()}
      />
    );

    expect(getByTestId('stress-recovery-card-nsdr-10')).toBeTruthy();
  });

  it('keeps the testID Energy has always emitted', () => {
    // Pins the pure-move contract from the other direction. The Energy browse
    // integration test presses `energy-browse-card-nsdr-10` by name; if this
    // composition ever changed, that suite would fail with a confusing
    // "unable to find" rather than pointing here.
    const { getByTestId } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="energy-browse-card"
        onPress={jest.fn()}
      />
    );

    expect(getByTestId('energy-browse-card-nsdr-10')).toBeTruthy();
  });

  it('announces itself as a button naming the practice and its length', () => {
    const { getByTestId } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="x"
        onPress={jest.fn()}
      />
    );

    const row = getByTestId('x-nsdr-10');
    expect(row.props.accessibilityRole).toBe('button');
    // Duration is in the label, not only in the visual row: a screen-reader
    // user picking a practice while activated needs the length before they
    // commit to it, not after.
    expect(row.props.accessibilityLabel).toBe('Start NSDR, 10 min');
  });

  it('calls onPress once when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="x"
        onPress={onPress}
      />
    );

    fireEvent.press(getByTestId('x-nsdr-10'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates a long description rather than growing the row', () => {
    const { getByText } = render(
      <ProtocolListItem
        protocol={protocol}
        testIDPrefix="x"
        onPress={jest.fn()}
      />
    );

    // Two lines, so a long catalog description cannot push the next practice
    // off the fold. The lists are scanned, not read.
    expect(getByText(protocol.description).props.numberOfLines).toBe(2);
  });
});
