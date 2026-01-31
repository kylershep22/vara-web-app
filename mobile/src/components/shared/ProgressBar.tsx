/**
 * Progress Bar Component
 * Visual progress indicator with percentage
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  backgroundColor?: string;
  height?: number;
  showPercentage?: boolean;
  style?: any;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Colors.evergreenTeal,
  backgroundColor = Colors.borderLight,
  height = 8,
  showPercentage = true,
  style,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={style}>
      <View style={[styles.container, { height, backgroundColor }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {showPercentage && (
        <Text variant="bodySmall" style={styles.percentageText}>
          {clampedProgress}% complete
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: Layout.borderRadius.sm,
  },
  percentageText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
});
