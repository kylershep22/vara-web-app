/**
 * ActionStep - Step 1 (required)
 * Habit name, category, type, frequency
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout, HABIT_CATEGORIES } from '../../../constants';
import { isCognitiveReserveCategory, CR_CALLOUT_CONTENT, CR_CALLOUT_FALLBACK } from '../../../constants/habitCategories';
import { WizardStepProps } from './types';

export const ActionStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [crFadeAnim] = useState(new Animated.Value(0));
  const isCR = isCognitiveReserveCategory(formData.category);
  const crCallout = formData.category
    ? CR_CALLOUT_CONTENT[formData.category] || (isCR ? CR_CALLOUT_FALLBACK : null)
    : null;

  React.useEffect(() => {
    if (isCR) {
      Animated.timing(crFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      crFadeAnim.setValue(0);
    }
  }, [isCR, crFadeAnim]);

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

      <Modal
        visible={categoryMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setCategoryMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <ScrollView>
              {HABIT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onUpdateFormData({ category });
                    setCategoryMenuVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {isCR && crCallout && (
        <Animated.View style={[styles.crCallout, { opacity: crFadeAnim }]}>
          <Text style={styles.crCalloutHeadline}>🌿 {crCallout.headline}</Text>
          <Text style={styles.crCalloutBody}>{crCallout.body}</Text>
        </Animated.View>
      )}

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
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.sm,
  },
  typeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    maxHeight: 300,
    width: '80%',
    paddingVertical: Spacing.sm,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  dropdownItemText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  crCallout: {
    backgroundColor: '#E6F2EC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  crCalloutHeadline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A6E4A',
    marginBottom: 2,
  },
  crCalloutBody: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(42, 110, 74, 0.85)',
    lineHeight: 12 * 1.55,
  },
});
