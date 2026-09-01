/**
 * The unbroken-weeks count (spec 1) on Home, below the fold per spec 9.
 *
 * Ported from WeeklyTodayScreen.tsx:408-417. A COUNT and nothing else: no
 * percentage, no bar, no target, no colour.
 *
 * THE THREE-STATE RULE IS THE WHOLE COMPONENT. Rendered only when there is a
 * run to show:
 *
 *   > 0   the count
 *   0     NOTHING. A zero framed as a number is a deficit, and a user who has
 *         just started or just missed a week is not behind.
 *   null  NOTHING. The read failed; showing 0 there would state something
 *         about the user that was never read.
 *
 * Neutral accountability, never a streak. Nothing here may imply the user is
 * behind, and the re-set control cannot break or extend this run: continuity is
 * measured against the floor commitment and never against the capacity tier.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { TODAY_COPY } from './dailyPicker.copy';

export interface ContinuityCardProps {
  /** Unbroken weeks. null when the read failed, which is NOT the same as 0. */
  continuity: number | null;
}

export const ContinuityCard: React.FC<ContinuityCardProps> = ({ continuity }) => {
  if (continuity === null || continuity <= 0) return null;

  return (
    <View style={styles.card} testID="home-continuity">
      <Text style={styles.heading}>{TODAY_COPY.continuityHeading}</Text>
      <Text style={styles.count} testID="home-continuity-count">
        {continuity === 1
          ? TODAY_COPY.continuityCountOne
          : TODAY_COPY.continuityCount.replace('{count}', `${continuity}`)}
      </Text>
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
    marginBottom: Spacing.xs,
  },
  count: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
});
