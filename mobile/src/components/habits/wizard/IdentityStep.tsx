/**
 * IdentityStep - Step 2 (skippable)
 * Identity, identity statement preview, outcome goal
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Input } from '../../';
import { Colors, Spacing } from '../../../constants';
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
    paddingHorizontal: 16,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B5E57',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6F7F77',
    marginBottom: 20,
  },
  input: {
    marginBottom: Spacing.base,
  },
  identityPreview: {
    backgroundColor: Colors.dewSage,
    padding: Spacing.base,
    borderRadius: 8,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal + '40',
  },
  identityPreviewText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    fontStyle: 'italic',
    fontSize: 15,
  },
});
