/**
 * Vara Design Token System
 * Single source of truth for all design values per Focus Page Spec
 *
 * IMPORTANT: Never hardcode raw hex values, pixel sizes, or shadow strings
 * directly in component styles. Always reference these tokens.
 */

import { Platform } from 'react-native';

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
// SPACING TOKENS
// All spacing uses multiples of 4px
// ===========================================
export const SpacingTokens = {
  xs: 4,                // Tag padding, tight gaps
  sm: 8,                // Related elements, icon margins, chip gaps
  md: 12,               // Compact card padding, list item gaps
  base: 16,             // Default padding/margins, screen horizontal padding
  lg: 24,               // Card content padding, section internal padding
  xl: 32,               // Gap between major sections
  '2xl': 48,            // Screen safe zones, major section breaks
} as const;

// ===========================================
// CORNER RADIUS TOKENS
// ===========================================
export const RadiusTokens = {
  sm: 4,                // Tags, small chips
  md: 8,                // Input fields, secondary elements, activity icon squares
  lg: 12,               // Cards, buttons, segmented control
  xl: 16,               // Bottom sheets, large cards
  full: 9999,           // Circles (play button, timer ring, avatars)
} as const;

// ===========================================
// SHADOW TOKENS
// ===========================================
export const ShadowTokens = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: '#000000',
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
      shadowColor: '#000000',
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
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }),
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

// ===========================================
// FOCUS TIPS
// Rotating tips for BrainHealthTip component
// ===========================================
export const FocusTips = [
  "Working in focused blocks with breaks helps your brain sustain attention more naturally. Even short sessions support long-term clarity.",
  "Your brain cycles between focused and diffuse states. Both are essential for deep work and creative thinking.",
  "Reducing distractions helps your brain direct more resources toward the task at hand. Even small changes can make a difference.",
  "Single-tasking supports deeper processing. When your brain isn't switching, it can build stronger connections.",
  "After sustained focus, your brain benefits from a brief pause. Rest helps consolidate what you've been working on.",
  "Focus often improves when mental load is reduced. Simplifying what your brain has to manage can help attention feel more natural.",
  "Your brain uses more energy during focused work than most other activities. Supporting it with breaks is part of the process, not a sign of weakness.",
  "Naming your task before you begin helps your brain orient toward it. Intention supports follow-through.",
] as const;

// ===========================================
// AMBIENT SOUNDS
// ===========================================
export const AmbientSounds = [
  { id: 'soft-rain', label: 'Soft Rain', emoji: '🌧' },
  { id: 'forest', label: 'Forest', emoji: '🌿' },
  { id: 'ocean-waves', label: 'Ocean Waves', emoji: '🌊' },
  { id: 'white-noise', label: 'White Noise', emoji: '〰' },
] as const;

// ===========================================
// COPY STRINGS
// All user-facing strings for the Focus page
// ===========================================
export const FocusCopy = {
  // Page level
  pageTitle: 'Focus',
  pomodoroSubtitle: 'Support deep work with focused sessions',
  routinesSubtitle: 'Build routines that support your brain',
  tabPomodoro: 'Pomodoro',
  tabRoutines: 'Routines',

  // Pomodoro tab
  taskInputLabel: 'What are you focusing on?',
  taskInputPlaceholder: 'e.g., Writing, deep reading, design work...',
  durationChipsLabel: 'Session length',
  sessionCompleteLine1: 'Session complete',
  sessionCompleteLine2: 'Take a 5-minute break?',
  breakCompleteLine1: "Break's over",
  breakCompleteLine2: 'Ready for another session?',
  breakCtaPrimary: 'Begin another',
  breakCtaTertiary: 'Done for now',
  notificationLabel: 'Silence notifications',
  notificationHelperOff: 'Reduce distractions while focusing',
  notificationHelperOn: 'Notifications paused during sessions',
  ambientPanelLabel: 'Ambient sound',
  tipCardTitle: 'Supporting your focus',
  loading: 'Taking a moment...',

  // Routines tab
  startCta: 'Begin at your own pace',
  reminderLink: 'Set a gentle reminder',
  addActivityLabel: 'Add an activity',
  editButton: 'Edit',
  emptyHeadline: 'A fresh start',
  emptyBody: "Create a routine for this time of day, whenever you're ready.",
  emptyCta: 'Create a routine',

  // Active routine player
  progressLabel: (current: number, total: number) => `Activity ${current} of ${total}`,
  upNextLabel: 'UP NEXT',
  previousLabel: 'Previous',
  restartLabel: 'Restart',
  skipLabel: 'Skip',
  endConfirmationTitle: 'End routine?',
  endConfirmationPrimary: 'End',
  endConfirmationSecondary: 'Keep going',
  completeHeadline: 'Routine complete',
  completeBody: 'Well done. Take a moment before moving on.',
  completeCtaPrimary: 'Done',
  completeCtaSecondary: 'Adjust this routine',

  // Notifications
  morningReminder: 'Your morning routine is ready whenever you are.',
  eveningReminder: 'A quiet moment for your evening routine, if it feels right.',
  bedtimeReminder: 'Your bedtime routine is here when you\'re ready to wind down.',
  reengagement: 'Vara is here whenever you\'re ready.',

  // Errors
  audioLoadError: 'Sound couldn\'t load. Try again when ready.',
  notificationPermissionDenied: 'Notification access wasn\'t granted. You can enable it in Settings whenever you like.',
  genericError: 'Something went wrong on our end. Sorry about that.',
  networkError: 'Something didn\'t connect. Try again when ready.',
} as const;

// Completion messages with variety (within spec voice/tone)
export const CompletionMessages = [
  'Well done. Take a moment before moving on.',
  'Nicely done. Give yourself a moment to transition.',
  'You showed up. That matters.',
  'Another routine complete. Rest easy.',
] as const;

// Summary format helper
export const formatSummary = (minutes: number, activities: number) => ({
  duration: `${minutes} min total`,
  count: `${activities} ${activities === 1 ? 'activity' : 'activities'}`,
});
