/**
 * Vara Spacing System
 * Consistent spacing values across the app
 */

import { Platform } from 'react-native';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
} as const;

// Common layout values
export const Layout = {
  // Screen padding
  screenPaddingHorizontal: Spacing.md,
  screenPaddingVertical: Spacing.lg,

  // Card padding
  cardPadding: Spacing.md,
  cardMargin: Spacing.md,

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // Icon sizes
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },

  // Button heights
  buttonHeight: {
    sm: 36,
    md: 48,
    lg: 56,
  },

  // Input heights
  inputHeight: 48,

  // Header heights
  headerHeight: 56,
  tabBarHeight: 56,

  // Shadow/Elevation
  shadow: {
    sm: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
    md: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
    lg: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  // Border widths
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 3,
  },

  // Avatar sizes
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 64,
    xl: 100,
  },
} as const;
