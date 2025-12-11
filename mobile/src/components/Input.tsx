/**
 * Custom Input Component
 * Styled text input following Vara design system
 */

import React from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Colors } from '../constants';

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
    <TextInput
      mode="outlined"
      outlineColor={error ? Colors.error : Colors.border}
      activeOutlineColor={error ? Colors.error : Colors.evergreenTeal}
      style={[styles.input, style]}
      error={error}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface,
  },
});

export default Input;
