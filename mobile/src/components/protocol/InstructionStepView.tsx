// Instruction step renderer.
//
// Used for Sensory Reset's 5-4-3-2-1 prompts and Cold Water Reset's
// prep / recovery instructions. Renders the prompt text with a small
// secondary countdown so the user has a sense of pacing without it
// dominating the surface. Auto-advances when durationSeconds elapses.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { useStepCountdown } from '../../hooks/useStepCountdown';
import type { InstructionStepViewProps } from './stepViewProps';

export function InstructionStepView({
  step,
  isActive,
  onComplete,
}: InstructionStepViewProps) {
  const { remainingMs } = useStepCountdown({
    durationMs: step.durationSeconds * 1000,
    isActive,
    onComplete,
  });
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <View style={styles.container} testID="instruction-step">
      <Text style={styles.text} testID="instruction-step-text">
        {step.text}
      </Text>
      <Text style={styles.countdown} testID="instruction-step-countdown">
        {`${remainingSec}s`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  text: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    textAlign: 'center',
    lineHeight: 32,
  },
  countdown: {
    marginTop: Spacing.xl,
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
});
