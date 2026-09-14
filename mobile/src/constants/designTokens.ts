/**
 * Vara Design Token System
 * Flat, role-named accessors over the canonical scales, for the Focus and Time
 * surfaces that were written against the Focus Page Spec's token names.
 *
 * EVERY VALUE HERE IS AN ALIAS. Nothing in this file declares a colour, a font
 * size or a spacing value that is not also declared somewhere in `./colors`,
 * `./typography` or `./spacing` - with three deliberate exceptions, which are
 * grouped and reasoned at the bottom of their objects rather than left to look
 * like the rest.
 *
 * WHY THAT SENTENCE IS LOAD-BEARING (R1d). `ColorTokens` and `TypographyTokens`
 * used to be independent literal COPIES of values in `colors.ts` and
 * `typography.ts`, and the header used to describe them as "preserved verbatim"
 * as though that were a guarantee. It was not one: copies drift silently, and
 * these had. `ColorTokens.surfaceTintedLight` was `'rgba(213, 227, 209, 0.5)'`
 * while `Colors.dewSageLight` was `'rgba(213,227,209,0.5)'` - the same colour
 * written as two strings that compare unequal in a style object. Three more
 * keys had drifted the same way. `SpacingTokens`, `RadiusTokens` and
 * `ShadowTokens` were already aliases and were the pattern the rest now follow.
 *
 * A test pins this: `__tests__/designTokenAliases.test.ts` asserts every aliased
 * key equals its canonical, so re-forking one is a red suite rather than a
 * silent second value.
 *
 * IMPORTANT: Never hardcode raw hex values, pixel sizes, or shadow strings
 * directly in component styles. Always reference these tokens.
 */

import { Colors } from './colors';
import { Spacing, Layout } from './spacing';
import { Typography } from './typography';

// ===========================================
// COLOR TOKENS
// ===========================================
export const ColorTokens = {
  // Primary
  primary: Colors.evergreenTeal,         // Primary CTAs, headlines, active states, progress fills
  backgroundPrimary: Colors.mistWhite,   // Page backgrounds, screen base
  backgroundSurface: Colors.white,       // Cards, inputs, bottom sheets

  // Secondary
  secondary: Colors.silverSage,          // Secondary buttons, dividers, inactive toggle tracks, borders
  surfaceTinted: Colors.dewSage,         // Section backgrounds, segmented control track, tag defaults
  surfaceTintedLight: Colors.dewSageLight, // Highlight card backgrounds, tip cards

  // Accents (use sparingly - max 10-15% of screen area)
  accentWarm: Colors.sunriseAmber,       // Small icon highlights only - never large surface fills
  accentApricot: Colors.goldenApricot,   // Break timer ring, secondary illustration accents

  // Text
  textPrimary: Colors.softCharcoal,      // Body copy, primary text (never use pure black)
  textSecondary: Colors.mutedSageGray,   // Helper text, captions, labels, inactive icons
  textOnPrimary: Colors.white,           // Text on primary color backgrounds

  // Functional
  error: Colors.softCoral,               // Error borders, error text (never use red #FF0000)

  // Derived colors with opacity
  primaryLight: Colors.tealLight,        // Teal tint backgrounds for selected states
  disabled: Colors.textDisabled,         // Disabled elements

  // NOT AN ALIAS, AND THE ONLY ONE IN THIS OBJECT.
  // Silver Sage at 0.25. `colors.ts` carries Silver Sage at 0.3, 0.4, 0.5, 0.6
  // and 0.8, but not 0.25, so there is nothing to point at. Promoting it into
  // the palette is a scale addition and belongs to the row that owns scale
  // additions, not to a substitution slice. Until then this is its declaration.
  secondaryLight: 'rgba(184, 205, 186, 0.25)', // Timer track, inactive elements
} as const;

// ===========================================
// TYPOGRAPHY TOKENS
// ===========================================
export const TypographyTokens = {
  // Font sizes
  fontH1: Typography.fontSize['2xl'],
  fontH2: Typography.fontSize.xl,
  fontH3: Typography.fontSize.lg,
  fontBody: Typography.fontSize.base,
  fontBodySm: Typography.fontSize.sm,
  fontCaption: Typography.fontSize.xs,
  fontButton: Typography.fontSize.base,
  fontTimerPlayer: Typography.fontSize.timer,  // Routine player timer display
  fontNav: Typography.fontSize.xs,

  // Font weights
  weightRegular: Typography.fontWeight.regular,
  weightMedium: Typography.fontWeight.medium,
  weightSemibold: Typography.fontWeight.semibold,
  weightBold: Typography.fontWeight.bold,

  // Line heights
  lineHeightHeading: Typography.lineHeight.heading,
  lineHeightBody: Typography.lineHeight.normal,

  // ===========================================
  // NOT ALIASES. TWO KEYS, EACH FOR ITS OWN REASON.
  // ===========================================

  // 52, and `Typography.fontSize` tops out at `timer: 48`. The two shipping
  // timers are not the same size: `ActiveRoutinePlayer` renders 48 via
  // `fontTimerPlayer` above, `PomodoroTab` renders 52 via this key. Aliasing
  // this one to `fontSize.timer` would shrink the Pomodoro timer by 4pt, which
  // a substitution slice does not get to do. UI Standards 5.2 now records that
  // both ship and defers the decision to the Focus surface slice.
  fontTimerLarge: 52,          // Pomodoro timer display

  // An EM RATIO, not a point value, and therefore not comparable to
  // `Typography.letterSpacing` at all - those keys (-0.5, -0.25, 0, 0.5) are
  // React Native `letterSpacing`, which is absolute points. This one is
  // multiplied by the font size at the call site, as `PomodoroTab` and
  // `ActiveRoutinePlayer` both do. Assigning it directly yields -0.02pt, which
  // reads as no tracking rather than as a bug. UI Standards 5.2 names it the
  // one exception and bars a second em-denominated token, so it stays here.
  letterSpacingTimer: -0.02,    // For timer text, multiplied by font size at the call site
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
  inputHeight: 48,   // Matches Layout.inputHeight; UI Standards section 6.2
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
