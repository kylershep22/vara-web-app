/**
 * TextInput — the shared input primitive. UI Standards 5.1.
 *
 * WHY IT IS SEPARATE FROM `Text`. A `TextInput` is a distinct host component
 * and does NOT inherit font styles from an ancestor `Text`, so the family has
 * to be set on it directly. It also has no nesting question: an input is never
 * inside another input, so there is no context and no "inherit" case. The
 * weight-to-family rule is the same one, imported from `Text` rather than
 * restated, so the two cannot drift.
 *
 * PLACEHOLDERS NEED NOTHING EXTRA. The placeholder inherits the input's
 * `fontFamily`; what it does not inherit is colour, which is why
 * `placeholderTextColor` appears at 51 sites. That is unrelated and untouched.
 *
 * The Android synthetic-bold strip and the Dynamic Type ceiling work exactly as
 * they do in `Text`; see that file's header for the reasoning.
 */

import React, { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
} from 'react-native';
import { Typography } from '../../constants';
import { resolveFontFamily } from './Text';

export type TextInputProps = RNTextInputProps;

const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { style, maxFontSizeMultiplier, ...rest },
  ref
) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  // `nested` is always false: an input is never inside another input, so it
  // always takes the Regular default when no weight is set.
  const family = resolveFontFamily(flat, false);

  let resolvedStyle = style;
  if (family) {
    const next: TextStyle = { ...(flat ?? {}), fontFamily: family };
    if (Platform.OS === 'android') delete next.fontWeight;
    resolvedStyle = next;
  }

  return (
    <RNTextInput
      ref={ref}
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? Typography.maxFontScale}
      style={resolvedStyle}
    />
  );
});

export default TextInput;
