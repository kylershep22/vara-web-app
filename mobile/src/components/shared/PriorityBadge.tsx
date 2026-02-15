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

  // Capitalize first letter for sentence case
  const displayText = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text variant="bodySmall" style={styles.text}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    // Tag padding per UI standards: xs (4px) horizontal, 2px vertical
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing['2xs'],
    // radius-sm (4px) for tags per UI standards
    borderRadius: Layout.borderRadius.sm,
  },
  high: {
    // Soft coral tint - non-alarming
    backgroundColor: Colors.priority.high,
  },
  medium: {
    // Soft amber tint
    backgroundColor: Colors.priority.medium,
  },
  low: {
    // Soft teal tint
    backgroundColor: Colors.priority.low,
  },
  text: {
    // Caption/Label: 12px, Medium (500)
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    // Note: No uppercase per UI standards (sentence case only)
  },
});
