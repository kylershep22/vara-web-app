// ShiftedResponse — positive-outcome response screen.
//
// Renders the per-transition title + body for a (stateBefore,
// stateAfter, intentPath) triple via getShiftedResponseCopy, plus a
// Continue button that dispatches `'dismissed'`. Auto-dismisses after
// AUTO_DISMISS_MS with `'auto_dismissed'` if the user takes no action.
//
// The auto-dismiss timer is interaction reading-time, NOT a Build
// Guide motion value — different concept from animation duration.
// Inlined as a named constant rather than hoisted to motion.ts. If a
// second reading-time delay shows up, factor to interactionTimings.ts.
//
// Reduce Motion: the timer itself doesn't respect Reduce Motion (it's
// interaction timing, not animation). The optional entrance fade DOES
// — same pattern as GuidedSessionPlayer.tsx:487. STEP_TRANSITION_DURATION_MS
// from constants/motion.ts is the canonical 250ms transition value.

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, Spacing, Typography } from '../../../constants';
import { STEP_TRANSITION_DURATION_MS } from '../../../constants/motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { BrainState, IntentPath } from '../../../types/models';
import type { UserChosenNextStep } from './types';
import { getShiftedResponseCopy } from './shiftedResponseCopy';

const MIN_TOUCH_TARGET = 48;

// Reading-time delay before auto-dismiss fires on the positive paths.
// Core Loop v2 line 238: "User taps 'Continue' or waits 4 seconds."
// Not a Build Guide motion value — kept inlined here, not in motion.ts.
const AUTO_DISMISS_MS = 4000;

export interface ShiftedResponseProps {
  stateBefore: BrainState;
  stateAfter: BrainState;
  durationActualSeconds: number;
  // Optional — Phase 3 wires the user's resolved intent path through
  // the flow. Until then, defaults to 'default' (only path table 2.3
  // populates).
  intentPath?: IntentPath;
  onChoose: (choice: UserChosenNextStep) => void;
}

export function ShiftedResponse({
  stateBefore,
  stateAfter,
  durationActualSeconds,
  intentPath = 'default',
  onChoose,
}: ShiftedResponseProps) {
  const reduceMotion = useReducedMotion();

  // Ref to the latest onChoose so the auto-dismiss timer reads the
  // current callback without re-arming on parent re-renders.
  const onChooseRef = useRef(onChoose);
  useEffect(() => {
    onChooseRef.current = onChoose;
  }, [onChoose]);

  // Auto-dismiss timer. Mounts once per component instance; clears
  // on unmount via the cleanup return.
  useEffect(() => {
    const timer = setTimeout(() => {
      onChooseRef.current('auto_dismissed');
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const copy = getShiftedResponseCopy(stateBefore, stateAfter, intentPath);
  const durationMinutes = Math.max(1, Math.round(durationActualSeconds / 60));

  return (
    <Animated.View
      style={styles.container}
      entering={
        reduceMotion ? undefined : FadeIn.duration(STEP_TRANSITION_DURATION_MS)
      }
      testID="shifted-response"
    >
      <View style={styles.body}>
        <Text style={styles.title} testID="shifted-response-title">
          {copy.title}
        </Text>
        <Text style={styles.bodyText} testID="shifted-response-body">
          {copy.body({ durationMinutes })}
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onChoose('dismissed')}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          testID="shifted-response-continue"
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  footer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});
