/**
 * The one-time Today entry into the Remove capture (slice 3c-i).
 *
 * SHOWN WHEN the user is in phase 'remove' and has no `removeCapturedAt`. That
 * is one field and one comparison, deliberately: the other four capture fields
 * can each legitimately be null after a completed capture, so gating on any of
 * them would re-offer the flow to someone who had already finished it.
 *
 * IT SUPPRESSES ContinuityCard WHILE IT SHOWS, per the card-ceiling decision.
 * Naming the thing to remove is the highest-priority action a Remove-phase user
 * has; a continuity count is a below-the-fold read on a weekly loop that is
 * being retired. The suppression is one conditional in DashboardScreen and it
 * lifts the moment the capture completes or is dismissed.
 *
 * DISMISS IS "I'LL NAME IT LATER", NOT "NO". The re-offer schedule (retire for
 * 7 days, show once more, then a quiet row) is NOT BUILT IN THIS SLICE. Today
 * the dismiss hides the card for the session only and fires the dismissed
 * event; the durable schedule lands with the phase page in slice 5. Stated here
 * because a card that silently returns on next launch is a different product
 * promise from one that waits a week.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { CAPTURE_CARD_COPY } from '../../screens/journey/removeCapture/copy';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;

export interface RemoveCaptureCardProps {
  onOpen: () => void;
  onDismiss: () => void;
}

export const RemoveCaptureCard: React.FC<RemoveCaptureCardProps> = ({
  onOpen,
  onDismiss,
}) => (
  <View style={styles.card} testID="home-remove-capture">
    <CardHeading icon="target" title={CAPTURE_CARD_COPY.title} />

    <Text style={styles.body}>{CAPTURE_CARD_COPY.body}</Text>

    <TouchableOpacity
      style={styles.cta}
      onPress={onOpen}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={CAPTURE_CARD_COPY.cta}
      testID="home-remove-capture-open"
    >
      <Text style={styles.ctaLabel}>{CAPTURE_CARD_COPY.cta}</Text>
    </TouchableOpacity>

    {/* Quiet and unbordered. Naming it later is a real answer and never a
        failure state, so it gets no warning colour and no emphasis. */}
    <TouchableOpacity
      style={styles.dismiss}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={CAPTURE_CARD_COPY.dismiss}
      testID="home-remove-capture-dismiss"
    >
      <Text style={styles.dismissLabel}>{CAPTURE_CARD_COPY.dismiss}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  dismiss: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
