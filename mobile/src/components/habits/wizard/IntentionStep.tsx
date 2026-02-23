/**
 * IntentionStep - Step 5 (skippable)
 * Core Intention System feature
 * Category chip groups with custom input
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors } from '../../../constants';
import { INTENTION_OPTIONS, INTENTION_CATEGORY_LABELS } from '../../../constants/intentions';
import { IntentionCategory, HabitIntention } from '../../../types/models';
import { WizardStepProps } from './types';

const CATEGORIES: IntentionCategory[] = [
  'focus_clarity',
  'regulation_recovery',
  'sustainable_consistency',
  'energy_resilience',
];

export const IntentionStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const [customText, setCustomText] = useState(
    formData.intention?.isCustom ? formData.intention.label : ''
  );

  const handleSelectChip = (category: IntentionCategory, label: string) => {
    // If already selected, deselect
    if (
      formData.intention &&
      !formData.intention.isCustom &&
      formData.intention.label === label &&
      formData.intention.category === category
    ) {
      onUpdateFormData({ intention: undefined });
      return;
    }

    setCustomText('');
    onUpdateFormData({
      intention: {
        label,
        category,
        isCustom: false,
      },
    });
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    if (text.trim()) {
      onUpdateFormData({
        intention: {
          label: text.trim(),
          category: 'sustainable_consistency', // Default category for custom
          isCustom: true,
        },
      });
    } else {
      onUpdateFormData({ intention: undefined });
    }
  };

  const isChipSelected = (category: IntentionCategory, label: string) => {
    return (
      formData.intention !== undefined &&
      !formData.intention.isCustom &&
      formData.intention.label === label &&
      formData.intention.category === category
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>What is this habit supporting?</Text>
      <Text style={styles.subtitle}>
        This helps Vara tailor insights and reflections to what matters to you.
      </Text>

      {/* Habit context card */}
      {formData.name ? (
        <View style={styles.contextCard}>
          <Icon name="refresh" size={16} color="#1B5E57" />
          <Text style={styles.contextText}>
            {formData.name} · {formData.type === 'daily' ? 'Daily' : formData.type === 'weekly' ? 'Weekly' : 'Custom'}
          </Text>
        </View>
      ) : null}

      {/* Category groups with chip rows */}
      {CATEGORIES.map((category) => (
        <View key={category} style={styles.categoryGroup}>
          <Text style={styles.categoryLabel}>
            {INTENTION_CATEGORY_LABELS[category]}
          </Text>
          <View style={styles.chipRow}>
            {INTENTION_OPTIONS[category].map((label) => {
              const selected = isChipSelected(category, label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleSelectChip(category, label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Custom text input */}
      <View style={styles.customSection}>
        <Text style={styles.categoryLabel}>Or write your own</Text>
        <TextInput
          style={styles.customInput}
          value={customText}
          onChangeText={handleCustomTextChange}
          placeholder="e.g., Feel more confident at work"
          placeholderTextColor="#B8CDBA"
          maxLength={80}
        />
      </View>
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
    marginBottom: 16,
    lineHeight: 20,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D5E3D150',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  contextText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  categoryGroup: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F7F77',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: '#D5E3D199', // color-section 60%
  },
  chipSelected: {
    backgroundColor: '#1B5E57',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  customSection: {
    marginTop: 4,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#B8CDBA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#3E3E3E',
    backgroundColor: '#FFFFFF',
  },
});
