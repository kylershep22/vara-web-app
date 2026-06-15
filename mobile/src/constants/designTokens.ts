/**
 * Vara Design Token System
 * Single source of truth for all design values per Focus Page Spec.
 *
 * Relocated from the former `src/tokens/design-tokens.ts` during the token-system
 * consolidation. Color/typography/size/animation tokens are preserved verbatim
 * (every effective value unchanged). Spacing, radius, and shadow are now aliases
 * of the canonical `Spacing`/`Layout` scales in `./spacing` so there is a single
 * source for those values.
 *
 * IMPORTANT: Never hardcode raw hex values, pixel sizes, or shadow strings
 * directly in component styles. Always reference these tokens.
 */

import { Spacing, Layout } from './spacing';

// ===========================================
// COLOR TOKENS
// ===========================================
export const ColorTokens = {
  // Primary
  primary: '#1B5E57',                    // Primary CTAs, headlines, active states, progress fills
  backgroundPrimary: '#FAFAF6',          // Page backgrounds, screen base
  backgroundSurface: '#FFFFFF',          // Cards, inputs, bottom sheets

  // Secondary
  secondary: '#B8CDBA',                  // Secondary buttons, dividers, inactive toggle tracks, borders
  surfaceTinted: '#D5E3D1',              // Section backgrounds, segmented control track, tag defaults
  surfaceTintedLight: 'rgba(213, 227, 209, 0.5)', // Highlight card backgrounds, tip cards

  // Accents (use sparingly - max 10-15% of screen area)
  accentWarm: '#F4C542',                 // Small icon highlights only - never large surface fills
  accentApricot: '#F5B971',              // Break timer ring, secondary illustration accents

  // Text
  textPrimary: '#3E3E3E',                // Body copy, primary text (never use pure black)
  textSecondary: '#6F7F77',              // Helper text, captions, labels, inactive icons
  textOnPrimary: '#FFFFFF',              // Text on primary color backgrounds

  // Functional
  error: '#D97A6E',                      // Error borders, error text (never use red #FF0000)

  // Derived colors with opacity
  primaryLight: 'rgba(27, 94, 87, 0.08)',    // Teal tint backgrounds for selected states
  primaryMedium: 'rgba(27, 94, 87, 0.15)',   // Activity icon background tints
  disabled: 'rgba(184, 205, 186, 0.5)',      // Disabled elements
  secondaryLight: 'rgba(184, 205, 186, 0.25)', // Timer track, inactive elements
} as const;

// ===========================================
// TYPOGRAPHY TOKENS
// ===========================================
export const TypographyTokens = {
  // Font sizes
  fontH1: 26,
  fontH2: 22,
  fontH3: 18,
  fontBody: 16,
  fontBodySm: 14,
  fontCaption: 12,
  fontButton: 16,
  fontTimerLarge: 52,          // Pomodoro timer display
  fontTimerPlayer: 48,          // Routine player timer display
  fontNav: 12,

  // Font weights
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,

  // Line heights
  lineHeightHeading: 1.3,
  lineHeightBody: 1.5,

  // Letter spacing
  letterSpacingTimer: -0.02,    // For timer text
  letterSpacingCaps: 0.04,      // For uppercase labels like "UP NEXT"
} as const;

// ===========================================
// SPACING TOKENS (alias of the canonical Spacing scale)
// All spacing uses multiples of 4px. `Spacing` is the superset (adds '2xs'/'3xl');
// every key the former SpacingTokens exposed is identical in value.
// ===========================================
export const SpacingTokens = Spacing;

// ===========================================
// CORNER RADIUS TOKENS (alias of the canonical Layout.borderRadius scale)
// `Layout.borderRadius` is the superset (adds 'pill'); shared keys are identical.
// ===========================================
export const RadiusTokens = Layout.borderRadius;

// ===========================================
// SHADOW TOKENS (alias of the canonical Layout.shadow scale)
// Preserves the `none` key the former ShadowTokens exposed; sm/md/lg are identical
// in effect (same rendered shadow color).
// ===========================================
export const ShadowTokens = {
  none: {},
  ...Layout.shadow,
} as const;

// ===========================================
// ANIMATION TOKENS
// All transitions use ease-out curves. Never bounce, spring, elastic, or shake.
// ===========================================
export const AnimationTokens = {
  // Durations (in ms)
  durationFast: 100,          // Button press
  durationQuick: 150,         // Drag settle, card press
  durationNormal: 200,        // Panel expand, toggle slide, activity fade
  durationMedium: 250,        // Segmented control pill slide
  durationSlow: 300,          // Player entry/exit, completion fade
  durationBreathColor: 400,   // Break timer color shift
  durationAudioFade: 2000,    // Ambient sound fade in/out
  durationTimer: 1000,        // Timer ring progress updates

  // Easing curves (for Animated.timing)
  // Note: React Native doesn't have CSS ease-out, use these approximations
  easeOut: { useNativeDriver: true },
  easeIn: { useNativeDriver: true },
  linear: { useNativeDriver: true },
} as const;

// ===========================================
// SIZE TOKENS
// ===========================================
export const SizeTokens = {
  // Touch targets (minimum 48px)
  touchTargetMin: 48,

  // Timer ring sizes
  timerRingPomodoro: 260,
  timerRingPlayer: 240,
  timerRingStrokePomodoro: 5,
  timerRingStrokePlayer: 4,

  // Button sizes
  buttonHeightPrimary: 48,
  buttonHeightSmall: 40,
  buttonPaddingHorizontal: 24,

  // Control buttons
  playButtonSize: 64,
  playButtonSizePlayer: 64,
  controlButtonSize: 44,

  // Icon sizes
  iconXs: 16,
  iconSm: 20,
  iconMd: 24,
  iconLg: 28,
  iconXl: 48,

  // Activity icons
  activityIconSquare: 38,
  activityIconLarge: 56,

  // Input heights
  inputHeight: 44,
  toggleWidth: 48,
  toggleHeight: 28,

  // Duration chip
  durationChipHeight: 40,

  // Up Next card icon
  upNextIconSize: 32,
} as const;

// ===========================================
// BRAND ACTIVITY COLORS
// Only these colors may be used for activity icons
// ===========================================
export const ActivityColors = {
  primary: ColorTokens.primary,           // #1B5E57 - Most activities
  coral: ColorTokens.error,               // #D97A6E - Heart/gratitude related
  apricot: ColorTokens.accentApricot,     // #F5B971 - Energy/coffee related
} as const;
