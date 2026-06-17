// InsightCard — the calm "reflects your day" education slot (both phases).
//
// Replaces the correlation-stats WeekInsightCard on Home. Shows one curated,
// daily-rotating insight from getDashboardInsight() (a static launch set behind
// a seam). Calm and conditional — no stat, score, streak, or "full story" link.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { getDashboardInsight, type DashboardInsight } from './dashboardInsights';

export interface InsightCardProps {
  // Injectable for tests / future content feed; defaults to today's rotation.
  insight?: DashboardInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const item = insight ?? getDashboardInsight();
  return (
    <View style={styles.card} testID="dashboard-insight">
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
  },
});
