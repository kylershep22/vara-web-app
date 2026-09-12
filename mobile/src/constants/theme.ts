/**
 * Vara App Theme
 * Complete theme configuration for React Native Paper
 */

import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { Colors } from './colors';
import { Typography } from './typography';

/**
 * PAPER'S OWN TEXT, AND WHY IT NEEDS ITS OWN CONFIG (UI Standards 5.1, 7).
 *
 * The shared `Text` primitive covers everything the app renders itself. It does
 * NOT cover text React Native Paper renders internally: a `Button`'s label, a
 * `TextInput`'s value, placeholder and helper line. Those come from
 * `theme.fonts`, and before this slice this file overrode twelve MD3 variants'
 * `fontSize` and `fontWeight` and set no `fontFamily` at all, so every one of
 * them would have stayed in the system font while the rest of the app moved to
 * Inter. That is the "two typefaces on screen at once" state R1a exists to
 * avoid, and it would have shown up only on the four screens that use Paper.
 *
 * `default` carries Regular so the variants NOT listed below inherit a real
 * face rather than falling back to the system font. Each listed variant gets
 * the face its own weight maps to, using the same table the primitive uses.
 *
 * Paper's reach is small and fully enumerable: `components/Button.tsx`
 * (LoginScreen, HabitDetailScreen, HabitsScreen, NotificationOptInScreen),
 * `components/Input.tsx` (LoginScreen, HabitDetailScreen),
 * `components/Card.tsx` (HomeScreen, which is registered nowhere) and
 * `LoginScreen`'s `TextInput.Icon`.
 */
const varaFonts = configureFonts({
  config: { fontFamily: Typography.fontFamily.regular },
});

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.evergreenTeal,
    primaryContainer: Colors.silverSage,
    secondary: Colors.sunriseAmber,
    secondaryContainer: Colors.goldenApricot,
    tertiary: Colors.oliveSage,
    tertiaryContainer: Colors.dewSage,
    surface: Colors.surface,
    surfaceVariant: Colors.mistWhite,
    background: Colors.background.default,
    error: Colors.error,
    // Soft coral tint for error container (brand-aligned)
    errorContainer: Colors.priority.high,
    onPrimary: Colors.textOnPrimary,
    onPrimaryContainer: Colors.textPrimary,
    onSecondary: Colors.textOnPrimary,
    onSecondaryContainer: Colors.textPrimary,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    onError: Colors.textOnPrimary,
    onBackground: Colors.textPrimary,
    outline: Colors.border,
    outlineVariant: Colors.borderLight,
    shadow: '#000000',
    scrim: Colors.overlay,
    inverseSurface: Colors.softCharcoal,
    inverseOnSurface: Colors.mistWhite,
    inversePrimary: Colors.silverSage,
    surfaceDisabled: Colors.borderLight,
    onSurfaceDisabled: Colors.textDisabled,
    backdrop: Colors.overlayLight,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    ...varaFonts,
    // Display: 32px (3xl) - rare, hero only
    displayLarge: {
      ...MD3LightTheme.fonts.displayLarge,
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.semibold,
    },
    displayMedium: {
      ...MD3LightTheme.fonts.displayMedium,
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.regular,
      fontFamily: Typography.fontFamily.regular,
    },
    displaySmall: {
      ...MD3LightTheme.fonts.displaySmall,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.regular,
      fontFamily: Typography.fontFamily.regular,
    },
    // H1: 26px (2xl) - screen titles
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.semibold,
    },
    // H2: 22px (xl) - section titles
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.semibold,
    },
    // H3: 18px (lg) - subsections
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.medium,
    },
    // Body: 16px (base)
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.regular,
      fontFamily: Typography.fontFamily.regular,
    },
    // Body Small: 14px (sm)
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.regular,
      fontFamily: Typography.fontFamily.regular,
    },
    // Caption: 12px (xs)
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.regular,
      fontFamily: Typography.fontFamily.regular,
    },
    // Button: 16px (base), Medium
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.medium,
    },
  },
};

// Dark theme (for future dark mode support)
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.silverSage,
    primaryContainer: Colors.evergreenTeal,
    secondary: Colors.goldenApricot,
    secondaryContainer: Colors.sunriseAmber,
    tertiary: Colors.dewSage,
    tertiaryContainer: Colors.oliveSage,
    background: Colors.softCharcoal,
    surface: '#2C2C2C',
  },
  // THE SAME fonts OBJECT AS lightTheme (R1a ruling 6). Dark mode is not
  // supported at v1 (4.2) and this theme is unreachable, but a theme that
  // carries the colours and not the faces is a theme that ships in the wrong
  // typeface the day someone mounts it.
  fonts: {
    ...MD3DarkTheme.fonts,
    ...varaFonts,
  },
};

// Export the default theme
export const theme = lightTheme;
