/**
 * The dynamic in-week capacity re-set (spec 7) on Home.
 *
 * Ported from WeeklyTodayScreen.tsx:352-398. Presentation only: the write, the
 * re-entrancy guard and the reload live in useTodayCard.
 *
 * SECONDARY, DELIBERATELY. Outlined rather than filled and placed below the
 * Today hero, because spec 9 allows Home one primary action and that is the
 * daily completion control. This is the quiet way out of a week that turned out
 * differently.
 *
 * Both directions are one tap with no confirmation. Neither is framed as a
 * failure or a reward, because continuity is measured against the floor
 * commitment and never against the tier: re-setting in either direction cannot
 * break or extend a run.
 *
 * THE TIER ORDER IS NOT RESTATED HERE. nextTierDown / nextTierUp read
 * CAPACITY_TIERS, which is the only place the ladder lives. null means the
 * ladder ends here, and that renders as a note rather than as a button that
 * would do nothing: a tappable that does nothing teaches the user the screen is
 * broken.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { nextTierDown, nextTierUp, type CapacityTier } from '../../weeklyEngine';
import { TODAY_COPY } from '../../screens/weekly/copy';

const MIN_TOUCH_TARGET = 48;

export interface CapacityResetCardProps {
  /** The tier the user is living in, and the `from` of any transition. */
  capacityCurrent: CapacityTier;
  /** A write is in flight; both directions are held until it settles. */
  resetting: boolean;
  /** The last write failed. The week on screen is unchanged. */
  resetFailed: boolean;
  onChangeTier: (from: CapacityTier, to: CapacityTier) => void;
}

export const CapacityResetCard: React.FC<CapacityResetCardProps> = ({
  capacityCurrent,
  resetting,
  resetFailed,
  onChangeTier,
}) => {
  const downTier = nextTierDown(capacityCurrent);
  const upTier = nextTierUp(capacityCurrent);

  return (
    <View style={styles.card} testID="home-reset">
      <Text style={styles.heading}>{TODAY_COPY.resetHeading}</Text>

      {downTier && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => onChangeTier(capacityCurrent, downTier)}
          disabled={resetting}
          accessibilityRole="button"
          accessibilityLabel={TODAY_COPY.resetDown}
          accessibilityState={{ disabled: resetting }}
          testID="home-reset-down"
        >
          <Text style={styles.label}>{TODAY_COPY.resetDown}</Text>
        </TouchableOpacity>
      )}

      {upTier && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => onChangeTier(capacityCurrent, upTier)}
          disabled={resetting}
          accessibilityRole="button"
          accessibilityLabel={TODAY_COPY.resetUp}
          accessibilityState={{ disabled: resetting }}
          testID="home-reset-up"
        >
          <Text style={styles.label}>{TODAY_COPY.resetUp}</Text>
        </TouchableOpacity>
      )}

      {/* At either end of the ladder the missing direction is stated, not
          rendered as a button that would do nothing. */}
      {(!downTier || !upTier) && (
        <Text style={styles.edge} testID="home-reset-edge">
          {downTier ? TODAY_COPY.resetAtHighest : TODAY_COPY.resetAtLowest}
        </Text>
      )}

      {/* The batch is atomic, so a failure means neither write landed and the
          tier above is still the true one. Say so, in coral. */}
      {resetFailed && (
        <Text style={styles.error} testID="home-reset-error">
          {TODAY_COPY.resetFailed}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  heading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  // Outlined, not filled: secondary to the completion CTA in the hero above,
  // which is the one primary action on Home.
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  edge: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  error: {
    marginTop: Spacing.sm,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
  },
});
