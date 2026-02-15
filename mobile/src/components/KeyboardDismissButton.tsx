/**
 * KeyboardDismissButton Component
 * Reusable button to dismiss the keyboard
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants';
import { dismissKeyboard } from '../utils/keyboard';

interface KeyboardDismissButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  variant?: 'text' | 'contained' | 'icon';
}

export const KeyboardDismissButton: React.FC<KeyboardDismissButtonProps> = ({
  label = 'Done typing',
  icon = 'checkmark-circle',
  style,
  variant = 'contained',
}) => {
  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={dismissKeyboard}
        style={[styles.iconButton, style]}
        accessibilityLabel="Dismiss keyboard"
        accessibilityRole="button"
      >
        <Ionicons name={icon} size={24} color={Colors.evergreenTeal} />
      </TouchableOpacity>
    );
  }

  if (variant === 'text') {
    return (
      <TouchableOpacity
        onPress={dismissKeyboard}
        style={[styles.textButton, style]}
        accessibilityLabel="Dismiss keyboard"
        accessibilityRole="button"
      >
        <Ionicons name={icon} size={18} color={Colors.evergreenTeal} />
        <Text style={styles.textButtonLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={dismissKeyboard}
      style={[styles.containedButton, style]}
      accessibilityLabel="Dismiss keyboard"
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={18} color={Colors.evergreenTeal} />
      <Text style={styles.containedButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.dewSage,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  textButtonLabel: {
    color: Colors.evergreenTeal,
    fontSize: 14,
    fontWeight: '600',
  },
  containedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.dewSage,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  containedButtonLabel: {
    color: Colors.evergreenTeal,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default KeyboardDismissButton;
