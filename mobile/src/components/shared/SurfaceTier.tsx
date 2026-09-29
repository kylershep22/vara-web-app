/**
 * SurfaceTier
 * The surface every text-bearing element sits on over an environmental ground
 * (standards 2.8 IMMERSIVE: "All text sits on a surface-tier element or a local
 * gradient scrim, never raw on the artwork"). Today is the only immersive
 * surface, so Today is the only caller.
 *
 * THE FILL IS THE CONTRACT; THE GEOMETRY IS NOT. `Colors.surfaceImmersive` is
 * measured against the shipped asset (see its declaration in colors.ts) and is
 * what makes text legible here. Radius and padding are placeholders taken from
 * the existing card scale so the tier reads as a surface at all; the immersive
 * card geometry in 10.2 (radius 20, padding 24, shadow sm) is R3b's and lands
 * there, in this one place.
 *
 * `surfaceTierStyle` is exported for the two components that must carry the
 * tier INSIDE themselves, because they can render nothing: a wrapper around a
 * component that returns null would leave an empty surface on the artwork.
 * Its fill is the translucent token only; callers that use it directly pair it
 * with `useSurfaceFill()` so Reduce Transparency reaches them too.
 *
 * REDUCE TRANSPARENCY MAKES THE TIER OPAQUE WHITE (R3a). The token is White at
 * 0.72, so the opaque case is the same colour at full alpha: no hue shift, only
 * the art stops showing through. Read through `useReduceTransparency`, which
 * reads the setting at mount AND subscribes to `reduceTransparencyChanged`, so
 * toggling it with the app open repaints the tier without a remount.
 *
 * THE IMMERSIVE CONTEXT. Today's ground provides `ImmersiveSurfaceContext`;
 * everywhere else it defaults to false. Shared components read it to switch
 * their secondary text from Muted Sage Gray to Soft Charcoal on this ground
 * only: sage reaches 3.75 to 4.24:1 over the darkest art at 0.72, under 4.5:1,
 * and the ruling was a colour change rather than a token change. Off the
 * ground, nothing about those components changes.
 */

import React, { createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Colors, Layout, Spacing } from '../../constants';
import { useReduceTransparency } from '../../hooks/useReduceTransparency';

/** True on Today's environmental ground, false everywhere else. */
export const ImmersiveSurfaceContext = createContext(false);

export const useImmersiveSurface = (): boolean => useContext(ImmersiveSurfaceContext);

/** The tier's fill: the measured token, or opaque White under Reduce Transparency. */
export const useSurfaceFill = (): string =>
  useReduceTransparency() ? Colors.white : Colors.surfaceImmersive;

interface SurfaceTierProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SurfaceTier({ children, style, testID }: SurfaceTierProps) {
  const fill = useSurfaceFill();
  return (
    <View style={[styles.tier, { backgroundColor: fill }, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tier: {
    backgroundColor: Colors.surfaceImmersive,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});

export const surfaceTierStyle = styles.tier;
