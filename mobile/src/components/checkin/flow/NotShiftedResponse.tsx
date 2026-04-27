// NotShiftedResponse — not_shifted-outcome response screen.
//
// Replaces the sub-step 2.2 placeholder branch in ResponseStepView
// for the not_shifted classifier outcome. Reads strings from
// `getNotShiftedCopy(intentPath)`.
//
// Late-night NSDR override (sub-step 2.4):
//   When `lateNightOverride` is true (computed by the parent from
//   stateBefore === 'wired' AND device-local-hour in 22:00–03:59),
//   the "Try something longer" button label and hint swap to the
//   NSDR-specific copy. The action shape is unchanged — both modes
//   fire `'try_longer'` on tap. The actual route to PracticeRun(nsdr-20)
//   vs Practices index is the parent's responsibility (see
//   CheckInFlow.tsx and the dev harness).
//
// No auto-dismiss timer (locked decision — not_shifted waits for
// explicit user action; Vara doesn't take the choice for them).

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { IntentPath } from '../../../types/models';
import type { FlowEntrySource, UserChosenNextStep } from './types';
import { getNotShiftedCopy } from './notShiftedCopy';

const MIN_TOUCH_TARGET = 48;

export interface NotShiftedResponseProps {
  // Optional — Phase 3 wires the user's resolved intent path through
  // the flow. Until then, defaults to 'default'.
  intentPath?: IntentPath;
  // Optional — sub-step 2.6 plumbing seam. Phase 5 will use this to
  // surface softer not-shifted copy when the flow was entered via
  // the Overwhelm Safety Card (per Core Loop v2 §Case 3 lines 296–
  // 301: "That was a hard moment. Nothing more is required of you
  // right now. Rest."). Threaded but unused in 2.6 to prevent
  // Phase 5 from having to reopen 2.4's signatures. Same forward-
  // engineering pattern as FlowInit's discriminated variants.
  entrySource?: FlowEntrySource;
  // Computed by the parent (ResponseStepView) from stateBefore +
  // device-local-hour via getLateNightNSDRSwap. When true, the
  // "Try something longer" affordance shows the NSDR-specific copy.
  lateNightOverride: boolean;
  onChoose: (choice: UserChosenNextStep) => void;
}

export function NotShiftedResponse({
  intentPath = 'default',
  // entrySource is intentionally unused in 2.6 — Phase 5 will read
  // it to switch on Overwhelm-vs-standard not-shifted copy. Kept on
  // the prop signature so Phase 5 wiring is non-breaking.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entrySource,
  lateNightOverride,
  onChoose,
}: NotShiftedResponseProps) {
  const copy = getNotShiftedCopy(intentPath);

  const tryLongerLabel = lateNightOverride
    ? copy.lateNightTryLongerLabel
    : copy.tryLongerLabel;
  const tryLongerHint = lateNightOverride
    ? copy.lateNightTryLongerHint
    : copy.tryLongerHint;

  return (
    <View style={styles.container} testID="not-shifted-response">
      <View style={styles.body}>
        <Text style={styles.title} testID="not-shifted-response-title">
          {copy.title}
        </Text>
        <Text style={styles.bodyText} testID="not-shifted-response-body">
          {copy.body}
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onChoose('try_longer')}
          accessibilityRole="button"
          accessibilityLabel={tryLongerLabel}
          testID="not-shifted-response-try-longer"
        >
          <Text style={styles.secondaryButtonText}>{tryLongerLabel}</Text>
          <Text style={styles.secondaryButtonHint}>{tryLongerHint}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onChoose('rest_later')}
          accessibilityRole="button"
          accessibilityLabel={copy.restLaterLabel}
          testID="not-shifted-response-rest-later"
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
  bodyText: {
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
