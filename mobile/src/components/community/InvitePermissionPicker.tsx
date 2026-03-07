/**
 * InvitePermissionPicker Component
 * Allows users to select who can invite members to a group or challenge
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

export type InvitePermission = 'owner_only' | 'all_members';

interface InvitePermissionPickerProps {
  value: InvitePermission;
  onChange: (value: InvitePermission) => void;
  label?: string;
}

interface PermissionOption {
  value: InvitePermission;
  label: string;
  description: string;
  icon: string;
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'owner_only',
    label: 'Only I can invite',
    description: 'You control who joins',
    icon: 'account-lock',
  },
  {
    value: 'all_members',
    label: 'All members can invite',
    description: 'Anyone in the group can invite others',
    icon: 'account-multiple-plus',
  },
];

export const InvitePermissionPicker: React.FC<InvitePermissionPickerProps> = ({
  value,
  onChange,
  label = 'Who can invite members?',
}) => {
  const handleSelect = (option: InvitePermission) => {
    if (option !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(option);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsContainer}>
        {PERMISSION_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}>
                  <Icon
                    name={option.icon as any}
                    size={20}
                    color={isSelected ? Colors.white : Colors.evergreenTeal}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.radio,
                isSelected && styles.radioSelected,
              ]}>
                {isSelected && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  optionSelected: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.tealLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: Colors.evergreenTeal,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: Colors.evergreenTeal,
  },
  optionDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  radioSelected: {
    borderColor: Colors.evergreenTeal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.evergreenTeal,
  },
});

export default InvitePermissionPicker;
