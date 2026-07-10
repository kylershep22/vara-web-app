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

const DEFAULT_HEIGHT = 220;

// The mist scrim's shape. Colors are design tokens (mistWhite and its
// transparent form); the fade positions are the scrim's spec: opaque mist at
// both seams (0 and 1), transparent through the middle where the art reads.
// The fade zones are kept narrow so the scrim only softens the top and bottom
// SEAMS rather than washing the whole band: the top transparent stop sits high
// (0.15) so the art reveals near the title, and the bottom fade (0.7 -> 1) is
// wide enough for the primary card to overlap the seam cleanly.
const SCRIM_COLORS = [
  Colors.mistWhite,
  Colors.mistWhiteTransparent,
  Colors.mistWhiteTransparent,
  Colors.mistWhite,
] as const;
const SCRIM_LOCATIONS = [0, 0.15, 0.7, 1] as const;

/**
 * BAND_STRONG_SCRIM — the approved stronger-artwork scrim for launch hero bands
 * (Focus, Energy, …). Pass to ScreenHeader's `scrimLocations`. It keeps only a
 * faint top blend (top stop 0.05) so the cream art melts into the mist page with
 * no hard seam, holds the art transparent through 0.82, and keeps a bottom fade
 * (0.82 -> 1) so the first card can overlap the bottom seam cleanly. The colors
 * are untouched (pure mist alpha) — no image opacity/tint/contrast/filter. This
 * is the single source of truth so the value cannot drift across heroes.
 */
export const BAND_STRONG_SCRIM = [0, 0.05, 0.82, 1] as const;

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
  /**
   * Override the scrim's gradient stop positions. Must have 4 stops to match
   * the 4 mist color stops. Defaults to the standard seam-softening scrim
   * (SCRIM_LOCATIONS). Move the top stop toward 0 and the bottom-transparent
   * stop later to pull the scrim back and reveal more of the raster art — a
   * deliberately stronger-artwork look. The colors are untouched, so the fade
   * is still pure mist alpha: no image opacity/tint/contrast/filter involved.
   */
  scrimLocations?: readonly [number, number, ...number[]];
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
  scrimLocations = SCRIM_LOCATIONS,
  accessibilityLabel,
  style,
  testID,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, { height }, style]} testID={testID}>
      {/* Raster watercolor art at absolute-fill (NOT ImageBackground). The art
          is a wide 3:1 asset whose subject (sun + mountain ridgeline) sits in
          the lower third; contentPosition="bottom" biases the cover crop down
          so the band frames the subject, not the empty pale sky above it. No
          opacity is applied to the Image — the scrim does all the blending. */}
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        transition={0}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      />

      {/* Mist-white scrim sibling above the image, fading both seams to mist. */}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={scrimLocations}
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
    // No explicit width: the band stretches to fill its parent's cross axis
    // (align-stretch is the default in a column). That lets a caller full-bleed
    // the band out of a padded ScrollView with negative horizontal margins —
    // a fixed `width: '100%'` would pin it to the padded content box and the
    // negative margin would shift it left, clipping the right edge.
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
