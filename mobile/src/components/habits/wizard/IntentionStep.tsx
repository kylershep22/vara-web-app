/**
 * IntentionStep - Step 5 (skippable)
 * Core Intention System feature
 * Category chip groups with custom input + values alignment
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
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

export const IntentionStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const { user } = useAuth();
  const [customText, setCustomText] = useState(
    formData.intention?.isCustom ? formData.intention.label : ''
  );
  const [userValues, setUserValues] = useState<string[]>([]);

  // Fetch user values from profile
  useEffect(() => {
    if (!user) return;
    const fetchValues = async () => {
      try {
        if (!db) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.data();
        if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
          setUserValues(data.values);
        }
      } catch {
        // Silently fail — values section simply won't appear
      }
    };
    fetchValues();
  }, [user]);

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

  const handleSelectValue = (value: string) => {
    // Toggle: if already selected, deselect
    if (formData.valueAlignment === value) {
      onUpdateFormData({ valueAlignment: null });
    } else {
      onUpdateFormData({ valueAlignment: value });
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

      {/* Values section — only if user has stored values */}
      {userValues.length > 0 && (
        <>
          <Text style={styles.valuesLabel}>YOUR VALUES</Text>
          <View style={styles.valuesChipRow}>
            {userValues.map((value) => {
              const selected = formData.valueAlignment === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.valueChip, selected && styles.valueChipSelected]}
                  onPress={() => handleSelectValue(value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.valueChipText, selected && styles.valueChipTextSelected]}>
                    → {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.valuesHelper, formData.valueAlignment && styles.valuesHelperActive]}>
            {formData.valueAlignment
              ? `Completions will echo "${formData.valueAlignment}" as a quiet reminder.`
              : 'Optionally link to one of your values.'}
          </Text>
          <View style={styles.valuesDivider} />
        </>
      )}

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
  valuesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E57',
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 11,
    marginTop: 12,
    marginBottom: 8,
  },
  valuesChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B8CDBA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueChipSelected: {
    backgroundColor: '#1B5E57',
    borderColor: '#1B5E57',
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  valueChipTextSelected: {
    color: '#FFFFFF',
  },
  valuesHelper: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9AA89E',
    marginTop: 8,
  },
  valuesHelperActive: {
    color: '#6F7F77',
  },
  valuesDivider: {
    height: 1,
    backgroundColor: '#E0E8E0',
    marginVertical: 12,
  },
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
