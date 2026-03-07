/**
 * StepProgressBar
 * Horizontal progress indicator for wizard steps
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, Layout } from '../../../constants';

interface StepProgressBarProps {
  totalSteps: number;
  currentStep: number;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  totalSteps,
  currentStep,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index <= currentStep ? styles.segmentCompleted : styles.segmentFuture,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: Layout.borderRadius.pill,
  },
  segmentCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  segmentFuture: {
    backgroundColor: Colors.dewSage,
  },
});
