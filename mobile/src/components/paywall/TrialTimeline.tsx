/**
 * Trial timeline — a calm, transparent view of the 14-day arc:
 * today (full access) → ~day 12 (Apple's reminder) → day 14 (billing begins).
 * Transparency, not urgency: no countdown, no "unlock," no pressure. Tokens only.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface Milestone {
  day: string;
  title: string;
  body: string;
}

const MILESTONES: Milestone[] = [
  { day: 'Today', title: 'Full access', body: 'Everything Vara offers, free for 14 days.' },
  { day: 'Day 12', title: 'A heads-up', body: "Apple reminds you before your trial ends." },
  { day: 'Day 14', title: 'Your plan begins', body: 'Your subscription starts unless you cancel.' },
];

export const TrialTimeline: React.FC = () => (
  <View style={styles.container} accessibilityRole="summary" accessibilityLabel="Your 14-day trial timeline">
    {MILESTONES.map((m, i) => {
      const isLast = i === MILESTONES.length - 1;
      return (
        <View key={m.day} style={styles.row}>
          <View style={styles.rail}>
            <View style={styles.dot} />
            {!isLast && <View style={styles.connector} />}
          </View>
          <View style={styles.content}>
            <Text style={styles.day}>{m.day}</Text>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.body}>{m.body}</Text>
          </View>
        </View>
      );
    })}
  </View>
);

const DOT = Layout.iconSize.xs; // 16

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  row: { flexDirection: 'row' },
  rail: { width: DOT, alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.evergreenTeal,
  },
  connector: {
    flex: 1,
    width: Layout.borderWidth.medium,
    backgroundColor: Colors.silverSage,
    marginVertical: Spacing['2xs'],
  },
  content: {
    flex: 1,
    marginLeft: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  day: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginTop: Spacing['2xs'],
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginTop: Spacing['2xs'],
  },
});

export default TrialTimeline;
