// Text — the shared text primitive (UI Standards 5.1).
//
// WHAT THESE TESTS ARE FOR. The primitive's whole job is producing a resolved
// `style` with the right `fontFamily` on it, so that is what is asserted: the
// flattened style of the rendered host element, not a prop the primitive was
// handed. Asserting that a prop went in and came out proves nothing about the
// resolution.
//
// THE FOUR NESTING SHAPES are the real gate and they are taken from the
// R1a Step 0 inventory of every `Text`-inside-`Text` site in `src/` (16 sites,
// 12 files, all one level deep):
//
//   A  parent has NO weight, child HAS one   (6 files, e.g. SignupScreen's
//                                             terms link inside body copy)
//   B  parent HAS a weight, child has NONE   (ProgressUpdateModal's preview
//                                             suffix inside a bold price;
//                                             HabitCategorySelect's required
//                                             marker inside a medium prompt)
//   C  BOTH have weights                     (ConsolidatedMetricsCard)
//   D  parent bold, child '400'              (PricingSelector, after this
//                                             slice fixes fontWeight.normal)
//
// Shape B is the one that fails if the nesting context is wrong, and it fails
// SILENTLY: the child renders Regular inside a Bold parent and the emphasis is
// destroyed in reverse. The mutation check at the bottom of this file pins it.

import React from 'react';
import { StyleSheet, Platform, Text as RNText, type TextStyle } from 'react-native';
import { render } from '@testing-library/react-native';

import { Typography } from '../../../constants';
import Text, { AnimatedText, resolveFontFamily } from '../Text';

const styleOf = (el: { props: { style?: unknown } }): TextStyle =>
  (StyleSheet.flatten(el.props.style) ?? {}) as TextStyle;

describe('Text — weight to family mapping', () => {
  // Every value in the R1a Step 0 distribution table: the four
  // Typography.fontWeight tokens (which ARE these strings), the two React
  // Native keywords, and the numeric forms.
  const cases: Array<[string, unknown, string]> = [
    ['token regular / 400', Typography.fontWeight.regular, Typography.fontFamily.regular],
    ['token medium / 500', Typography.fontWeight.medium, Typography.fontFamily.medium],
    ['token semibold / 600', Typography.fontWeight.semibold, Typography.fontFamily.semibold],
    ['token bold / 700', Typography.fontWeight.bold, Typography.fontFamily.bold],
    ["literal '400'", '400', Typography.fontFamily.regular],
    ["literal '500'", '500', Typography.fontFamily.medium],
    ["literal '600'", '600', Typography.fontFamily.semibold],
    ["literal '700'", '700', Typography.fontFamily.bold],
    ["keyword 'bold'", 'bold', Typography.fontFamily.bold],
    ["keyword 'normal'", 'normal', Typography.fontFamily.regular],
    ['numeric 600', 600, Typography.fontFamily.semibold],
  ];

  it.each(cases)('%s resolves to the right face', (_label, weight, family) => {
    const { getByTestId } = render(
      <Text testID="t" style={{ fontWeight: weight as never }}>
        Handgloves
      </Text>
    );
    expect(styleOf(getByTestId('t')).fontFamily).toBe(family);
  });

  it('resolves the weight from a FLATTENED style, not the prop as written', () => {
    // Weight arrives three ways in this codebase: a preset spread, a style
    // array, and an inline object. A resolver reading the prop directly sees
    // only the third.
    const preset = StyleSheet.create({ p: { fontWeight: Typography.fontWeight.semibold } });
    const { getByTestId } = render(
      <Text testID="t" style={[preset.p, { color: 'rgba(0,0,0,1)' }]}>
        Handgloves
      </Text>
    );
    expect(styleOf(getByTestId('t')).fontFamily).toBe(Typography.fontFamily.semibold);
  });

  it('defaults a top-level Text with no weight to Regular', () => {
    const { getByTestId } = render(<Text testID="t">Handgloves</Text>);
    expect(styleOf(getByTestId('t')).fontFamily).toBe(Typography.fontFamily.regular);
  });

  it('lets an explicit fontFamily win over the weight lookup', () => {
    // This is what keeps the seven `fontFamily: 'monospace'` sites monospace:
    // ErrorBoundary's stack trace and the six _dev harness blocks.
    const { getByTestId } = render(
      <Text testID="t" style={{ fontFamily: 'monospace', fontWeight: '700' }}>
        Handgloves
      </Text>
    );
    expect(styleOf(getByTestId('t')).fontFamily).toBe('monospace');
  });
});

describe('Text — the four nesting shapes', () => {
  it('shape A: parent with no weight takes Regular, child with a weight takes its own', () => {
    const { getByTestId } = render(
      <Text testID="parent">
        I agree to the{' '}
        <Text testID="child" style={{ fontWeight: Typography.fontWeight.medium }}>
          Terms of Service
        </Text>
      </Text>
    );
    expect(styleOf(getByTestId('parent')).fontFamily).toBe(Typography.fontFamily.regular);
    expect(styleOf(getByTestId('child')).fontFamily).toBe(Typography.fontFamily.medium);
  });

  it('shape B: a nested child with NO weight emits no fontFamily and inherits', () => {
    // THE TRAP. If the child emitted Regular here, the preview suffix would go
    // light inside a bold price and nobody would see a test fail.
    const { getByTestId } = render(
      <Text testID="parent" style={{ fontWeight: Typography.fontWeight.bold }}>
        42%
        <Text testID="child">{' '}preview</Text>
      </Text>
    );
    expect(styleOf(getByTestId('parent')).fontFamily).toBe(Typography.fontFamily.bold);
    expect(styleOf(getByTestId('child'))).not.toHaveProperty('fontFamily');
  });

  it('shape B, second instance: medium parent, marker child', () => {
    const { getByTestId } = render(
      <Text testID="parent" style={{ fontWeight: Typography.fontWeight.medium }}>
        Pick a category
        <Text testID="child"> *</Text>
      </Text>
    );
    expect(styleOf(getByTestId('parent')).fontFamily).toBe(Typography.fontFamily.medium);
    expect(styleOf(getByTestId('child'))).not.toHaveProperty('fontFamily');
  });

  it('shape C: both weights resolve independently and stay distinguishable', () => {
    const { getByTestId } = render(
      <Text testID="parent" style={{ fontWeight: '700' }}>
        12
        <Text testID="child" style={{ fontWeight: '600' }}>
          {' '}up
        </Text>
      </Text>
    );
    expect(styleOf(getByTestId('parent')).fontFamily).toBe(Typography.fontFamily.bold);
    expect(styleOf(getByTestId('child')).fontFamily).toBe(Typography.fontFamily.semibold);
    expect(styleOf(getByTestId('parent')).fontFamily).not.toBe(
      styleOf(getByTestId('child')).fontFamily
    );
  });

  it('shape D: PricingSelector — a regular suffix inside a bold price', () => {
    // Before this slice the child read `Typography.fontWeight.normal`, a key
    // that does not exist, so the value was undefined and the suffix inherited
    // Bold. With the corrected token it is Regular, which is a visible change
    // on the paywall and is why the walk has a step for it.
    const { getByTestId } = render(
      <Text testID="price" style={{ fontWeight: Typography.fontWeight.bold }}>
        $9.99
        <Text testID="period" style={{ fontWeight: Typography.fontWeight.regular }}>
          /month
        </Text>
      </Text>
    );
    expect(styleOf(getByTestId('price')).fontFamily).toBe(Typography.fontFamily.bold);
    expect(styleOf(getByTestId('period')).fontFamily).toBe(Typography.fontFamily.regular);
  });

  it('nesting is dynamic, not lexical: a Text reached through a component is still nested', () => {
    // The design must not depend on anyone having enumerated the nesting sites.
    const Inner = () => <Text testID="child">inner</Text>;
    const { getByTestId } = render(
      <Text testID="parent" style={{ fontWeight: Typography.fontWeight.semibold }}>
        <Inner />
      </Text>
    );
    expect(styleOf(getByTestId('child'))).not.toHaveProperty('fontFamily');
  });
});

describe('Text — Dynamic Type ceiling', () => {
  it('applies Typography.maxFontScale by default', () => {
    const { getByTestId } = render(<Text testID="t">Handgloves</Text>);
    expect(getByTestId('t').props.maxFontSizeMultiplier).toBe(Typography.maxFontScale);
    expect(Typography.maxFontScale).toBe(1.3);
  });

  it('lets an explicit maxFontSizeMultiplier win', () => {
    const { getByTestId } = render(
      <Text testID="t" maxFontSizeMultiplier={1}>
        Handgloves
      </Text>
    );
    expect(getByTestId('t').props.maxFontSizeMultiplier).toBe(1);
  });
});

describe('Text — platform weight handling', () => {
  const original = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('iOS keeps fontWeight alongside the resolved family', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { getByTestId } = render(
      <Text testID="t" style={{ fontWeight: Typography.fontWeight.bold }}>
        Handgloves
      </Text>
    );
    const s = styleOf(getByTestId('t'));
    expect(s.fontFamily).toBe(Typography.fontFamily.bold);
    expect(s.fontWeight).toBe(Typography.fontWeight.bold);
  });

  it('Android strips fontWeight once a family is resolved (synthetic-bold guard)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { getByTestId } = render(
      <Text testID="t" style={{ fontWeight: Typography.fontWeight.bold }}>
        Handgloves
      </Text>
    );
    const s = styleOf(getByTestId('t'));
    expect(s.fontFamily).toBe(Typography.fontFamily.bold);
    expect(s).not.toHaveProperty('fontWeight');
  });

  it('Android leaves the weight alone when no family is resolved (nested inherit)', () => {
    // Stripping the weight here would change what the child inherits.
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { getByTestId } = render(
      <Text testID="parent" style={{ fontWeight: Typography.fontWeight.bold }}>
        a
        <Text testID="child" style={{ color: 'rgba(0,0,0,1)' }}>
          b
        </Text>
      </Text>
    );
    expect(styleOf(getByTestId('child'))).not.toHaveProperty('fontFamily');
  });
});

describe('Text — prop compatibility', () => {
  it('forwards a ref, which createAnimatedComponent requires', () => {
    const ref = React.createRef<RNText>();
    render(
      <Text testID="t" ref={ref}>
        Handgloves
      </Text>
    );
    expect(ref.current).not.toBeNull();
  });

  it('exports an AnimatedText built over the primitive', () => {
    expect(AnimatedText).toBeTruthy();
  });

  it('passes accessibility and test props straight through', () => {
    const { getByTestId } = render(
      <Text testID="t" accessibilityRole="header" numberOfLines={2}>
        Handgloves
      </Text>
    );
    expect(getByTestId('t').props.accessibilityRole).toBe('header');
    expect(getByTestId('t').props.numberOfLines).toBe(2);
  });
});

describe('resolveFontFamily — the resolver in isolation', () => {
  // The mutation control for shape B. `resolveFontFamily(flat, nested)` is the
  // single decision the nesting context feeds; calling it with nested=false is
  // exactly what a broken provider would do, and it must NOT return undefined.
  it('nested with no weight returns undefined; not-nested returns Regular', () => {
    expect(resolveFontFamily({}, true)).toBeUndefined();
    expect(resolveFontFamily({}, false)).toBe(Typography.fontFamily.regular);
  });

  it('a broken provider would turn shape B into Regular, which is the failure', () => {
    // Documents the mutation rather than performing it: if NestedTextContext
    // defaulted to false or the provider were removed, the shape B tests above
    // would see this value instead of undefined.
    expect(resolveFontFamily({}, false)).not.toBeUndefined();
  });
});
