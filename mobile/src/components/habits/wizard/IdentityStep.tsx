/**
 * IdentityStep - Step 2 (skippable)
 * Identity, identity statement preview, outcome goal
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { WizardStepProps } from './types';

export const IdentityStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Who are you becoming?</Text>
      <Text style={styles.subtitle}>
        Focus on the person you want to become, not just the outcome.
      </Text>

      <Input
        label="Identity (e.g., 'A runner', 'Someone who writes')"
        value={formData.identity}
        onChangeText={(text) => onUpdateFormData({ identity: text })}
        placeholder="A person who..."
        style={styles.input}
      />

      {formData.identity ? (
        <View style={styles.identityPreview}>
          <Text style={styles.identityPreviewText}>
            "I'm becoming {formData.identity.toLowerCase()}"
          </Text>
        </View>
      ) : null}

      <Input
        label="Outcome Goal (Optional)"
        value={formData.outcomeGoal}
        onChangeText={(text) => onUpdateFormData({ outcomeGoal: text })}
        placeholder="e.g., Run a 5K"
        style={styles.input}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
  },
  headline: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.base,
  },
  identityPreview: {
    backgroundColor: Colors.dewSage,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.tealMedium,
  },
  identityPreviewText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    fontStyle: 'italic',
    fontSize: Typography.fontSize.base,
  },
});
