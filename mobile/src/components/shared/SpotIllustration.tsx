/**
 * SpotIllustration
 * A small, decorative raster illustration for a card or surface — e.g. an
 * empty-state spot on the Journal reflection screen. Unlike ScreenHeader, this
 * is NOT a hero: no scrim, no full-bleed, no overlap. It renders a transparent,
 * `contain`-fitted image at a fixed size so the art sits on the surface behind
 * it with clean edges.
 *
 * The source asset MUST have a real alpha channel (genuinely transparent
 * background). An opaque asset would show a rectangular halo on the card.
 *
 * Motion: fully static (no transition), so it respects Reduce Motion by
 * construction. No opacity/tint/contrast/filter is applied to the image.
 */

import React from 'react';
import type { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImageProps } from 'expo-image';

const DEFAULT_SIZE = 120;

interface SpotIllustrationProps {
  /** The transparent raster asset (a `require(...)` result). */
  source: ImageProps['source'];
  /** Square size in px (width === height). Ignored if width/height are given. */
  size?: number;
  /** Explicit width in px (overrides `size`). */
  width?: number;
  /** Explicit height in px (overrides `size`). */
  height?: number;
  /** Describes the illustration for screen readers. Omit for decorative art. */
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

export function SpotIllustration({
  source,
  size = DEFAULT_SIZE,
  width,
  height,
  accessibilityLabel,
  style,
  testID,
}: SpotIllustrationProps) {
  return (
    <Image
      source={source}
      style={[{ width: width ?? size, height: height ?? size }, style]}
      contentFit="contain"
      transition={0}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

export default SpotIllustration;
