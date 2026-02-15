/**
 * Profile Stats Component
 * Displays user statistics (posts, connections, groups, goals)
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface ProfileStatsProps {
  posts: number;
  connections: number;
  groups: number;
  goals: number;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  posts,
  connections,
  groups,
  goals,
}) => {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{posts}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{connections}</Text>
        <Text style={styles.statLabel}>Connections</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{groups}</Text>
        <Text style={styles.statLabel}>Groups</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{goals}</Text>
        <Text style={styles.statLabel}>Goals</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.shadow.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});
