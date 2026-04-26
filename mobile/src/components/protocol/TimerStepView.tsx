// Timer step renderer.
//
// Used for Brief Movement, Mindful Walking, Focused Work Window,
// Bright Light Exposure, and Cold Water Reset's contact phase. The
// user is doing the work somewhere else (a sink, a sidewalk, a desk
// task); the app just runs the clock. Display is the inverse of
// InstructionStepView — countdown dominates, label and hint are
// supporting copy.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { useStepCountdown } from '../../hooks/useStepCountdown';
import type { TimerStepViewProps } from './stepViewProps';

function formatCountdown(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export function TimerStepView({
  step,
  isActive,
  onComplete,
}: TimerStepViewProps) {
  const { remainingMs } = useStepCountdown({
    durationMs: step.durationSeconds * 1000,
    isActive,
    onComplete,
  });
  const display = formatCountdown(remainingMs);

  return (
    <View style={styles.container} testID="timer-step">
      <Text style={styles.label} testID="timer-step-label">
        {step.label}
      </Text>
      {step.hint ? (
        <Text style={styles.hint} testID="timer-step-hint">
          {step.hint}
        </Text>
      ) : null}
      <Text style={styles.countdown} testID="timer-step-countdown">
        {display}
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
  label: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdown: {
    marginTop: Spacing.xl,
    fontSize: 64,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    fontVariant: ['tabular-nums'],
  },
});
