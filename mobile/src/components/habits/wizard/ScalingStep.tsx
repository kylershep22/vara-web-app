/**
 * ScalingStep - Step 3 (skippable)
 * Full version, quick start, just show up
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing } from '../../../constants';
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.dewSage,
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: Colors.evergreenTeal,
    fontSize: 12,
    lineHeight: 17,
  },
});
