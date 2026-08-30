/**
 * IntentionStep - Step 5 (skippable)
 * Core Intention System feature
 * Category chip groups with custom input + values alignment
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { INTENTION_OPTIONS, INTENTION_CATEGORY_LABELS } from '../../../constants/intentions';
import { IntentionCategory, HabitIntention } from '../../../types/models';
import { WizardStepProps } from './types';

const CATEGORIES: IntentionCategory[] = [
  'focus_clarity',
  'regulation_recovery',
  'sustainable_consistency',
  'energy_resilience',
  'brain_health',
];

// The "YOUR VALUES" section that used to sit at the top of this step has been
// removed, along with the read that fed it.
//
// It read users/{uid}.values — a field NOTHING has ever written. (The live
// values data is `selectedValues`, written by onboarding.service and now stored
// on userPrivate.) `userValues` was therefore always empty, the section never
// rendered, and no user could reach the value-alignment picker. Removing the
// read alone would have left a state variable that is permanently [] feeding a
// block that can never render, so the whole chain goes.
//
// Habits can still CARRY a valueAlignment — ReviewStep, HabitListItem and the
// completion sheet all render it, and WizardContainer still hydrates it when
// editing an existing habit. Only the unreachable picker is gone. Wiring the
// section to `selectedValues` for real is a product change, not a migration
// one; logged as a follow-up.
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
          <Icon name="refresh" size={16} color={Colors.evergreenTeal} />
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
          placeholderTextColor={Colors.silverSage}
          maxLength={80}
        />
      </View>
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
    marginBottom: Spacing.base,
    lineHeight: 21,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dewSageLight,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  contextText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  // Values section
  // Intention categories
  categoryGroup: {
    marginBottom: Spacing.base,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.dewSageLight,
  },
  chipSelected: {
    backgroundColor: Colors.evergreenTeal,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.textOnPrimary,
  },
  customSection: {
    marginTop: Spacing.xs,
  },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
});
