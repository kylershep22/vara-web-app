/**
 * Vara Color Palette
 * Extracted from web app design system
 */

export const Colors = {
  // Primary Colors
  evergreenTeal: '#1B5E57',
  silverSage: '#B8CDBA',
  primary: '#1B5E57', // Alias for evergreenTeal

  // Secondary Colors
  sunriseAmber: '#F4C542',
  goldenApricot: '#F5B971',
  warmClay: '#E4BFA1',
  secondary: {
    amber: '#F4C542',
    sage: '#B8CDBA',
    apricot: '#F5B971',
  },

  // Neutral Colors
  mistWhite: '#FAFAF6',
  softCharcoal: '#3E3E3E',
  white: '#FFFFFF',
  black: '#000000',

  // Extended Palette
  mintCream: '#E8F5F2',        // Soft teal-tinted background
  mutedSageGray: '#6F7F77',    // Muted sage gray for secondary text/icons (aligned with textSecondary)

  // Derived Alpha Colors
  tealLight: 'rgba(27,94,87,0.08)',       // Selected state tints, active badge bg
  tealMedium: 'rgba(27,94,87,0.15)',      // Active badge borders
  dewSageLight: 'rgba(213,227,209,0.5)',  // Icon containers, pill inactive bg, tag bg
  divider: 'rgba(184,205,186,0.4)',       // Dividers, borders

  // Accent Colors
  dewSage: '#D5E3D1',
  oliveSage: '#9AAE8C',
  lavenderMist: '#C7B8EA',
  softCoral: '#D97A6E',

  // Functional Colors
  background: {
    default: '#FAFAF6',
    surface: '#FFFFFF',
  },
  surface: '#FFFFFF',
  error: '#D97A6E',            // Soft Coral - brand compliant (never use red #FF0000)
  success: '#1B5E57',          // Use primary teal for success states, not bright green
  warning: '#F5B971',          // Golden Apricot for warnings
  info: '#1B5E57',             // Use primary for info states

  // Focus Page Spec Tokens (aliases for design system compliance)
  focusTokens: {
    primary: '#1B5E57',
    backgroundPrimary: '#FAFAF6',
    backgroundSurface: '#FFFFFF',
    secondary: '#B8CDBA',
    surfaceTinted: '#D5E3D1',
    surfaceTintedLight: 'rgba(213, 227, 209, 0.5)',
    accentWarm: '#F4C542',
    accentApricot: '#F5B971',
    textPrimary: '#3E3E3E',
    textSecondary: '#6F7F77',
    error: '#D97A6E',
    primaryLight: 'rgba(27, 94, 87, 0.08)',
    primaryMedium: 'rgba(27, 94, 87, 0.15)',
    disabled: 'rgba(184, 205, 186, 0.5)',
    secondaryLight: 'rgba(184, 205, 186, 0.25)',
  },

  // Text Colors
  text: {
    primary: '#3E3E3E',
    secondary: '#6F7F77',       // Updated per Focus spec for better brand alignment
    disabled: '#BDBDBD',
    onPrimary: '#FFFFFF',
  },
  textPrimary: '#3E3E3E',
  textSecondary: '#6F7F77',     // Updated per Focus spec
  textDisabled: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  borderDark: '#D0D0D0',

  // Input Colors
  inputBackground: '#FFFFFF',
  inputBorder: '#B8CDBA',           // Silver Sage
  inputBorderFocus: '#1B5E57',      // Evergreen Teal

  // Shadow Color
  shadow: '#000000',

  // Priority Colors (for tasks)
  priority: {
    high: '#FFEBEE',
    medium: '#FFF3E0',
    low: '#E8F5E9',
  },

  // Brain Health Pillar Colors (Accessible naming)
  brainPillars: {
    growth: '#1B5E57',      // Evergreen Teal - learning, adaptation
    energy: '#F4C542',      // Sunrise Amber - vitality, recharge
    focus: '#B8CDBA',       // Silver Sage - attention, clarity
    resilience: '#F5B971',  // Golden Apricot - recovery, strength
    connection: '#C7B8EA',  // Lavender Mist - relationships, belonging
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorKey = keyof typeof Colors;
