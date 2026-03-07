/**
 * ScalingStep - Step 3 (skippable)
 * Full version, quick start, just show up
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { WizardStepProps } from './types';

export const ScalingStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Start small</Text>
      <Text style={styles.subtitle}>
        Make it flexible for tough days. All versions count!
      </Text>

      <Input
        label="Full Version"
        value={formData.fullVersion}
        onChangeText={(text) => onUpdateFormData({ fullVersion: text })}
        placeholder="e.g., Run for 30 minutes"
        style={styles.input}
      />

      <Input
        label="Quick Start (5-10 min version)"
        value={formData.quickStartVersion}
        onChangeText={(text) => onUpdateFormData({ quickStartVersion: text })}
        placeholder="e.g., Run for 10 minutes"
        style={styles.input}
      />

      <Input
        label="Just Show Up (1-2 min version)"
        value={formData.justShowUpVersion}
        onChangeText={(text) => onUpdateFormData({ justShowUpVersion: text })}
        placeholder="e.g., Put on shoes, step outside"
        style={styles.input}
      />

      <View style={styles.infoCard}>
        <Icon name="information-outline" size={16} color={Colors.evergreenTeal} />
        <Text style={styles.infoText}>
          On tough days, showing up is the win. Every version counts toward your progress!
        </Text>
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
  input: {
    marginBottom: Spacing.base,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dewSage,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.xs,
  },
  infoText: {
    flex: 1,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
});
