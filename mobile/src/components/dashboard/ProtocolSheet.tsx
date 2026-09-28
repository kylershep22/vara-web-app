/**
 * The Remove protocol, in full: what to do and why it can help (slice 9.1b).
 * Opened from the Today card's content area.
 *
 * THE FIRST SURFACE THAT RENDERS `whyItWorks`. Remove's nine were authored in
 * slice 3a and held for this screen; none has been seen by a user before.
 *
 * PRESENTATIONAL, on the DailyPickerSheet precedent. It owns no write and no
 * service call, and it does not mount a useTodayCard of its own: a second
 * instance would load separately and leave the card underneath stale. Home
 * owns the pin (usePinnedProtocol) and hands this component what it shows.
 *
 * IT SHOWS THE PIN, NEVER THE LIVE CARD. Everything here comes off the
 * snapshot taken when the sheet opened, so nothing on screen changes under a
 * user who is reading it. What CAN change is whether the pin may still be
 * completed, and that arrives as three booleans the pin derives.
 *
 * THE ONE ACTION IS THE SAME ONE THE CARD HAS. "Mark it done", with the card's
 * approved string and the card's acknowledgment, from TodayCompletion. No "Do
 * it now": under Remove-only there is nothing for it to route to, and a control
 * must not claim an outcome it did not produce. The dismiss is secondary and
 * quiet, never a second primary.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../shared/Text';

import { Colors, Layout, SizeTokens, Spacing, Typography } from '../../constants';
import { EnhancedModal } from '../shared/EnhancedModal';
import type { ProtocolSnapshot } from '../../hooks/usePinnedProtocol';
import { COMPLETION_COPY, CompletionDoneRow } from './TodayCompletion';
import { PROTOCOL_SHEET_COPY } from './protocolSheet.copy';

export interface ProtocolSheetProps {
  snapshot: ProtocolSnapshot;
  /** The PINNED day is done. Never the live card's `completed`. */
  done: boolean;
  /**
   * This device knows the day's plan has moved on from the pin. The content
   * stays; the completion control is replaced by a line that says so.
   */
  diverged: boolean;
  completable: boolean;
  saveFailed: boolean;
  onMarkDone: () => void;
  onDismiss: () => void;
}

export const ProtocolSheet: React.FC<ProtocolSheetProps> = ({
  snapshot,
  done,
  diverged,
  completable,
  saveFailed,
  onMarkDone,
  onDismiss,
}) => {
  const { protocol, consistentDays } = snapshot;

  return (
    <EnhancedModal
      visible
      onDismiss={onDismiss}
      title={PROTOCOL_SHEET_COPY.title}
      subtitle={protocol.name}
      hasInputs={false}
      showCloseButton={false}
      testID="protocol-sheet"
      footer={
        <View>
          {/* DONE WINS OVER DIVERGED. Completion is keyed to the date alone, so
              a day finished before the plan moved is still finished; the card
              keeps a done day showing done across a variant change for the
              same reason. */}
          {done ? (
            <CompletionDoneRow
              protocol={protocol}
              consistentDays={consistentDays}
              testID="protocol-sheet-done"
            />
          ) : diverged ? (
            // IN PLACE OF THE CONTROL, not beside a dead one. A dimmed button
            // with no reason is the silent decline this board has flagged
            // before, and on a surface the user chose to open it would read as
            // broken. The dismiss below is the way back to the current plan.
            <Text
              style={styles.diverged}
              testID="protocol-sheet-diverged"
              accessibilityLiveRegion="polite"
            >
              {PROTOCOL_SHEET_COPY.diverged}
            </Text>
          ) : (
            <TouchableOpacity
              style={[styles.cta, !completable && styles.ctaDisabled]}
              onPress={onMarkDone}
              disabled={!completable}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !completable }}
              accessibilityLabel={COMPLETION_COPY.markDone}
              testID="protocol-sheet-complete"
            >
              <Text style={styles.ctaLabel}>{COMPLETION_COPY.markDone}</Text>
            </TouchableOpacity>
          )}

          {saveFailed && !done && (
            <Text style={styles.error} testID="protocol-sheet-error">
              {COMPLETION_COPY.saveFailed}
            </Text>
          )}

          <TouchableOpacity
            style={styles.dismiss}
            // NOT held while saving. The scrim and the back button dismiss
            // regardless, and the write settles into Home's state whether or
            // not the sheet is still open to see it.
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={PROTOCOL_SHEET_COPY.dismiss}
            testID="protocol-sheet-dismiss"
          >
            <Text style={styles.dismissLabel}>{PROTOCOL_SHEET_COPY.dismiss}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.heading} accessibilityRole="header">
        {PROTOCOL_SHEET_COPY.actionHeading}
      </Text>
      <Text style={styles.body} testID="protocol-sheet-action">
        {protocol.dailyAction}
      </Text>

      <Text style={[styles.heading, styles.secondHeading]} accessibilityRole="header">
        {PROTOCOL_SHEET_COPY.whyHeading}
      </Text>
      <Text style={styles.body} testID="protocol-sheet-why">
        {protocol.whyItWorks}
      </Text>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  secondHeading: {
    marginTop: Spacing.lg,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  cta: {
    minHeight: SizeTokens.touchTargetMin,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  diverged: {
    minHeight: SizeTokens.touchTargetMin,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  error: {
    marginTop: Spacing.sm,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  // Quiet and unbordered, the DailyPickerSheet skip's treatment: always
  // available, never the thing being asked for.
  dismiss: {
    minHeight: SizeTokens.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
