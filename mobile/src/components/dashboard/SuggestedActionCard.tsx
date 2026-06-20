// SuggestedActionCard — post-check-in only.
//
// A standing short capacity practice (from suggestedAction(), time-of-day driven
// and independent of the just-completed plan, so it never re-surfaces what the
// user just did). Completion-agnostic copy — it serves both the finished and the
// checked-in-but-abandoned cases. "Create capacity" framing; no meter, no score.
//
// Layout matches the mockup .card: an uppercase "When you're ready" cap, a
// capacity-framed headline, then a meta row "{name} · {min}" with "Begin ›"
// (space-between). onStart is wired by the screen to launch PracticeRun.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import type { Protocol } from '../../types/models';
import { dashboardEyebrow } from './cardStyles';

export interface SuggestedActionCardProps {
  protocol: Protocol;
  onStart: () => void;
}

export const SuggestedActionCard: React.FC<SuggestedActionCardProps> = ({
  protocol,
  onStart,
}) => {
  return (
    <View style={styles.card} testID="dashboard-suggested-action">
      <Text style={styles.eyebrow}>When you're ready</Text>
      <Text style={styles.headline}>A few minutes to create some capacity</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>
          {protocol.name} · {protocol.timeWindow} min
        </Text>
        <Text
          style={styles.cta}
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={`Begin ${protocol.name}, ${protocol.timeWindow} minutes`}
          testID="dashboard-suggested-action-start"
        >
          Begin ›
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Layout.shadow.sm,
  },
  eyebrow: {
    ...dashboardEyebrow,
    marginBottom: Spacing.xs,
  },
  headline: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
