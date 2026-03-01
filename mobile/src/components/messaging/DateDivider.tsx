/**
 * DateDivider
 * Horizontal line with centered date label between message groups.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

interface DateDividerProps {
  date: Date;
}

const formatDateLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const DateDivider: React.FC<DateDividerProps> = ({ date }) => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.label}>{formatDateLabel(date)}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
    paddingHorizontal: Spacing.md,
  },
});

export default DateDivider;
