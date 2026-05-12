// Sub-step 2.7 — recovery confirm UI for re_check force-quit recovery.
//
// Reached only when CheckInFlowScreen passes a 'recovery' FlowInit
// (marker present, within 30-min timeout, recoveryOfferedAt was null).
// Offers the user two choices: continue the recovered session
// (advance to re_check with the captured payload) or start fresh
// (reset to state_pick with entrySource='standard').
//
// Design constraints:
//   - Auto-dismiss is intentionally NOT used. The user opening the
//     app and seeing this prompt has already earned the right to a
//     deliberate decision; an auto-timeout would override their
//     agency. Build Guide §3 support over surveillance.
//   - Recovery framing is positive ("we caught you, you don't have
//     to redo"), not negative ("you crashed and lost your data").
//     "Picking up where you left off" rather than "Recovery" or
//     "Session restored" or "Welcome back."
//   - Both CTAs are deliberate; secondary is NOT visually demoted to
//     a footer link. "Start fresh" is a legitimate choice — some
//     users will tap it because the recovered moment has passed
//     emotionally even if it's still within the 30-min window.

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import type { Protocol } from '../../../types/models';

const TITLE = 'Picking up where you left off';

function buildBody(protocolName: string): string {
  return `You finished ${protocolName} a few minutes ago. Want to record how you're feeling now?`;
}

const PRIMARY_CTA = 'Yes, check in';
const SECONDARY_CTA = 'Start fresh';

export interface RecoveryConfirmStepViewProps {
  protocol: Protocol;
  onConfirm: () => void;
  onDecline: () => void;
}

export function RecoveryConfirmStepView({
  protocol,
  onConfirm,
  onDecline,
}: RecoveryConfirmStepViewProps) {
  return (
    <View style={styles.container} testID="checkin-flow-recovery-confirm">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          style={styles.title}
          testID="checkin-flow-recovery-confirm-title"
        >
          {TITLE}
        </Text>

        <Text
          style={styles.body}
          testID="checkin-flow-recovery-confirm-body"
        >
          {buildBody(protocol.name)}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={PRIMARY_CTA}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            testID="checkin-flow-recovery-confirm-primary"
          >
            <Text style={styles.primaryButtonText}>{PRIMARY_CTA}</Text>
          </Pressable>

          <Pressable
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel={SECONDARY_CTA}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            testID="checkin-flow-recovery-confirm-secondary"
          >
            <Text style={styles.secondaryButtonText}>{SECONDARY_CTA}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  actions: {
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
