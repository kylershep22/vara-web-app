// Step 6 of the multi-step check-in flow: adaptive response.
//
// Sub-step 2.3 update:
//   - Positive outcomes (shifted | partial_shift | maintenance)
//     delegate to ShiftedResponse, which reads its title and body
//     from the per-transition copy table.
//   - The not_shifted path STILL uses the placeholder UI here. It
//     reads its strings from notShiftedCopy.ts so iteration on the
//     copy doesn't churn this file. Sub-step 2.4 replaces this branch
//     with the full NotShiftedResponse component.
//
// The auto-dismiss timer for the positive paths now lives inside
// ShiftedResponse. This view no longer arms a timer for those
// outcomes — that's a single owner per concern.
//
// `durationActualSeconds` flows in from the FlowState's ReCheckStep /
// ResponseStep payload (computed at player exit). ShiftedResponse
// converts to minutes for body interpolation.

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { BrainState, IntentPath } from '../../../types/models';
import type { ClassifierOutcome } from '../../../services/outcomeClassifier';
import type { UserChosenNextStep } from './types';
import { ShiftedResponse } from './ShiftedResponse';
import { getNotShiftedCopy } from './notShiftedCopy';

const MIN_TOUCH_TARGET = 48;

export interface ResponseStepViewProps {
  stateBefore: BrainState;
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
  durationActualSeconds: number;
  // Optional — Phase 3 wires the user's resolved intent path into
  // the flow. Until then, defaults to 'default' (the only path 2.3
  // populates). Forwarded to ShiftedResponse / getNotShiftedCopy.
  intentPath?: IntentPath;
  onChoose: (choice: UserChosenNextStep) => void;
}

export function ResponseStepView({
  stateBefore,
  stateAfter,
  outcome,
  durationActualSeconds,
  intentPath = 'default',
  onChoose,
}: ResponseStepViewProps) {
  // Positive outcomes delegate to ShiftedResponse (owns its own
  // auto-dismiss timer, copy lookup, render).
  if (outcome !== 'not_shifted') {
    return (
      <ShiftedResponse
        stateBefore={stateBefore}
        stateAfter={stateAfter}
        durationActualSeconds={durationActualSeconds}
        intentPath={intentPath}
        onChoose={onChoose}
      />
    );
  }

  // not_shifted placeholder — replaced by NotShiftedResponse in 2.4.
  // Strings sourced from notShiftedCopy.ts so the copy can iterate
  // without component churn.
  const copy = getNotShiftedCopy(intentPath);
  return (
    <View style={styles.container} testID="checkin-flow-response">
      <View style={styles.body}>
        <Text style={styles.title} testID="checkin-flow-response-title">
          {copy.title}
        </Text>
        <Text style={styles.subtitle}>{copy.body}</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onChoose('try_longer')}
          accessibilityRole="button"
          accessibilityLabel={copy.tryLongerLabel}
          testID="checkin-flow-response-try-longer"
        >
          <Text style={styles.secondaryButtonText}>{copy.tryLongerLabel}</Text>
          <Text style={styles.secondaryButtonHint}>{copy.tryLongerHint}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onChoose('rest_later')}
          accessibilityRole="button"
          accessibilityLabel={copy.restLaterLabel}
          testID="checkin-flow-response-rest-later"
        >
          <Text style={styles.secondaryButtonText}>{copy.restLaterLabel}</Text>
          <Text style={styles.secondaryButtonHint}>{copy.restLaterHint}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  footer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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
