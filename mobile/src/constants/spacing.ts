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
    '2xl': 20,    // Arrival cards on Today, the capacity invitation
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

  // LEGACY AND UNREAD. UI Standards 6.2.
  //
  // 56 was written for an opaque bar that sat in the layout. The navigator has
  // never read it, and since R2 the bar is a floating capsule whose live height
  // is `Layout.tabBar.height` (60) below.
  //
  // IT HAS ZERO CONSUMERS. A grep of `src/` at R2 found this declaration and
  // nothing else - so it is not "kept for its callers", it is simply dead. It
  // is left standing here only because deleting an exported token is a change
  // of a different kind from restyling a bar, and R2 is the restyle. Its
  // removal is booked to TECH_DEBT. Do not reach for it for new work.
  tabBarHeight: 56,

  // THE FLOATING TAB BAR (R2). UI Standards 6.2 and 12.2.
  //
  // GEOMETRY IS WALK-TUNED AND THESE ARE PROPOSALS, not measured values. They
  // were derived from the content box (24pt icon + 2pt gap + a 12pt label at
  // its line height is about 41pt, centred in 60 leaves ~9.5pt either side)
  // and from 6.2's 16pt screen gutter. The binding case is the iPhone SE at
  // 667pt with a 0pt bottom inset, where `minBottomOffset` is the only thing
  // holding the capsule off the screen edge. Walk assertion 18(d) is what
  // settles them; a change here after the walk is expected, not a regression.
  //
  // `height` is what `useBottomTabBarHeight()` reports, because React
  // Navigation measures the bar's own frame. It is NOT the footprint the
  // screens need - see `hooks/useTabBarInset.ts`.
  tabBar: {
    height: 60,
    radius: 30,                        // height / 2: a true capsule
    marginHorizontal: Spacing.base,    // 16, aligned to 6.2's screen gutter
    minBottomOffset: Spacing.md,       // 12, the floor where insets.bottom is 0
    contentGap: Spacing.base,          // 16, between the last item and the bar
  },

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
