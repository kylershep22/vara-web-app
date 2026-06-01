// BreathPacer — visual pacer for breathwork protocols.
//
// Self-contained primitive consumed by the GuidedSessionPlayer (Phase 1
// sub-step 4). Runs a `BreathStep` from `startAtScheduleIndex` to the
// end of its `durationSeconds`, animating an expanding/contracting
// circle via Reanimated 4 and surfacing phase boundaries to the parent
// via `onPhaseChange`.
//
// Pause / resume is owned by the parent (player): pause = unmount,
// resume = remount with the saved `startAtScheduleIndex`. This keeps
// the pacer's state machine simple and lets the player serialize the
// position into the session record without coupling.
//
// Reduce Motion: when `useReducedMotion()` returns true, the animated
// circle is replaced with a static circle plus a numeric phase
// countdown. The protocol still functions — only the animation is
// suppressed. Tested via the dev test screen (toggle iOS Settings >
// Accessibility > Motion > Reduce Motion).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { BreathPhase, BreathStep } from '../../types/models';
import {
  computeBreathPhaseSchedule,
  type PhaseScheduleEntry,
} from '../../utils/breathPacerSchedule';

export interface BreathPacerProps {
  step: BreathStep;
  // Resume from a specific schedule index. 0-based. Default: 0.
  startAtScheduleIndex?: number;
  // Fires at the start of every phase, including the first.
  onPhaseChange?: (entry: PhaseScheduleEntry) => void;
  // Fires once when the full step duration has elapsed.
  onComplete?: () => void;
  // When false, the schedule pauses: pending timeouts clear, the
  // animated circle freezes at its current scale, and the
  // reduce-motion countdown stops updating. When flipped back to
  // true, the CURRENT phase restarts with its full duration — we
  // don't track mid-phase elapsed (the reducer's breathScheduleIndex
  // captures pause position at phase granularity, which is acceptable
  // for breath protocols where re-experiencing a hold or inhale on
  // resume isn't disruptive). Default: true so the dev test harness
  // continues to work without modification.
  isActive?: boolean;
}

// Visual scale targets. The circle "breathes" between these values.
const SCALE_MIN = 0.55;
const SCALE_MAX = 1;

// Render diameter of the inner circle at SCALE_MAX. Outer ring is
// slightly larger to provide a frame of reference.
const CIRCLE_DIAMETER = 220;

function targetScaleFor(phase: BreathPhase, currentScale: number): number {
  switch (phase.kind) {
    case 'inhale':
      return SCALE_MAX;
    case 'exhale':
      return SCALE_MIN;
    case 'hold':
      // Hold preserves whatever scale we landed on after the previous phase.
      return currentScale;
  }
}

function phaseLabel(phase: BreathPhase): string {
  if (phase.label) return phase.label;
  switch (phase.kind) {
    case 'inhale':
      return 'Inhale';
    case 'exhale':
      return 'Exhale';
    case 'hold':
      return 'Hold';
  }
}

export function BreathPacer({
  step,
  startAtScheduleIndex = 0,
  onPhaseChange,
  onComplete,
  isActive = true,
}: BreathPacerProps) {
  const reduceMotion = useReducedMotion();

  const schedule = useMemo(
    () => computeBreathPhaseSchedule(step),
    [step]
  );

  // Index into `schedule`. We track it in state so reduce-motion
  // rendering can read the current phase synchronously; a ref tracks
  // the same value for callbacks where state would lag.
  const [currentIndex, setCurrentIndex] = useState(startAtScheduleIndex);
  const indexRef = useRef(startAtScheduleIndex);

  // Reanimated shared value for the circle scale.
  const scale = useSharedValue(SCALE_MIN);

  // Reduce-motion countdown (seconds remaining in current phase).
  const [secondsLeftInPhase, setSecondsLeftInPhase] = useState(0);

  // Cleanup handles for the active timers.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest-callback refs. The schedule effect would otherwise re-run
  // whenever the parent passes new inline-arrow callbacks, which fires
  // onPhaseChange repeatedly on the same index → infinite render loop
  // when the parent updates state from the callback. Reading callbacks
  // through refs keeps the schedule effect's dependency list to
  // structural inputs only.
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
    onCompleteRef.current = onComplete;
  });

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Drive the schedule forward. Effect re-runs whenever the index
  // changes, kicking off animation + scheduling the advance to the
  // next phase. Cleanup clears the pending timers so unmount /
  // pause is clean.
  useEffect(() => {
    if (!isActive) {
      // Paused. Effect cleanup from the previous run already cleared
      // any timeout/interval; just hold position. The animated circle
      // freezes at its current scale (Reanimated stops the
      // withTiming when no new one is started) and the phase label
      // stays put. Resume re-runs this effect with isActive=true.
      return;
    }
    const entry = schedule[currentIndex];
    if (!entry) {
      // Out of bounds — either invalid startIndex or already completed.
      return;
    }

    const phase = step.phases[entry.phaseIndex];
    onPhaseChangeRef.current?.(entry);

    // VoiceOver: announce the new phase. accessibilityLiveRegion (on the phase
    // label) covers Android; iOS ignores live regions, so announce explicitly
    // there. Guarded on Platform.OS to avoid double-announcing on Android.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(phaseLabel(phase));
    }

    // Visual: animate scale to target over the phase duration.
    if (!reduceMotion) {
      const target = targetScaleFor(phase, scale.value);
      scale.value = withTiming(target, {
        duration: entry.durationSeconds * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      // Reduce motion: static circle, just update the countdown.
      setSecondsLeftInPhase(Math.ceil(entry.durationSeconds));
      const phaseStart = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - phaseStart) / 1000;
        const remaining = Math.max(
          0,
          Math.ceil(entry.durationSeconds - elapsed)
        );
        setSecondsLeftInPhase(remaining);
      }, 250);
    }

    // Schedule transition to next entry (or completion).
    timeoutRef.current = setTimeout(() => {
      const nextIndex = indexRef.current + 1;
      if (nextIndex >= schedule.length) {
        onCompleteRef.current?.();
        return;
      }
      indexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, entry.durationSeconds * 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, schedule, step.phases, reduceMotion, isActive]);
  // `scale` is a Reanimated shared value (stable ref across renders).
  // Including it in deps would be a no-op in production but breaks
  // tests whose mocks don't preserve ref identity. We mutate it
  // inside the effect; that doesn't require it in the deps array.

  const currentEntry = schedule[currentIndex];
  const currentPhase = currentEntry
    ? step.phases[currentEntry.phaseIndex]
    : null;

  return (
    <View style={styles.container} testID="breath-pacer">
      <View style={styles.outerRing}>
        {reduceMotion ? (
          <View
            style={[styles.circle, styles.staticCircle]}
            testID="breath-pacer-static-circle"
          >
            {currentPhase && (
              <Text style={styles.countdown} testID="breath-pacer-countdown">
                {secondsLeftInPhase}
              </Text>
            )}
          </View>
        ) : (
          <Animated.View
            style={[styles.circle, animatedCircleStyle]}
            testID="breath-pacer-animated-circle"
          />
        )}
      </View>
      {currentPhase && (
        <Text
          style={styles.phaseLabel}
          testID="breath-pacer-phase-label"
          accessible
          accessibilityRole="text"
          // Announce each inhale/hold/exhale transition so a VoiceOver user can
          // follow the protocol without seeing the circle (UI Standards §13.4:
          // animation must never be the only channel). accessibilityLabel keys
          // off the phase so the live region re-reads it as it changes.
          accessibilityLiveRegion="polite"
          accessibilityLabel={phaseLabel(currentPhase)}
        >
          {phaseLabel(currentPhase)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  outerRing: {
    width: CIRCLE_DIAMETER + 32,
    height: CIRCLE_DIAMETER + 32,
    borderRadius: (CIRCLE_DIAMETER + 32) / 2,
    backgroundColor: Colors.dewSageLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_DIAMETER / 2,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticCircle: {
    backgroundColor: Colors.silverSage,
  },
  countdown: {
    fontSize: 56,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  phaseLabel: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
});
