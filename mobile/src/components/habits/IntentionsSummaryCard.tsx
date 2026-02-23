/**
 * IntentionsSummaryCard
 * Shown at bottom of Habits tab when 2+ habits have intentions
 * Displays clustered intention labels with count badges
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Habit } from '../../types';

interface IntentionsSummaryCardProps {
  habits: Habit[];
}

export const IntentionsSummaryCard: React.FC<IntentionsSummaryCardProps> = ({ habits }) => {
  const intentionClusters = useMemo(() => {
    const clusters: Record<string, number> = {};
    for (const habit of habits) {
      if (habit.intention) {
        const key = habit.intention.label;
        clusters[key] = (clusters[key] || 0) + 1;
      }
    }
    return Object.entries(clusters);
  }, [habits]);

  // Only show when 2+ habits have intentions
  const totalWithIntentions = intentionClusters.reduce((sum, [, count]) => sum + count, 0);
  if (totalWithIntentions < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TODAY'S INTENTIONS</Text>
      <View style={styles.chipRow}>
        {intentionClusters.map(([label, count]) => (
          <View key={label} style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
            {count > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{count}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D5E3D159', // ~35% opacity
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6F7F77',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#D5E3D199', // ~60%
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  countBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1B5E5733', // primary 20%
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1B5E57',
  },
});
