/**
 * TriggerStep - Step 4 (skippable)
 * Trigger type, cue value, implementation intention preview
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { WizardStepProps } from './types';

const CUE_OPTIONS = [
  { type: 'time' as const, label: 'Time', icon: 'clock-outline' },
  { type: 'after_habit' as const, label: 'After Habit', icon: 'link-variant' },
  { type: 'location' as const, label: 'Location', icon: 'map-marker' },
  { type: 'emotion' as const, label: 'Feeling', icon: 'emoticon-happy-outline' },
];

export const TriggerStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const getCuePrefix = () => {
    switch (formData.cueType) {
      case 'time': return 'At';
      case 'after_habit': return 'After';
      case 'location': return 'At';
      case 'emotion': return 'When I feel';
    }
  };

  const getInputLabel = () => {
    switch (formData.cueType) {
      case 'time': return 'Time (e.g., 7:00 AM)';
      case 'after_habit': return 'After which habit/routine?';
      case 'location': return 'Where?';
      case 'emotion': return 'When you feel...';
    }
  };

  const getPlaceholder = () => {
    switch (formData.cueType) {
      case 'time': return '7:00 AM';
      case 'after_habit': return 'After morning coffee';
      case 'location': return 'At my desk';
      case 'emotion': return 'Stressed';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Your when/where plan</Text>
      <Text style={styles.subtitle}>
        Having a clear plan can help you follow through.
      </Text>

      <Text style={styles.fieldLabel}>Trigger Type</Text>
      <View style={styles.cueTypeButtons}>
        {CUE_OPTIONS.map((cueOption) => (
          <TouchableOpacity
            key={cueOption.type}
            onPress={() => onUpdateFormData({ cueType: cueOption.type })}
            style={[
              styles.cueTypeButton,
              formData.cueType === cueOption.type && styles.cueTypeButtonActive,
            ]}
          >
            <Icon
              name={cueOption.icon}
              size={16}
              color={formData.cueType === cueOption.type ? Colors.textOnPrimary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.cueTypeButtonText,
                formData.cueType === cueOption.type && styles.cueTypeButtonTextActive,
              ]}
            >
              {cueOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label={getInputLabel()}
        value={formData.cueValue}
        onChangeText={(text) => onUpdateFormData({ cueValue: text })}
        placeholder={getPlaceholder()}
        style={styles.input}
      />

      {formData.cueValue ? (
        <View style={styles.intentionPreview}>
          <Text style={styles.intentionPreviewLabel}>Your plan:</Text>
          <Text style={styles.intentionPreviewText}>
            "{getCuePrefix()} {formData.cueValue}, I will {formData.name.toLowerCase() || '...'}"
          </Text>
        </View>
      ) : null}
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
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
  },
  input: {
    marginBottom: Spacing.base,
  },
  cueTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  cueTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cueTypeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  cueTypeButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  cueTypeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  intentionPreview: {
    backgroundColor: Colors.background.default,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  intentionPreviewLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing['2xs'],
  },
  intentionPreviewText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.sm,
  },
});
