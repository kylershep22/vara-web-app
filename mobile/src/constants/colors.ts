/**
 * Vara Color Palette
 * Canonical color definitions for the Vara mobile app
 */

/**
 * Muted Sage Gray, declared once.
 *
 * WHY IT IS A MODULE CONST AND NOT JUST A KEY (R1d, 2026-09-14). This value
 * had FOUR independent declarations: `mutedSageGray`, `text.secondary` and
 * `textSecondary` here, and `ColorTokens.textSecondary` in `designTokens.ts`.
 * R1b-i moved all four by hand to keep them at one value, and warned in
 * standards 4.1 that until they became real references "a change to one of the
 * four is a change to one quarter of the colour". R1d made `ColorTokens`
 * an alias; this const closes the remaining three.
 *
 * An object literal cannot reference itself, so `Colors.textSecondary` cannot
 * be written as `Colors.mutedSageGray` from inside `Colors`. Lifting the value
 * one level up is what makes all three keys read the same declaration, which
 * is the thing that was actually being asked for.
 *
 * `designTokenAliases.test.ts` asserts all four keys against this value.
 */
const MUTED_SAGE_GRAY = '#56655D';

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
  // Fully-transparent form of mistWhite, for gradient scrims that must fade a
  // raster illustration into the mist page background with no color shift at the
  // seam. Same RGB as mistWhite so the fade is purely in alpha.
  mistWhiteTransparent: 'rgba(250,250,246,0)',
  softCharcoal: '#3E3E3E',
  white: '#FFFFFF',
  shadowColor: '#000000', // Only for shadows, never for text

  // Muted Sage Gray for secondary text/icons. The declaration is
  // MUTED_SAGE_GRAY above; these three keys are references to it.
  mutedSageGray: MUTED_SAGE_GRAY,

  // Derived Alpha Colors
  tealLight: 'rgba(27,94,87,0.08)',       // Selected state tints, active badge bg
  tealMedium: 'rgba(27,94,87,0.15)',      // Active badge borders
  dewSageLight: 'rgba(213,227,209,0.5)',  // Icon containers, pill inactive bg, tag bg
  divider: 'rgba(184,205,186,0.4)',       // Dividers, borders

  // THE FLOATING TAB BAR'S WARM TRANSLUCENCY (R2). UI Standards 4.1 and 12.2.
  //
  // Mist White at 0.35, layered OVER the iOS blur rather than instead of it.
  // The blur alone is neutral; this is what makes the bar warm, and it is what
  // keeps a 12pt label legible once R3 puts environmental artwork of unknown
  // luminance underneath it.
  //
  // WALK-TUNED FROM 0.55 TO 0.35 (A0b, 2026-09-14, iPhone 14 Plus). At 0.55 the
  // fill was doing the work the blur is for: Mist White at 0.55 over a Mist
  // White ground is very nearly the ground, and near enough to the cards that
  // the capsule dissolved into the page while scrolling. The blur was visibly
  // working - content was legibly blurred at the bar's edge - and the fill was
  // flattening it back out. Lowering the alpha lets the blur show; the shape is
  // then carried by the hairline the bar gained in the same pass, because a
  // lower alpha needs an edge more than a higher one does.
  //
  // A DECLARATION, NOT AN ALIAS, and the reason is that there is nothing to
  // alias: this file carries Mist White at full alpha and at zero
  // (`mistWhiteTransparent`) and at no value between. Same RGB as `mistWhite`,
  // so the translucency is purely in alpha and there is no hue shift against
  // the ground it sits on. Translucency belongs to this bar and nowhere else
  // (12.2): content surfaces stay opaque.
  //
  // PREPARED AND DELIBERATELY NOT APPLIED (Kyle, 2026-09-14). If the capsule
  // still reads flat after the `floating` shadow, the NEXT lever is this token
  // moving from Mist White to WHITE at about 0.5 - `rgba(255,255,255,0.5)` - so
  // the bar is BRIGHTER than the Mist White page rather than equal to it.
  // It is held back on purpose: the shadow and this would land together and
  // nobody would know which one did the work. One lever per walk.
  tabBarTranslucent: 'rgba(250,250,246,0.35)',

  // Accent Colors
  dewSage: '#D5E3D1',
  softCoral: '#D97A6E',

  // Wired brain-state identity color (terracotta). Warm, and deliberately
  // distinct from softCoral (#D97A6E) so the "Wired" state never reads as an
  // error/red signal. softCoral stays reserved for genuine error states.
  wiredTerracotta: '#C7794E',

  // Functional Colors
  background: {
    default: '#FAFAF6',
    surface: '#FFFFFF',
  },
  surface: '#FFFFFF',
  error: '#D97A6E',            // Soft Coral - brand compliant (never use red)
  success: '#1B5E57',          // Use primary teal for success states
  freshMoss: '#4A9B7E',        // Brighter green for "alive" state, distinct from evergreenTeal
  warning: '#F5B971',          // Golden Apricot for warnings
  info: '#1B5E57',             // Use primary for info states

  // Text Colors
  text: {
    primary: '#3E3E3E',
    secondary: MUTED_SAGE_GRAY,
    disabled: 'rgba(184,205,186,0.5)', // Silver Sage at 50% opacity
    onPrimary: '#FFFFFF',
  },
  textPrimary: '#3E3E3E',
  textSecondary: MUTED_SAGE_GRAY,
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

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Legacy aliases (mapped to permitted palette, will be removed)
  mintCream: '#D5E3D1',       // → dewSage
  oliveSage: '#B8CDBA',       // → silverSage
  lavenderMist: '#D5E3D1',    // → dewSage
  warmClay: '#D97A6E',        // → softCoral
} as const;

export type ColorKey = keyof typeof Colors;
