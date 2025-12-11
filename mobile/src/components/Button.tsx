/**
 * Custom Button Component
 * Styled button following Vara design system
 */

import React from 'react';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants';

interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  fullWidth?: boolean;
}

const Button: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  mode,
  style,
  buttonColor,
  textColor,
  ...props
}) => {
  // Determine mode and colors based on variant
  let finalMode = mode;
  let finalButtonColor = buttonColor;
  let finalTextColor = textColor;

  if (!mode) {
    switch (variant) {
      case 'primary':
        finalMode = 'contained';
        finalButtonColor = buttonColor || Colors.evergreenTeal;
        finalTextColor = textColor || Colors.textOnPrimary;
        break;
      case 'secondary':
        finalMode = 'contained';
        finalButtonColor = buttonColor || Colors.sunriseAmber;
        finalTextColor = textColor || Colors.textOnPrimary;
        break;
      case 'outline':
        finalMode = 'outlined';
        finalTextColor = textColor || Colors.evergreenTeal;
        break;
      case 'text':
        finalMode = 'text';
        finalTextColor = textColor || Colors.evergreenTeal;
        break;
      default:
        finalMode = 'contained';
    }
  }

  return (
    <PaperButton
      mode={finalMode}
      buttonColor={finalButtonColor}
      textColor={finalTextColor}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        style,
      ]}
      contentStyle={styles.content}
      labelStyle={styles.label}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
