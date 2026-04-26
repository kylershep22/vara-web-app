// Step 6 of the multi-step check-in flow: adaptive response.
//
// THIS IS A SUB-STEP 2.2 PLACEHOLDER. The polished components land
// later:
//   - Sub-step 2.3 builds the full ShiftedResponse with the
//     Record<TransitionKey, string> copy table covering all 16
//     positive transitions (per-IntentPath nesting in Phase 5).
//   - Sub-step 2.4 builds the full NotShiftedResponse with the
//     validating copy + nuanced behavior (e.g., late-night NSDR
//     swap on the "try longer" affordance).
//
// The placeholder here exists so the 2.2 flow is end-to-end
// testable on device: the user reaches a screen that lets them
// dispatch `next_step_chosen` with each of the four valid choices.
// Visual fidelity to the Build Guide is intentionally minimal at
// this stage — copy and styling are not the deliverable here.

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { BrainState } from '../../../types/models';
import type { ClassifierOutcome } from '../../../services/outcomeClassifier';
import type { UserChosenNextStep } from './types';

const MIN_TOUCH_TARGET = 48;

// 4-second auto-dismiss on the shifted/maintenance/partial_shift
// paths (Core Loop v2 line 238). Not applied to not_shifted — that
// path waits for an explicit user choice (locked decision: no
// automatic action when the user didn't shift).
const AUTO_DISMISS_DELAY_MS = 4000;

export interface ResponseStepViewProps {
  stateBefore: BrainState;
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
  onChoose: (choice: UserChosenNextStep) => void;
}

const STATE_LABEL: Record<BrainState, string> = {
  wired: 'Wired',
  foggy: 'Foggy',
  steady: 'Steady',
  clear: 'Clear',
  alive: 'Alive',
};

export function ResponseStepView({
  stateBefore,
  stateAfter,
  outcome,
  onChoose,
}: ResponseStepViewProps) {
  // Ref to the latest onChoose so the auto-dismiss timer reads the
  // current callback without re-arming on parent re-renders.
  const onChooseRef = useRef(onChoose);
  useEffect(() => {
    onChooseRef.current = onChoose;
  }, [onChoose]);

  // Auto-dismiss timer for the positive-outcome paths. Not_shifted
  // requires explicit user action, so no timer is armed there.
  useEffect(() => {
    if (outcome === 'not_shifted') return;
    const timer = setTimeout(() => {
      onChooseRef.current('auto_dismissed');
    }, AUTO_DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  if (outcome === 'not_shifted') {
    return (
      <View style={styles.container} testID="checkin-flow-response">
        <View style={styles.body}>
          <Text style={styles.title} testID="checkin-flow-response-title">
            Some states take more time.
          </Text>
          <Text style={styles.subtitle}>
            That's normal. A short protocol can't reach everything.
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onChoose('try_longer')}
            accessibilityRole="button"
            accessibilityLabel="Try something longer"
            testID="checkin-flow-response-try-longer"
          >
            <Text style={styles.secondaryButtonText}>Try something longer</Text>
            <Text style={styles.secondaryButtonHint}>When you have 10+ minutes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onChoose('rest_later')}
            accessibilityRole="button"
            accessibilityLabel="Rest and come back later"
            testID="checkin-flow-response-rest-later"
          >
            <Text style={styles.secondaryButtonText}>Rest and come back later</Text>
            <Text style={styles.secondaryButtonHint}>The next check-in will still be here</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Positive paths: shifted | partial_shift | maintenance.
  const headline = positiveHeadline(outcome);
  return (
    <View style={styles.container} testID="checkin-flow-response">
      <View style={styles.body}>
        <Text style={styles.title} testID="checkin-flow-response-title">
          {headline}
        </Text>
        <Text style={styles.subtitle}>
          {STATE_LABEL[stateBefore]} to {STATE_LABEL[stateAfter]}.
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onChoose('dismissed')}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          testID="checkin-flow-response-continue"
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Minimal headlines — sub-step 2.3 replaces these with the full
// per-transition copy table.
function positiveHeadline(outcome: ClassifierOutcome): string {
  switch (outcome) {
    case 'shifted':
      return 'You shifted.';
    case 'partial_shift':
      return 'A small shift.';
    case 'maintenance':
      return 'Held steady.';
    case 'not_shifted':
      // Unreachable in this branch; switch is exhaustive for the
      // type-checker.
      return '';
  }
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
  subtitle: {
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
  secondaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  secondaryButtonHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
});
