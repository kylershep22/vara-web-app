/**
 * Vara Color Palette
 * Extracted from web app design system
 */

export const Colors = {
  // Primary Colors
  evergreenTeal: '#1B5E57',
  silverSage: '#B8CDBA',

  // Secondary Colors
  sunriseAmber: '#F4C542',
  goldenApricot: '#F5B971',
  warmClay: '#E4BFA1',

  // Neutral Colors
  mistWhite: '#FAFAF6',
  softCharcoal: '#3E3E3E',

  // Accent Colors
  dewSage: '#D5E3D1',
  oliveSage: '#9AAE8C',

  // Functional Colors
  background: '#FAFAF6',
  surface: '#FFFFFF',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',

  // Text Colors
  textPrimary: '#3E3E3E',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorKey = keyof typeof Colors;
