/**
 * ActionStep - Step 1 (required)
 * Habit name, category, type, frequency
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout, HABIT_CATEGORIES } from '../../../constants';
import { WizardStepProps } from './types';

export const ActionStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>What action proves it?</Text>
      <Text style={styles.subtitle}>Be specific about what you'll do.</Text>

      <Input
        label="Habit Name *"
        value={formData.name}
        onChangeText={(text) => onUpdateFormData({ name: text })}
        placeholder="e.g., Run for 30 minutes"
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Category</Text>
      <Menu
        visible={categoryMenuVisible}
        onDismiss={() => setCategoryMenuVisible(false)}
        anchor={
          <TouchableOpacity
            style={styles.categoryDropdown}
            onPress={() => setCategoryMenuVisible(true)}
          >
            <Text style={styles.categoryValue}>
              {formData.category || 'Select a category'}
            </Text>
            <Icon
              name={categoryMenuVisible ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        }
      >
        {HABIT_CATEGORIES.map((category) => (
          <Menu.Item
            key={category}
            onPress={() => {
              onUpdateFormData({ category });
              setCategoryMenuVisible(false);
            }}
            title={category}
          />
        ))}
      </Menu>

      <Text style={styles.fieldLabel}>Type</Text>
      <View style={styles.typeButtons}>
        {(['daily', 'weekly', 'custom'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => onUpdateFormData({ type })}
            style={[
              styles.typeButton,
              formData.type === type && styles.typeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.typeButtonText,
                formData.type === type && styles.typeButtonTextActive,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  categoryDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.base,
  },
  categoryValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  typeButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
});
