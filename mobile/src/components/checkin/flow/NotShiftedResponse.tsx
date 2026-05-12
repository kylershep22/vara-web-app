// NotShiftedResponse — Section 5 "Some states take more time" screen.
//
// Phase 2.8.2 layout per vara_protocol_mockups.html Section 5:
//   Pill (just-completed protocol · duration) → teal H1 →
//   validating body → Highlight Card (Dew Sage bg, teal left accent) →
//   "If you'd like to keep going" section label → two path cards
//   (PRIMARY teal-bordered "Try something longer"; SECONDARY plain
//   "Rest and come back later") with icons.
//
// Pre-2.8.2 the CTAs were text links jammed against the bottom edge
// with FAB overlap. The Phase 2.8.1 FAB rule defaults to HIDE for
// guided-sequence screens (CheckInFlow has no showFAB declaration),
// so FAB no longer overlaps here.
//
// Late-night NSDR override (sub-step 2.4 — preserved):
//   When `lateNightOverride` is true (computed by the parent from
//   stateBefore === 'wired' AND device-local-hour in 22:00–03:59),
//   the "Try something longer" card's label/hint swap to the
//   NSDR-specific copy. Both modes still fire `'try_longer'`.
//
// No auto-dismiss timer (locked decision — not_shifted waits for
// explicit user action; Vara doesn't take the choice for them).
//
// Pill content (`protocolName` + `protocolDurationLabel`) is passed in
// from the parent rather than read from a Protocol object — keeps
// NotShiftedResponse decoupled from `types/models.Protocol`.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import type { IntentPath } from '../../../types/models';
import type { FlowEntrySource, UserChosenNextStep } from './types';
import { getNotShiftedCopy } from './notShiftedCopy';

const MIN_TOUCH_TARGET = 48;

export interface NotShiftedResponseProps {
  // Phase 2.8.2 — pill content shown at the top of the screen.
  // Decoupled from Protocol type so tests don't need a full fixture.
  protocolName: string;
  protocolDurationLabel: string;
  // Optional — Phase 3 wires the user's resolved intent path through
  // the flow. Until then, defaults to 'default'.
  intentPath?: IntentPath;
  // Optional — sub-step 2.6 plumbing seam. Phase 5 will use this to
  // surface softer not-shifted copy when the flow was entered via
  // the Overwhelm Safety Card.
  entrySource?: FlowEntrySource;
  // Computed by the parent (ResponseStepView) from stateBefore +
  // device-local-hour via getLateNightNSDRSwap. When true, the
  // "Try something longer" affordance shows the NSDR-specific copy.
  lateNightOverride: boolean;
  onChoose: (choice: UserChosenNextStep) => void;
}

export function NotShiftedResponse({
  protocolName,
  protocolDurationLabel,
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {protocolName} · {protocolDurationLabel}
          </Text>
        </View>

        <Text style={styles.title} testID="not-shifted-response-title">
          {copy.title}
        </Text>

        <Text style={styles.body} testID="not-shifted-response-body">
          {copy.body}
        </Text>

        <View
          style={styles.highlight}
          testID="not-shifted-response-highlight"
        >
          <Text style={styles.highlightText}>{copy.highlightText}</Text>
        </View>

        <Text style={styles.sectionLabel}>{copy.keepGoingLabel}</Text>

        <TouchableOpacity
          style={[styles.pathCard, styles.pathCardPrimary]}
          onPress={() => onChoose('try_longer')}
          accessibilityRole="button"
          accessibilityLabel={tryLongerLabel}
          testID="not-shifted-response-try-longer"
        >
          <Icon
            name="clock-outline"
            size={28}
            color={Colors.evergreenTeal}
            style={styles.pathCardIcon}
          />
          <View style={styles.pathCardTextWrap}>
            <Text style={styles.pathCardLabel}>{tryLongerLabel}</Text>
            <Text style={styles.pathCardHint}>{tryLongerHint}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, styles.pathCardSecondary]}
          onPress={() => onChoose('rest_later')}
          accessibilityRole="button"
          accessibilityLabel={copy.restLaterLabel}
          testID="not-shifted-response-rest-later"
        >
          <Icon
            name="waves"
            size={28}
            color={Colors.evergreenTeal}
            style={styles.pathCardIcon}
          />
          <View style={styles.pathCardTextWrap}>
            <Text style={styles.pathCardLabel}>{copy.restLaterLabel}</Text>
            <Text style={styles.pathCardHint}>{copy.restLaterHint}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: Spacing.md,
  },
  pillText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  highlight: {
    backgroundColor: Colors.dewSage,
    borderLeftWidth: 4,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  highlightText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  pathCardPrimary: {
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
  },
  pathCardSecondary: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pathCardIcon: {
    marginRight: Spacing.md,
  },
  pathCardTextWrap: {
    flex: 1,
  },
  pathCardLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  pathCardHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
