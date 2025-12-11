/**
 * Vara Spacing System
 * Consistent spacing values across the app
 */

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
} as const;
