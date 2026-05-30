/**
 * StepIndicator — thin horizontal progress bar for the stress-recovery
 * onboarding arc. Orients the user to their position in the flow without
 * creating urgency (design system 7.8 Progress Indicators — no streaks, no
 * competitive framing).
 *
 * Track: Silver Sage at 40% opacity (Colors.divider). Fill: Evergreen Teal.
 * Both 3px tall with a full radius. Static (no animation) for this version.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Layout } from '../../constants';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

// Spec'd bar height (design system 7.8). Not a spacing token — it's a fixed
// visual dimension for the indicator track/fill.
const BAR_HEIGHT = 3;

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  const ratio = totalSteps > 0 ? Math.max(0, Math.min(1, currentStep / totalSteps)) : 0;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: totalSteps, now: currentStep }}
    >
      {/* width = (currentStep / totalSteps) * containerWidth */}
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: BAR_HEIGHT,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.divider, // Silver Sage at 40% opacity
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
  },
});

export default StepIndicator;
