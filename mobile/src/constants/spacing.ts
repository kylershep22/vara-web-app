/**
 * Vara Spacing System
 * Consistent spacing values across the app
 */

import { Platform } from 'react-native';

export const Spacing = {
  '2xs': 2,    // Inline icon-to-text gap (rare)
  xs: 4,       // Tight internal padding, tag padding
  sm: 8,       // Space between related elements, icon margins
  md: 12,      // Internal card padding (compact), list item gaps
  base: 16,    // Default padding, margins between sibling components
  lg: 24,      // Section internal padding, card content padding
  xl: 32,      // Gap between major sections on a screen
  '2xl': 48,   // Screen top/bottom safe zones, major section breaks
  '3xl': 64,   // Hero spacing, onboarding visual breathing room
} as const;

// Common layout values
export const Layout = {
  // Screen padding (16px horizontal per UI standards)
  screenPaddingHorizontal: Spacing.base,
  screenPaddingVertical: Spacing.lg,

  // Card padding (24px internal, 16px between cards per UI standards)
  cardPadding: Spacing.lg,
  cardMargin: Spacing.base,

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    pill: 9999,   // Pill-shaped filter tabs (full-circle intent)
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
    sm: 48,   // Small buttons (tertiary, inline actions) — 48px min per WCAG
    md: 48,   // Default buttons (primary, secondary)
    lg: 56,   // Large CTAs
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
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
    md: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
    lg: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
      default: {},
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

  // Community-specific layout values
  community: {
    postCardRadius: 12,
    buttonRadius: 20,
    postAuthorAvatarSize: 40,
    commentAvatarSize: 32,
    postContentPadding: 16,
    actionButtonHeight: 48,
  },
} as const;
