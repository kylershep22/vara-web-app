/**
 * Vara Typography System
 * Based on Vara Mobile UI Standards v1.0
 *
 * Primary typeface: Inter (with system sans-serif as fallback)
 * Inter is clean, modern, highly readable, and neutral
 */

export const Typography = {
  // ===========================================
  // FONT FAMILIES
  // ===========================================
  fontFamily: {
    regular: 'Inter_18pt-Regular',
    medium: 'Inter_18pt-Medium',
    semibold: 'Inter_18pt-SemiBold',
    bold: 'Inter_18pt-Bold',
    system: 'System', // Fallback for components not yet migrated
  },

  // ===========================================
  // FONT SIZES (Per UI Standards)
  // ===========================================
  fontSize: {
    xs: 12,       // Caption / Label
    sm: 14,       // Body Small
    base: 16,     // Body (default)
    lg: 18,       // H3 (subsections)
    xl: 22,       // H2 (section titles)
    '2xl': 26,    // H1 (screen titles)
    '3xl': 32,    // Display (rare, hero only)
    displayLg: 34, // Display large (arrival screens: Today greeting, hub titles)
    timer: 48,    // Breathwork timer display only
  },

  // ===========================================
  // FONT WEIGHTS
  // ===========================================
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // ===========================================
  // LINE HEIGHTS
  // 1.5x for body text, 1.3x for headings
  // ===========================================
  lineHeight: {
    display: 1.1,     // Display and timer sizes
    heading: 1.3,     // Headings
    normal: 1.5,      // Body text
    relaxed: 1.6,     // Comfortable reading
    loose: 1.75,      // Extra breathing room
  },

  // ===========================================
  // LETTER SPACING
  // Default (0) for body, +0.02em for captions, -0.01em for display
  // ===========================================
  letterSpacing: {
    tighter: -0.5,    // Display headings
    tight: -0.25,     // H1, H2
    normal: 0,        // Body text (default)
    wide: 0.5,        // Captions and labels
  },
} as const;

// ===========================================
// TEXT STYLE PRESETS
// Based on Vara Mobile UI Standards v1.0
// ===========================================

// React Native's `lineHeight` is an ABSOLUTE value (density-independent px), NOT
// a CSS-style unitless multiplier. Derive it from the font size so the multiplier
// intent stays visible and the value auto-tracks fontSize if the size changes
// (mirrors the correct pattern in JournalScreen.tsx: `fontSize * multiplier`).
// Assigning the bare multiplier (e.g. 1.5) collapsed the line box to ~1.5px and
// clipped/ghosted text on every consumer — the B-3d clipping bug this fixes.
//
// NOTE: these are computed at the BASE font size and do NOT scale under iOS
// Dynamic Type / allowFontScaling — a pre-existing, app-wide a11y gap tracked as
// a separate follow-up, out of scope for this fix.
const lineHeightFor = (fontSize: number, multiplier: number): number =>
  fontSize * multiplier;

export const TextStyles = {
  // Display Large - 34px / Semi-Bold (600) - arrival screens only
  // Color: Evergreen Teal (#1B5E57)
  displayLg: {
    fontSize: Typography.fontSize.displayLg,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: lineHeightFor(Typography.fontSize.displayLg, Typography.lineHeight.display),
    letterSpacing: Typography.letterSpacing.tighter,
  },

  // Display - 32px / Semi-Bold (600) - rare, hero only
  display: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: lineHeightFor(Typography.fontSize['3xl'], Typography.lineHeight.heading),
    letterSpacing: Typography.letterSpacing.tighter,
  },

  // H1 - 26px / Semi-Bold (600) - screen titles
  // Color: Evergreen Teal (#1B5E57)
  h1: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: lineHeightFor(Typography.fontSize['2xl'], Typography.lineHeight.heading),
    letterSpacing: Typography.letterSpacing.tight,
  },

  // H2 - 22px / Semi-Bold (600) - section titles
  // Color: Evergreen Teal (#1B5E57)
  h2: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: lineHeightFor(Typography.fontSize.xl, Typography.lineHeight.heading),
    letterSpacing: Typography.letterSpacing.tight,
  },

  // H3 - 18px / Medium (500) - subsections
  // Color: Soft Charcoal (#3E3E3E)
  h3: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: lineHeightFor(Typography.fontSize.lg, Typography.lineHeight.heading),
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Body - 16px / Regular (400) - default text
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: lineHeightFor(Typography.fontSize.base, Typography.lineHeight.normal),
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Body Small - 14px / Regular (400)
  bodySmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: lineHeightFor(Typography.fontSize.sm, Typography.lineHeight.normal),
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Caption / Label - 12px / Medium (500)
  caption: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: lineHeightFor(Typography.fontSize.xs, Typography.lineHeight.normal),
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Button Text - 16px / Medium (500)
  // NOTE: Never use ALL CAPS for buttons per UI standards
  button: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: lineHeightFor(Typography.fontSize.base, Typography.lineHeight.normal),
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Tab / Nav Label - 12px / Medium (500)
  nav: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: lineHeightFor(Typography.fontSize.xs, Typography.lineHeight.normal),
    letterSpacing: Typography.letterSpacing.normal,
  },
} as const;
