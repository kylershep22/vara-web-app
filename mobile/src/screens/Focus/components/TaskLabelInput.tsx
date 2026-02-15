/**
 * TaskLabelInput Component
 * Text input for naming focus task
 *
 * Per Focus Page Spec Section 5.1:
 * - Label: "What are you focusing on?" - 12px Medium, text-secondary
 * - Input: surface bg, 1.5px secondary border, radius-md, 44px height
 * - Focus border: 1.5px primary
 * - Placeholder: "e.g., Writing, deep reading, design work..."
 */

import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';

interface TaskLabelInputProps {
  /** Current task label value */
  value: string;
  /** Callback when value changes */
  onChangeText: (text: string) => void;
  /** Whether input is disabled (e.g., timer running) */
  disabled?: boolean;
}

export const TaskLabelInput: React.FC<TaskLabelInputProps> = ({
  value,
  onChangeText,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{FocusCopy.taskInputLabel}</Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          disabled && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={FocusCopy.taskInputPlaceholder}
        placeholderTextColor={ColorTokens.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
        maxLength={100}
        returnKeyType="done"
        accessibilityLabel={FocusCopy.taskInputLabel}
        accessibilityHint="Enter the task you want to focus on"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20, // spacing-base + spacing-xs per spec
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
    marginBottom: 10,
  },
  input: {
    height: SizeTokens.inputHeight,
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.md,
    borderWidth: 1.5,
    borderColor: ColorTokens.secondary,
    paddingHorizontal: SpacingTokens.md,
    fontSize: 15,
    color: ColorTokens.textPrimary,
  },
  inputFocused: {
    borderColor: ColorTokens.primary,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: ColorTokens.surfaceTintedLight,
  },
});

export default TaskLabelInput;
