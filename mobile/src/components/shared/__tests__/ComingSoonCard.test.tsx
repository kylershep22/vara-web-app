// ComingSoonCard — the inert placeholder treatment. The point of these tests is
// the *absence* of affordance: it must never be pressable, never announce as a
// button, and never carry countdown / anticipation copy.

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Colors } from '../../../constants';
import { ComingSoonCard } from '../ComingSoonCard';

describe('ComingSoonCard', () => {
  it('renders the title, body, and a "Coming soon" pill', () => {
    const { getByText } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." />
    );
    expect(getByText('Time blocking')).toBeTruthy();
    expect(getByText('Shape the day.')).toBeTruthy();
    expect(getByText('Coming soon')).toBeTruthy();
  });

  it('uses the standard card surface, not a washed-out mist fill', () => {
    // Regression guard: the card previously sat flush with the mist page wash
    // and read as faint. It must look like a normal card.
    const { getByTestId } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." testID="soon" />
    );
    const style = StyleSheet.flatten(getByTestId('soon').props.style);
    expect(style.backgroundColor).toBe(Colors.surface);
    expect(style.backgroundColor).not.toBe(Colors.mistWhite);
    expect(style.borderColor).toBe(Colors.divider);
    // No elevation: the hero primary card is the only card on the hub with one.
    expect(style.shadowOpacity).toBeUndefined();
    expect(style.elevation).toBeUndefined();
  });

  it('marks status with the shared Tag, in exactly the words "Coming soon"', () => {
    const { getByText, queryByText } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." />
    );
    const pill = getByText('Coming soon');
    // Tag's teal variant: Dew Sage fill, evergreen-teal label. Reused, not
    // a bespoke pill, and not a new colour.
    expect(StyleSheet.flatten(pill.props.style).color).toBe(Colors.evergreenTeal);
    // Walk to the nearest styled ancestor: that is the Tag's own pill container,
    // not the card surface.
    let node: any = pill.parent;
    while (node && !StyleSheet.flatten(node.props?.style)?.backgroundColor) {
      node = node.parent;
    }
    expect(StyleSheet.flatten(node.props.style).backgroundColor).toBe(
      Colors.mintCream
    );
    expect(queryByText(/available soon|coming soon!/i)).toBeNull();
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

  it('does nothing when pressed, and the pill is not pressable either', () => {
    // The normal card surface must not have brought a tap affordance with it.
    const { getByTestId, getByText } = render(
      <ComingSoonCard title="Time blocking" body="Shape the day." testID="soon" />
    );
    expect(() => fireEvent.press(getByTestId('soon'))).not.toThrow();
    expect(() => fireEvent.press(getByText('Coming soon'))).not.toThrow();
    expect(getByTestId('soon').props.accessibilityRole).toBe('text');
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
