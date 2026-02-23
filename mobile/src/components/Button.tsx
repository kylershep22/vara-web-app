/**
 * Custom Button Component
 * Styled button following Vara Mobile UI Standards v1.0
 *
 * Button Hierarchy:
 * - Primary: Evergreen Teal background, white text (main CTAs)
 * - Secondary: Silver Sage background, Soft Charcoal text (alternate actions)
 * - Outline: Teal border, Teal text (less prominent)
 * - Text: Teal text only (tertiary actions)
 */

import React from 'react';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Colors, Layout, Typography, TextStyles } from '../constants';

interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  size = 'md',
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
        // Evergreen Teal - main CTAs
        finalMode = 'contained';
        finalButtonColor = buttonColor || Colors.evergreenTeal;
        finalTextColor = textColor || Colors.textOnPrimary;
        break;
      case 'secondary':
        // Silver Sage - alternate actions (per UI standards)
        finalMode = 'contained';
        finalButtonColor = buttonColor || Colors.silverSage;
        finalTextColor = textColor || Colors.softCharcoal;
        break;
      case 'tertiary':
        // Dew Sage Light background, teal text
        finalMode = 'contained';
        finalButtonColor = buttonColor || Colors.dewSageLight;
        finalTextColor = textColor || Colors.evergreenTeal;
        break;
      case 'ghost':
        // Transparent background, muted text
        finalMode = 'text';
        finalTextColor = textColor || Colors.mutedSageGray;
        break;
      case 'outline':
        // Teal border and text
        finalMode = 'outlined';
        finalTextColor = textColor || Colors.evergreenTeal;
        break;
      case 'text':
        // Text only
        finalMode = 'text';
        finalTextColor = textColor || Colors.evergreenTeal;
        break;
      default:
        finalMode = 'contained';
    }
  }

  // Get button height based on size
  const getContentHeight = () => {
    switch (size) {
      case 'sm':
        return Layout.buttonHeight.sm; // 40px - tertiary/text buttons
      case 'lg':
        return Layout.buttonHeight.lg; // 56px - large CTAs
      case 'md':
      default:
        return Layout.buttonHeight.md; // 48px - primary/secondary
    }
  };

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
      contentStyle={[
        styles.content,
        { height: getContentHeight() },
      ]}
      labelStyle={styles.label}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    // radius-lg (12px) per UI standards
    borderRadius: Layout.borderRadius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    // Height set dynamically based on size prop
  },
  label: {
    // Per UI standards: 16px, Medium (500), no uppercase
    fontSize: TextStyles.button.fontSize,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: TextStyles.button.letterSpacing,
    // Note: textTransform is intentionally not set (no uppercase per UI standards)
  },
});

export default Button;
