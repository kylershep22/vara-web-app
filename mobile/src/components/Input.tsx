/**
 * Custom Input Component
 * Styled text input following Vara Mobile UI Standards v1.0
 *
 * Input fields use:
 * - 48px height (standard)
 * - 8px border radius (radius-md)
 * - 1.5px border (Silver Sage default, Evergreen Teal on focus)
 * - White background
 * - Soft Coral for error states (not red)
 */

import React from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { StyleSheet, View, Text } from 'react-native';
import { Colors, Layout, Typography, TextStyles } from '../constants';

interface InputProps extends Omit<TextInputProps, 'theme'> {
  error?: boolean;
  errorText?: string;
}

const Input: React.FC<InputProps> = ({
  error = false,
  errorText,
  style,
  ...props
}) => {
  return (
    <View>
      <TextInput
        mode="outlined"
        // Silver Sage default border, Evergreen Teal on focus
        outlineColor={error ? Colors.error : Colors.inputBorder}
        activeOutlineColor={error ? Colors.error : Colors.inputBorderFocus}
        // radius-md (8px) per UI standards
        outlineStyle={styles.outline}
        style={[styles.input, style]}
        contentStyle={styles.content}
        error={error}
        {...props}
      />
      {error && errorText && (
        <Text style={styles.errorText}>{errorText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    // White background per UI standards
    backgroundColor: Colors.inputBackground,
    // Body text size (16px)
    fontSize: Typography.fontSize.base,
  },
  outline: {
    // radius-md (8px) per UI standards
    borderRadius: Layout.borderRadius.md,
    // 1.5px border per UI standards
    borderWidth: Layout.borderWidth.medium,
  },
  content: {
    // 48px minimum height per UI standards
    minHeight: Layout.inputHeight,
  },
  errorText: {
    // Soft Coral error color (not alarming red)
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;
