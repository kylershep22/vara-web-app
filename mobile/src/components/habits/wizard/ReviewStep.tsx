/**
 * ReviewStep - Step 6
 * Summary of all entered data + problem field
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { INTENTION_CATEGORY_LABELS } from '../../../constants/intentions';
import { WizardStepProps } from './types';

interface SummaryRowProps {
  icon: string;
  label: string;
  value: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ icon, label, value }) => (
  <View style={styles.summaryRow}>
    <Icon name={icon as any} size={16} color={Colors.evergreenTeal} />
    <View style={styles.summaryContent}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  </View>
);

export const ReviewStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const typeDisplay = formData.type.charAt(0).toUpperCase() + formData.type.slice(1);

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Review your habit</Text>
      <Text style={styles.subtitle}>
        Everything look good? You can always edit later.
      </Text>

      <View style={styles.summaryCard}>
        <SummaryRow icon="lightning-bolt" label="Habit" value={formData.name || '(not set)'} />

        {formData.category ? (
          <SummaryRow icon="tag" label="Category" value={formData.category} />
        ) : null}

        <SummaryRow icon="calendar" label="Type" value={typeDisplay} />

        {formData.identity ? (
          <SummaryRow icon="account-star" label="Identity" value={formData.identity} />
        ) : null}

        {formData.fullVersion ? (
          <SummaryRow icon="rocket-launch" label="Full Version" value={formData.fullVersion} />
        ) : null}

        {formData.quickStartVersion ? (
          <SummaryRow icon="timer" label="Quick Start" value={formData.quickStartVersion} />
        ) : null}

        {formData.justShowUpVersion ? (
          <SummaryRow icon="shoe-print" label="Just Show Up" value={formData.justShowUpVersion} />
        ) : null}

        {formData.cueValue ? (
          <SummaryRow
            icon="calendar-clock"
            label="Trigger"
            value={`${formData.cueType === 'time' ? 'At' : formData.cueType === 'after_habit' ? 'After' : formData.cueType === 'location' ? 'At' : 'When'} ${formData.cueValue}`}
          />
        ) : null}

        {formData.intention ? (
          <SummaryRow
            icon="heart"
            label="Intention"
            value={`${formData.intention.label}${formData.intention.isCustom ? '' : ` (${INTENTION_CATEGORY_LABELS[formData.intention.category]})`}`}
          />
        ) : null}
      </View>

      <View style={styles.problemSection}>
        <Text style={styles.fieldLabel}>What problem are you solving? (Optional)</Text>
        <Input
          label="Problem"
          value={formData.problem}
          onChangeText={(text) => onUpdateFormData({ problem: text })}
          placeholder="e.g., I feel stressed after work"
          style={styles.input}
          multiline
          numberOfLines={2}
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
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.dewSageLight,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginTop: Spacing['2xs'],
  },
  problemSection: {
    marginTop: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.base,
  },
});
