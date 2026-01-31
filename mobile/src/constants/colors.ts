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

  // Accent Colors
  dewSage: '#D5E3D1',
  oliveSage: '#9AAE8C',
  lavenderMist: '#C7B8EA',

  // Functional Colors
  background: {
    default: '#FAFAF6',
    surface: '#FFFFFF',
  },
  surface: '#FFFFFF',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',

  // Text Colors
  text: {
    primary: '#3E3E3E',
    secondary: '#757575',
    disabled: '#BDBDBD',
    onPrimary: '#FFFFFF',
  },
  textPrimary: '#3E3E3E',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  borderDark: '#D0D0D0',

  // Input Colors
  inputBackground: '#F5F5F5',

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
