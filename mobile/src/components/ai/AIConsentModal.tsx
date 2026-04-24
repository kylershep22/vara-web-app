/**
 * AIConsentModal
 * First-use consent prompt for AI features. Shown when a user triggers
 * daily plan, AI chat, or journal AI tools without having granted consent.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { EnhancedModal } from '../shared/EnhancedModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface AIConsentModalProps {
  visible: boolean;
  saving?: boolean;
  onEnable: () => void;
  onDecline: () => void;
}

export const AIConsentModal: React.FC<AIConsentModalProps> = ({
  visible,
  saving = false,
  onEnable,
  onDecline,
}) => {
  const footer = (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={onDecline}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Not now"
      >
        <Text style={styles.secondaryText}>Not now</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.primary, saving && styles.primaryDisabled]}
        onPress={onEnable}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Enable AI"
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.primaryText}>Enable AI</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={onDecline}
      title="Enable AI features"
      headerIcon="auto-fix"
      hasInputs={false}
      showCloseButton={false}
      footer={footer}
    >
      <Text style={styles.body}>
        To make Vara feel personal, a few features are powered by OpenAI: your daily plan, AI chat,
        and journal tools. When you use them, what you write is shared along with a bit of context
        so the response actually fits you.
      </Text>
      <Text style={styles.body}>OpenAI doesn't use any of this to train their models.</Text>
      <Text style={styles.body}>You can turn AI off anytime in Settings.</Text>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.base,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: Colors.evergreenTeal,
  },
  primaryDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  secondaryText: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default AIConsentModal;
