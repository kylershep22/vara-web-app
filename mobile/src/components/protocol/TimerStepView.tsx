// Timer step renderer.
//
// Used for Light Movement, Mindful Walk / Walking Meditation,
// Focused Work Window, Bright Light Exposure, and Cold Water
// Reset's contact phase. The user is doing the work somewhere
// else (a sink, a sidewalk, a desk task); the app just runs the
// clock. Display is the inverse of InstructionStepView —
// countdown dominates, label and hint are supporting copy.
//
// Light Movement protocols receive a runtime `hint` override from
// LightMovementProtocolFlow based on the user's pre-timer modality
// pick (Walk vs Stretch); the catalog's static hint is a fallback.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { useStepCountdown } from '../../hooks/useStepCountdown';
import { TimerRing } from '../../screens/Focus/components/TimerRing';
import type { TimerStepViewProps } from './stepViewProps';

// Ring large enough to comfortably contain the countdown numerals. Track is
// Silver Sage (Colors.divider), fill is Evergreen Teal — see TimerRing.
const RING_DIAMETER = 170;
const RING_STROKE = 3.5;

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
  const durationMs = step.durationSeconds * 1000;
  const { remainingMs, elapsedMs } = useStepCountdown({
    durationMs,
    isActive,
    onComplete,
  });
  const display = formatCountdown(remainingMs);
  // Fraction elapsed — ring fills from the top (12 o'clock) as time passes.
  const progress = durationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / durationMs)) : 0;

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
      <View style={styles.ringWrap}>
        <TimerRing
          diameter={RING_DIAMETER}
          strokeWidth={RING_STROKE}
          progress={progress}
          fillColor={Colors.evergreenTeal}
          trackColor={Colors.divider}
        >
          <Text style={styles.countdown} testID="timer-step-countdown">
            {display}
          </Text>
        </TimerRing>
      </View>
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
  ringWrap: {
    marginTop: Spacing.xl,
  },
  countdown: {
    fontSize: 64,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    fontVariant: ['tabular-nums'],
  },
});
