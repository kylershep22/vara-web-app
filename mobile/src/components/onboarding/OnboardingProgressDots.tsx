/**
 * OnboardingProgressDots Component
 * Progress indicator dots for the onboarding flow
 *
 * Specs:
 * - 8px diameter dots, 8px gap, centered
 * - Completed/Active: Evergreen Teal
 * - Upcoming: Silver Sage at 40% opacity
 */

import React from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import { Colors, Spacing } from '../../constants';

interface OnboardingProgressDotsProps {
  currentStep: number;
  totalSteps?: number;
}

const DOT_SIZE = 8;
const DOT_GAP = 8;

const OnboardingProgressDots: React.FC<OnboardingProgressDotsProps> = ({
  currentStep,
  totalSteps = 6,
}) => {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: currentStep,
        text: `Step ${currentStep} of ${totalSteps}`,
      }}
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isActive = isCompleted || isCurrent;

        return (
          <View
            key={stepNumber}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotUpcoming,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: DOT_GAP,
    paddingVertical: Spacing.base,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  dotUpcoming: {
    backgroundColor: `${Colors.silverSage}66`, // 40% opacity
  },
});

export default OnboardingProgressDots;
