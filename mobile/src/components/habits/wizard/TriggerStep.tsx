/**
 * TriggerStep - Step 4 (skippable)
 * Trigger type, cue value, implementation intention preview
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Layout } from '../../../constants';
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
        Clear plans increase success by 3x!
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
              color={formData.cueType === cueOption.type ? '#FFFFFF' : Colors.textSecondary}
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
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    marginBottom: Spacing.base,
  },
  cueTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.base,
  },
  cueTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    fontSize: 13,
  },
  cueTypeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  intentionPreview: {
    backgroundColor: '#FAFAF6',
    padding: Spacing.base,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  intentionPreviewLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  intentionPreviewText: {
    color: '#3E3E3E',
    fontWeight: '500',
    fontSize: 14,
  },
});
