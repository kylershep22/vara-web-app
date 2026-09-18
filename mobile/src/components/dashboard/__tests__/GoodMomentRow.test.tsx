import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

import { GoodMomentRow } from '../GoodMomentRow';
import { GOOD_MOMENT_ROW_LABEL } from '../goodMoments.copy';
import { Colors, SizeTokens } from '../../../constants';

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('GoodMomentRow — the one string and the one action', () => {
  it('renders the approved label', () => {
    const { getByText } = render(<GoodMomentRow onPress={jest.fn()} />);
    expect(getByText('Add a good moment')).toBeTruthy();
    expect(GOOD_MOMENT_ROW_LABEL).toBe('Add a good moment');
  });

  it('calls onPress when the row is actually pressed', () => {
    // fireEvent, not a read of props.onPress: reading the prop proves the prop
    // was passed, not that the row is pressable.
    const onPress = jest.fn();
    const { getByTestId } = render(<GoodMomentRow onPress={onPress} />);

    fireEvent.press(getByTestId('good-moment-row'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('GoodMomentRow — it has to read as a control', () => {
  it('announces as a button with a hint about what the tap does', () => {
    const { getByTestId } = render(<GoodMomentRow onPress={jest.fn()} />);
    const row = getByTestId('good-moment-row');

    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Add a good moment');
    expect(row.props.accessibilityHint).toBeTruthy();
  });

  it('paints the label in the interactive colour, not the body colour', () => {
    // TODAY-CARD-AFFORDANCES is the inverse defect one screen up: a title that
    // reads as a control and is not one. A Charcoal label here would be this
    // one — an action that reads as a heading.
    const { getByTestId } = render(<GoodMomentRow onPress={jest.fn()} />);
    const style = flatten(getByTestId('good-moment-row-label').props.style);

    expect(style.color).toBe(Colors.evergreenTeal);
    expect(style.color).not.toBe(Colors.softCharcoal);
  });

  it('keeps the 48pt touch target', () => {
    const { getByTestId } = render(<GoodMomentRow onPress={jest.fn()} />);
    const style = flatten(getByTestId('good-moment-row').props.style);

    expect(style.minHeight).toBe(SizeTokens.touchTargetMin);
  });

  it('is a row, not a card: no surface, border, radius or shadow', () => {
    const { getByTestId } = render(<GoodMomentRow onPress={jest.fn()} />);
    const style = flatten(getByTestId('good-moment-row').props.style);

    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth).toBeUndefined();
    expect(style.borderRadius).toBeUndefined();
    expect(style.shadowOpacity).toBeUndefined();
    expect(style.elevation).toBeUndefined();
  });
});

describe('GoodMomentRow — one state, always', () => {
  it('takes no data prop, so it cannot vary by what was saved', () => {
    // Roadmap section 8: one tap, optional, never counted. A row that changed
    // after the first save would be counting to one in public. The type has no
    // second prop; this pins the rendered output too.
    const first = render(<GoodMomentRow onPress={jest.fn()} />);
    const firstJson = JSON.stringify(first.toJSON());
    first.unmount();

    const second = render(<GoodMomentRow onPress={jest.fn()} />);
    expect(JSON.stringify(second.toJSON())).toBe(firstJson);
  });

  it('shows no count, tick or quantity of any kind', () => {
    const { queryByText, toJSON } = render(<GoodMomentRow onPress={jest.fn()} />);

    expect(queryByText(/\d/)).toBeNull();
    expect(queryByText(/added/i)).toBeNull();
    expect(queryByText(/saved/i)).toBeNull();
    expect(JSON.stringify(toJSON())).not.toContain('check');
  });
});
