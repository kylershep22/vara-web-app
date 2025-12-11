/**
 * Vara App Theme
 * Complete theme configuration for React Native Paper
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Colors } from './colors';
import { Typography } from './typography';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.evergreenTeal,
    primaryContainer: Colors.silverSage,
    secondary: Colors.sunriseAmber,
    secondaryContainer: Colors.goldenApricot,
    tertiary: Colors.oliveSage,
    tertiaryContainer: Colors.dewSage,
    surface: Colors.surface,
    surfaceVariant: Colors.mistWhite,
    background: Colors.background,
    error: Colors.error,
    errorContainer: '#FFCDD2',
    onPrimary: Colors.textOnPrimary,
    onPrimaryContainer: Colors.textPrimary,
    onSecondary: Colors.textOnPrimary,
    onSecondaryContainer: Colors.textPrimary,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    onError: Colors.textOnPrimary,
    onBackground: Colors.textPrimary,
    outline: Colors.border,
    outlineVariant: Colors.borderLight,
    shadow: '#000000',
    scrim: Colors.overlay,
    inverseSurface: Colors.softCharcoal,
    inverseOnSurface: Colors.mistWhite,
    inversePrimary: Colors.silverSage,
    surfaceDisabled: Colors.borderLight,
    onSurfaceDisabled: Colors.textDisabled,
    backdrop: Colors.overlayLight,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    displayLarge: {
      ...MD3LightTheme.fonts.displayLarge,
      fontSize: Typography.fontSize['5xl'],
      fontWeight: Typography.fontWeight.light,
    },
    displayMedium: {
      ...MD3LightTheme.fonts.displayMedium,
      fontSize: Typography.fontSize['4xl'],
      fontWeight: Typography.fontWeight.regular,
    },
    displaySmall: {
      ...MD3LightTheme.fonts.displaySmall,
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.regular,
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.medium,
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.medium,
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.medium,
    },
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.regular,
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.regular,
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.regular,
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
  },
};

// Dark theme (for future dark mode support)
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.silverSage,
    primaryContainer: Colors.evergreenTeal,
    secondary: Colors.goldenApricot,
    secondaryContainer: Colors.sunriseAmber,
    tertiary: Colors.dewSage,
    tertiaryContainer: Colors.oliveSage,
    background: Colors.softCharcoal,
    surface: '#2C2C2C',
  },
};

// Export the default theme
export const theme = lightTheme;
