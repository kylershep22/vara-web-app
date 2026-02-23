/**
 * StepProgressBar
 * Horizontal progress indicator for wizard steps
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface StepProgressBarProps {
  totalSteps: number;
  currentStep: number;
}

const COLORS = {
  primary: '#1B5E57',
  secondary: '#B8CDBA',
};

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
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 9999,
  },
  segmentCompleted: {
    backgroundColor: COLORS.primary,
  },
  segmentFuture: {
    backgroundColor: COLORS.secondary + '80',
  },
});
