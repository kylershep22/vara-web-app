/**
 * ScreenHeader
 * A reusable hero header for launch screens: a single watercolor raster
 * illustration with an in-code mist-white scrim fading BOTH the top and bottom
 * seams into the mist page background, so the art has no hard edge.
 *
 * Asset architecture (Vara): the header art is RASTER (expo-image), never an
 * SVG icon. The scrim is a real in-code layer (expo-linear-gradient), never
 * baked into the image. expo-image has no ImageBackground — the Image renders at
 * absolute-fill inside a View, with the scrim and any content as siblings.
 *
 * Modes:
 *  - `band` (default): the screen renders the title/subtitle ABOVE the header
 *    band. ScreenHeader is just art + scrim.
 *  - `overlay`: a `title` is passed in and rendered INSIDE the scrim, seated on
 *    the opaque mist band at the bottom seam so contrast holds at WCAG AA
 *    (softCharcoal on mistWhite).
 *
 * Motion: the header is fully static — no parallax, no animated entry, no image
 * transition. It therefore respects Reduce Motion by construction.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing, TextStyles } from '../../constants';

const DEFAULT_HEIGHT = 200;

// The mist scrim's shape. Colors are design tokens (mistWhite and its
// transparent form); the fade positions are the scrim's spec: opaque mist at
// both seams (0 and 1), transparent through the middle where the art reads.
const SCRIM_COLORS = [
  Colors.mistWhite,
  Colors.mistWhiteTransparent,
  Colors.mistWhiteTransparent,
  Colors.mistWhite,
] as const;
const SCRIM_LOCATIONS = [0, 0.3, 0.66, 1] as const;

type ScreenHeaderMode = 'band' | 'overlay';

interface ScreenHeaderProps {
  /** The watercolor raster asset (a `require(...)` result). */
  source: ImageProps['source'];
  /** `band` (title above, default) or `overlay` (title seated in the scrim). */
  mode?: ScreenHeaderMode;
  /** Overlay-mode title. Ignored in band mode. */
  title?: string;
  /** Header height in px. */
  height?: number;
  /** Describes the illustration for screen readers. Omit for decorative art. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ScreenHeader({
  source,
  mode = 'band',
  title,
  height = DEFAULT_HEIGHT,
  accessibilityLabel,
  style,
  testID,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, { height }, style]} testID={testID}>
      {/* Raster watercolor art at absolute-fill (NOT ImageBackground). */}
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={0}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      />

      {/* Mist-white scrim sibling above the image, fading both seams to mist. */}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {mode === 'overlay' && title ? (
        <View style={styles.overlayContent} pointerEvents="none">
          <Text style={styles.overlayTitle}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // The scrim fades to this same mist, so any pixel the art doesn't cover
    // still reads as the page background.
    backgroundColor: Colors.mistWhite,
    overflow: 'hidden',
  },
  overlayContent: {
    // Seat the overlay title on the opaque mist band at the bottom seam, where
    // softCharcoal-on-mistWhite clears WCAG AA regardless of the art behind it.
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  overlayTitle: {
    ...TextStyles.h1,
    color: Colors.softCharcoal,
  },
});

export default ScreenHeader;
