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
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Colors, Layout, Spacing } from '../../constants';

interface SurfaceTierProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SurfaceTier({ children, style, testID }: SurfaceTierProps) {
  return (
    <View style={[styles.tier, style]} testID={testID}>
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
