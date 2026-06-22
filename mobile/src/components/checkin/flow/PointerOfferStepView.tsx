// Post-reflection OFFERED pointer (Vara_Engine_Contract.md §7, S2/Activated:
// grounding → focus-session [offer]). After the user reflects on the completed
// practice, an offered focus-session / plan is presented — never auto-chained.
// Accepting hands off to Pomodoro / routines (ends the flow); declining ends
// the flow quietly. Brand: calm, no pressure, no guilt.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { PracticePointer } from '../../../engine';

const MIN_TOUCH_TARGET = 48;

export interface PointerOfferStepViewProps {
  pointer: PracticePointer;
  onAccept: () => void;
  onDecline: () => void;
}

export function PointerOfferStepView({
  pointer,
  onAccept,
  onDecline,
}: PointerOfferStepViewProps) {
  const isFocus = pointer.type === 'focus-session';
  const noun = isFocus ? 'focus session' : 'plan';

  return (
    <View style={styles.container} testID="checkin-flow-pointer-offer">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} testID="checkin-flow-pointer-offer-title">
          Want to start your {noun}?
        </Text>
        <Text style={styles.body}>No pressure. It's here if you want it.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={isFocus ? 'Start focus session' : 'Open your plan'}
          testID="checkin-flow-pointer-offer-accept"
        >
          <Text style={styles.primaryButtonLabel}>
            {isFocus ? 'Start focus session' : 'Open your plan'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onDecline}
          accessibilityRole="button"
          accessibilityLabel="Not now"
          testID="checkin-flow-pointer-offer-decline"
        >
          <Text style={styles.secondaryButtonLabel}>Not now</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  primaryButtonLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
  secondaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  secondaryButtonLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    fontWeight: Typography.fontWeight.medium,
  },
});
