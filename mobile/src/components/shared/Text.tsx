/**
 * Text — the shared text primitive. UI Standards 5.1.
 *
 * WHY THIS EXISTS. React Native does NOT synthesise a weight from a named
 * custom family: `fontFamily` selects the face and `fontWeight` alone selects
 * nothing from Inter. Before this file, `App.tsx` loaded all four Inter faces
 * at boot and no style in `src/` ever set `fontFamily` to any of them, so the
 * app shipped in the system font with 975 `fontWeight` assignments doing
 * nothing. This primitive is what makes those assignments select a face.
 *
 * It is PROP-COMPATIBLE with React Native's `Text`, so adopting it is an import
 * swap and no JSX changes.
 *
 * THE FOUR THINGS IT DOES:
 *
 * 1. RESOLVES WEIGHT FROM THE *FLATTENED* STYLE, not from the prop as written.
 *    Weight arrives three ways in this codebase — a `TextStyles` preset spread,
 *    a style array, and an inline object — so resolution has to run after
 *    `StyleSheet.flatten` or two of the three are invisible.
 *
 * 2. AN EXPLICIT `fontFamily` ALWAYS WINS. That is what keeps the seven
 *    `fontFamily: 'monospace'` sites (ErrorBoundary and the _dev harnesses)
 *    rendering monospace rather than being overwritten by a weight lookup.
 *
 * 3. REGULAR IS THE DEFAULT AT THE TOP LEVEL ONLY, and this is the one
 *    correctness trap in the file. A nested `<Text>` INHERITS its parent's
 *    family in React Native. Stamping Regular on a nested child with no weight
 *    of its own would flatten every bold run inside a sentence — see shape B in
 *    Text.test.tsx, which is `ProgressUpdateModal`'s preview suffix inside a
 *    bold price and `HabitCategorySelect`'s required marker inside a medium
 *    prompt. `NestedTextContext` is how the primitive knows which it is.
 *
 *    The context is dynamic, not lexical, so a `Text` reached through any
 *    number of intermediate components still reports nested correctly. The
 *    design does not depend on anyone having enumerated the nesting sites.
 *
 * 4. APPLIES THE DYNAMIC TYPE CEILING from one token. 5.3 requires
 *    `maxFontSizeMultiplier` on every Text; a per-file constant cannot deliver
 *    that and cannot be raised in one place later. An explicit prop still wins.
 *
 * PLATFORM RULE (Android synthetic bold). When a family IS resolved, the weight
 * has done its job and the face carries it. iOS keeps `fontWeight` because the
 * system honours it as a hint against the named face. Android does NOT: it
 * applies SYNTHETIC emboldening on top of an already-bold face, which reads as
 * a smeared double-bold. So on Android the weight is stripped once a family is
 * resolved. When no family is resolved (a nested child inheriting), the weight
 * is left alone on both platforms — removing it there would change inheritance.
 */

import React, { createContext, forwardRef, useContext } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  Animated,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { Typography } from '../../constants';

/**
 * True inside another `Text`. Provided only by a TOP-LEVEL Text, so a nested
 * one reads `true` and suppresses the Regular default. See note 3 above.
 */
export const NestedTextContext = createContext(false);

/**
 * The one weight-to-face table. Keys cover every form React Native accepts and
 * every form this codebase uses: the four `Typography.fontWeight` values (which
 * are the strings '400'|'500'|'600'|'700'), the numeric equivalents, and the
 * two keywords.
 *
 * 'normal' maps to Regular and 'bold' to Bold because those are React Native's
 * own aliases for 400 and 700. Note that `Typography.fontWeight.normal` is NOT
 * a token — that key does not exist, and the one call site that used it
 * (PricingSelector) was a type error corrected in this slice.
 */
const FAMILY_FOR_WEIGHT: Record<string, string> = {
  '100': Typography.fontFamily.regular,
  '200': Typography.fontFamily.regular,
  '300': Typography.fontFamily.regular,
  '400': Typography.fontFamily.regular,
  normal: Typography.fontFamily.regular,
  '500': Typography.fontFamily.medium,
  '600': Typography.fontFamily.semibold,
  '700': Typography.fontFamily.bold,
  '800': Typography.fontFamily.bold,
  '900': Typography.fontFamily.bold,
  bold: Typography.fontFamily.bold,
};

/**
 * Resolves the family for one flattened style.
 *
 * Returns `undefined` to mean "emit no `fontFamily` key at all", which is what
 * a nested child with no weight needs so it inherits its parent's face.
 */
export function resolveFontFamily(
  flat: TextStyle | undefined,
  nested: boolean
): string | undefined {
  if (flat?.fontFamily) return flat.fontFamily;
  const weight = flat?.fontWeight;
  if (weight != null) {
    const mapped = FAMILY_FOR_WEIGHT[String(weight)];
    if (mapped) return mapped;
  }
  return nested ? undefined : Typography.fontFamily.regular;
}

export type TextProps = RNTextProps;

const Text = forwardRef<RNText, TextProps>(function Text(
  { style, maxFontSizeMultiplier, ...rest },
  ref
) {
  const nested = useContext(NestedTextContext);
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = resolveFontFamily(flat, nested);

  // Only rebuild the style object when there is something to inject. A nested
  // child that inherits keeps its original style (and its registered style IDs)
  // untouched.
  let resolvedStyle = style;
  if (family) {
    const next: TextStyle = { ...(flat ?? {}), fontFamily: family };
    if (Platform.OS === 'android') delete next.fontWeight;
    resolvedStyle = next;
  }

  const node = (
    <RNText
      ref={ref}
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? Typography.maxFontScale}
      style={resolvedStyle}
    />
  );

  // The provider is rendered by the outermost Text only, so a nested one costs
  // nothing. Its value is the literal `true` and never changes identity, so it
  // propagates no re-renders.
  return nested ? node : (
    <NestedTextContext.Provider value>{node}</NestedTextContext.Provider>
  );
});

/**
 * `Animated.Text` equivalent. `createAnimatedComponent` needs a ref, which is
 * why the primitive is a `forwardRef` component rather than a plain function.
 */
export const AnimatedText = Animated.createAnimatedComponent(Text);

export default Text;
