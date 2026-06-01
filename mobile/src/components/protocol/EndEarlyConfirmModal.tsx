// Confirmation modal for the "End early" affordance in PlayerTransport.
//
// Verb alignment: the trigger button says "End early"; the modal CTA
// says "End early" (not "End session"). Body copy reuses the calm
// framing rather than the audio-script doc's "Are you sure?" — the
// latter implies the user has done something wrong.
//
// Visual hierarchy implements "neither pre-selected" via weight, not
// focus: "Keep going" is the emphasized primary (filled teal), "End
// early" is Soft Coral text-only. Destructive paths should never be
// the easy click. Light haptics on both buttons; no spring or flip
// animation on the overlay.

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, Typography } from '../../constants';

const MIN_TOUCH_TARGET = 48;

export interface EndEarlyConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function EndEarlyConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: EndEarlyConfirmModalProps) {
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCancel();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="end-early-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.card} testID="end-early-modal-card">
          <Text style={styles.body}>
            End early? We'll still save this session.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Keep going"
            testID="end-early-modal-keep-going"
          >
            <Text style={styles.primaryButtonText}>Keep going</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.destructiveButton}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="End early"
            testID="end-early-modal-confirm"
          >
            <Text style={styles.destructiveButtonText}>End early</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Build Guide: 40% black for centered modals.
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.background.default,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.evergreenTeal,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  destructiveButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    // No background — text-only treatment puts visual weight on
    // "Keep going" without making "End early" hard to tap.
  },
  destructiveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    // Muted Sage Gray: ending early is a benign, allowed exit, not a warning.
    // Visual hierarchy stays intact via the filled-teal "Keep going" primary;
    // coral stays reserved for genuine error states per the design system.
    color: Colors.mutedSageGray,
  },
});
