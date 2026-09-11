/**
 * The C2 card on Today (journey slice 7b).
 *
 * TWO GUARANTEES, AND THE FIRST IS THE ONE THE PACK ASKED FOR IN WRITING.
 *
 *   1. THE CARD NEVER NARRATES THE TRIGGER. "Do not tell the user that two
 *      negative weekly responses triggered this." That is a claim about what is
 *      rendered, so it is tested against the rendered tree rather than against
 *      the constant: a card that interpolated the count into a body, or added
 *      an explanatory line of its own, would pass a constants test and fail
 *      this one.
 *
 *   2. THE TWO BODIES ARE EXCLUSIVE, and which one shows is the only thing the
 *      decline count is allowed to change on screen. R5's continuity is the
 *      word "still" and nothing more.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AdjustmentCard } from '../AdjustmentCard';
import { ADJUST_COPY } from '../../../constants/journeyCopy';

const noop = () => {};

describe('AdjustmentCard - the two bodies', () => {
  test('the first offer shows the first body and NOT the second', () => {
    render(
      <AdjustmentCard isSecondOffer={false} onTryDifferent={noop} onKeepGoing={noop} />
    );
    expect(screen.getByText(ADJUST_COPY.bodyFirst)).toBeTruthy();
    expect(screen.queryByText(ADJUST_COPY.bodySecond)).toBeNull();
  });

  test('the second offer shows the second body and NOT the first', () => {
    render(
      <AdjustmentCard isSecondOffer onTryDifferent={noop} onKeepGoing={noop} />
    );
    expect(screen.getByText(ADJUST_COPY.bodySecond)).toBeTruthy();
    expect(screen.queryByText(ADJUST_COPY.bodyFirst)).toBeNull();
  });

  test('the title and both controls are the same on either offer', () => {
    // The variation is one word in one sentence. A second offer that also
    // changed its title or its decline label would be the card commenting on
    // the user's history through the back door.
    for (const isSecondOffer of [false, true]) {
      const view = render(
        <AdjustmentCard
          isSecondOffer={isSecondOffer}
          onTryDifferent={noop}
          onKeepGoing={noop}
        />
      );
      expect(screen.getByText(ADJUST_COPY.title)).toBeTruthy();
      expect(screen.getByText(ADJUST_COPY.primary)).toBeTruthy();
      expect(screen.getByText(ADJUST_COPY.decline)).toBeTruthy();
      view.unmount();
    }
  });
});

describe('AdjustmentCard - it never narrates the trigger', () => {
  const rendered = (isSecondOffer: boolean): string => {
    render(
      <AdjustmentCard
        isSecondOffer={isSecondOffer}
        onTryDifferent={noop}
        onKeepGoing={noop}
      />
    );
    return screen
      .root.findAllByType(Text)
      .map((n: any) => (typeof n.props.children === 'string' ? n.props.children : ''))
      .join(' ');
  };

  test('no digit appears anywhere on the card, in either state', () => {
    for (const second of [false, true]) {
      expect(rendered(second)).not.toMatch(/\d/);
      screen.unmount();
    }
  });

  test('nothing on the card claims the practices did not work', () => {
    // Two not_moving reads say the user does not currently FEEL movement. They
    // do not say the practices were useless, and the card may not imply it.
    const text = rendered(true).toLowerCase();
    for (const phrase of [
      'not working',
      "wasn't working",
      'useless',
      'failed',
      'twice',
      'two weeks',
      'pattern',
      'we noticed',
    ]) {
      expect(text).not.toContain(phrase);
    }
  });

  test('the body is conditional, not declarative', () => {
    // Jen's own reason for the revision: the conditional "stays conditional
    // rather than declaring an internal state". Both bodies open with "If".
    expect(ADJUST_COPY.bodyFirst.startsWith('If ')).toBe(true);
    expect(ADJUST_COPY.bodySecond.startsWith('If ')).toBe(true);
  });
});

describe('AdjustmentCard - the controls', () => {
  test('the primary fires and does not decline', () => {
    const onTryDifferent = jest.fn();
    const onKeepGoing = jest.fn();
    render(
      <AdjustmentCard
        isSecondOffer={false}
        onTryDifferent={onTryDifferent}
        onKeepGoing={onKeepGoing}
      />
    );
    // fireEvent, not a props read: asserting `props.onPress` is the handler
    // proves the prop was passed, never that the element is pressable.
    fireEvent.press(screen.getByTestId('home-adjustment-try-different'));
    expect(onTryDifferent).toHaveBeenCalledTimes(1);
    expect(onKeepGoing).not.toHaveBeenCalled();
  });

  test('the decline fires and opens nothing', () => {
    const onTryDifferent = jest.fn();
    const onKeepGoing = jest.fn();
    render(
      <AdjustmentCard
        isSecondOffer
        onTryDifferent={onTryDifferent}
        onKeepGoing={onKeepGoing}
      />
    );
    fireEvent.press(screen.getByTestId('home-adjustment-keep-going'));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
    expect(onTryDifferent).not.toHaveBeenCalled();
  });

  test('both controls carry a button role and a label', () => {
    render(
      <AdjustmentCard isSecondOffer={false} onTryDifferent={noop} onKeepGoing={noop} />
    );
    for (const [testID, label] of [
      ['home-adjustment-try-different', ADJUST_COPY.primary],
      ['home-adjustment-keep-going', ADJUST_COPY.decline],
    ] as const) {
      const node = screen.getByTestId(testID);
      expect(node.props.accessibilityRole).toBe('button');
      expect(node.props.accessibilityLabel).toBe(label);
    }
  });

  test('the decline has the same reach as the primary', () => {
    // Staying with what they are doing is a real answer and never a failure
    // state, so it gets the same 48pt target and no warning colour.
    render(
      <AdjustmentCard isSecondOffer={false} onTryDifferent={noop} onKeepGoing={noop} />
    );
    const decline = screen.getByTestId('home-adjustment-keep-going');
    const flat = StyleSheet.flatten(decline.props.style);
    expect(flat.minHeight).toBe(48);
  });
});
