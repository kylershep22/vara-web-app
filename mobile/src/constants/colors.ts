/**
 * Vara Color Palette
 * Canonical color definitions for the Vara mobile app
 */

import { ColorTokens } from '../tokens/design-tokens';

export const Colors = {
  // Primary Colors
  evergreenTeal: '#1B5E57',
  silverSage: '#B8CDBA',
  primary: '#1B5E57', // Alias for evergreenTeal

  // Secondary Colors
  sunriseAmber: '#F4C542',
  goldenApricot: '#F5B971',
  secondary: {
    amber: '#F4C542',
    sage: '#B8CDBA',
    apricot: '#F5B971',
  },

  // Neutral Colors
  mistWhite: '#FAFAF6',
  softCharcoal: '#3E3E3E',
  white: '#FFFFFF',
  shadowColor: '#000000', // Only for shadows, never for text

  // Muted Sage Gray for secondary text/icons
  mutedSageGray: '#6F7F77',

  // Derived Alpha Colors
  tealLight: 'rgba(27,94,87,0.08)',       // Selected state tints, active badge bg
  tealMedium: 'rgba(27,94,87,0.15)',      // Active badge borders
  dewSageLight: 'rgba(213,227,209,0.5)',  // Icon containers, pill inactive bg, tag bg
  divider: 'rgba(184,205,186,0.4)',       // Dividers, borders

  // Accent Colors
  dewSage: '#D5E3D1',
  softCoral: '#D97A6E',

  // Functional Colors
  background: {
    default: '#FAFAF6',
    surface: '#FFFFFF',
  },
  surface: '#FFFFFF',
  error: '#D97A6E',            // Soft Coral - brand compliant (never use red)
  success: '#1B5E57',          // Use primary teal for success states
  warning: '#F5B971',          // Golden Apricot for warnings
  info: '#1B5E57',             // Use primary for info states

  // Text Colors
  text: {
    primary: '#3E3E3E',
    secondary: '#6F7F77',
    disabled: 'rgba(184,205,186,0.5)', // Silver Sage at 50% opacity
    onPrimary: '#FFFFFF',
  },
  textPrimary: '#3E3E3E',
  textSecondary: '#6F7F77',
  textDisabled: 'rgba(184,205,186,0.5)', // Silver Sage at 50% opacity
  textOnPrimary: '#FFFFFF',

  // Border Colors (Silver Sage at varying opacities)
  border: 'rgba(184,205,186,0.6)',       // Silver Sage at 60%
  borderLight: 'rgba(184,205,186,0.3)',  // Silver Sage at 30%
  borderDark: 'rgba(184,205,186,0.8)',   // Silver Sage at 80%

  // Input Colors
  inputBackground: '#FFFFFF',
  inputBorder: '#B8CDBA',           // Silver Sage
  inputBorderFocus: '#1B5E57',      // Evergreen Teal

  // Shadow Color
  shadow: '#000000',

  // Priority Colors (permitted palette at opacity)
  priority: {
    high: 'rgba(217,122,110,0.15)',    // Soft Coral at 15%
    medium: 'rgba(245,185,113,0.15)',  // Golden Apricot (sunriseAmber) at 15%
    low: 'rgba(213,227,209,1)',        // Dew Sage
  },

  // Brain Health Pillar Colors
  brainPillars: {
    growth: '#1B5E57',      // Evergreen Teal
    energy: '#F4C542',      // Sunrise Amber
    focus: '#B8CDBA',       // Silver Sage
    resilience: '#F5B971',  // Golden Apricot
    connection: '#D5E3D1',  // Dew Sage (replaced Lavender Mist)
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Legacy aliases (mapped to permitted palette, will be removed)
  mintCream: '#D5E3D1',       // → dewSage
  oliveSage: '#B8CDBA',       // → silverSage
  lavenderMist: '#D5E3D1',    // → dewSage
  warmClay: '#D97A6E',        // → softCoral
} as const;

// Canonical source - all new code should import ColorTokens directly
export { ColorTokens };

export type ColorKey = keyof typeof Colors;
