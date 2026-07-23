// InsightCard — the calm "reflects your day" education slot (both phases).
//
// Replaces the correlation-stats WeekInsightCard on Home. Shows one curated,
// daily-rotating insight from getDashboardInsight() (a static launch set behind
// a seam). Calm and conditional — no stat, score, streak, lock, rating, or
// "More" link (decision: omit it — no destination, avoids content-store framing).
//
// No eyebrow cap (Voice & Tone v2.2 §4): "A small insight" diminished the
// insight before it spoke, and the uppercase cap treatment read as a button —
// it was the one thing this card visually shared with the actionable
// SuggestedActionCard directly above it. The insight leads with its own title.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { getDashboardInsight, type DashboardInsight } from './dashboardInsights';
import { CardHeading } from './CardHeading';

export interface InsightCardProps {
  // Injectable for tests / future content feed; defaults to today's rotation.
  insight?: DashboardInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const item = insight ?? getDashboardInsight();
  return (
    <View style={styles.card} testID="dashboard-insight">
      {/* The tile was anchored to the heading BLOCK rather than the eyebrow
          precisely so removing the eyebrow would not orphan it. It didn't. */}
      <CardHeading icon="lightbulb-outline" style={styles.heading}>
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
