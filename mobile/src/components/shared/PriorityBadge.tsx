/**
 * Priority Badge Component
 * Displays task priority with color-coded background
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, Typography, Layout } from '../../constants';

export type Priority = 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  style?: any;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, style }) => {
  const getBadgeStyle = () => {
    switch (priority) {
      case 'high':
        return styles.high;
      case 'medium':
        return styles.medium;
      case 'low':
        return styles.low;
      default:
        return styles.medium;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text variant="bodySmall" style={styles.text}>
        {priority}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  high: {
    backgroundColor: Colors.priority.high,
  },
  medium: {
    backgroundColor: Colors.priority.medium,
  },
  low: {
    backgroundColor: Colors.priority.low,
  },
  text: {
    fontSize: Typography.fontSize.xs - 2,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
});
