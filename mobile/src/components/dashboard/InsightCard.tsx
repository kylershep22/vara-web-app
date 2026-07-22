// InsightCard — the calm "reflects your day" education slot (both phases).
//
// Replaces the correlation-stats WeekInsightCard on Home. Shows one curated,
// daily-rotating insight from getDashboardInsight() (a static launch set behind
// a seam). Calm and conditional — no stat, score, streak, lock, rating, or
// "More" link (decision: omit it — no destination, avoids content-store framing).
// Layout matches the mockup .card: an uppercase "A small insight" cap, title,
// body.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { getDashboardInsight, type DashboardInsight } from './dashboardInsights';
import { dashboardEyebrow } from './cardStyles';
import { CardHeading } from './CardHeading';

export interface InsightCardProps {
  // Injectable for tests / future content feed; defaults to today's rotation.
  insight?: DashboardInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const item = insight ?? getDashboardInsight();
  return (
    <View style={styles.card} testID="dashboard-insight">
      {/* The tile anchors to the heading BLOCK, not to the eyebrow: "A small
          insight" is queued for removal in a copy pass, and anchoring the tile
          to it would orphan the tile when the eyebrow goes. No strings change. */}
      <CardHeading icon="lightbulb-outline" style={styles.heading}>
        <Text style={styles.eyebrow}>A small insight</Text>
        <Text style={styles.title}>{item.title}</Text>
      </CardHeading>
      <Text style={styles.body}>{item.body}</Text>
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
  heading: {
    marginBottom: Spacing.xs,
  },
  eyebrow: {
    ...dashboardEyebrow,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
});
