/**
 * designTokens.ts carries no second copy of a canonical value.
 *
 * WHY THIS SUITE EXISTS (R1d). `ColorTokens` and `TypographyTokens` were
 * independent literal copies of values in `colors.ts` and `typography.ts`, and
 * four of them had drifted from the canonical without anyone noticing - not by
 * hue, but by SPELLING. `ColorTokens.surfaceTintedLight` read
 * `'rgba(213, 227, 209, 0.5)'` where `Colors.dewSageLight` read
 * `'rgba(213,227,209,0.5)'`: the same colour, two strings, and React Native
 * renders them identically while `===` says they differ. A drift that is
 * invisible on screen is exactly the drift no walk will catch.
 *
 * WHAT `===` PROVES AND WHAT IT DOES NOT. These are string and number
 * primitives, so this is value equality, not reference identity - there is no
 * shared object to point at. Value equality is nonetheless the check that
 * matters here, because re-forking a key means writing a second literal, and a
 * second literal that renders the same is still a different string. That is
 * the whole failure mode.
 *
 * THE THREE KEYS THAT ARE DELIBERATELY NOT ALIASES are asserted separately at
 * the bottom, so that removing one of them from the alias map is a visible
 * decision rather than a quiet omission from this list.
 */

import { Colors } from '../colors';
import { Typography } from '../typography';
import { ColorTokens, TypographyTokens } from '../designTokens';

// Every aliased ColorTokens key, and the canonical declaration it points at.
const COLOR_ALIASES: Array<[keyof typeof ColorTokens, string, string]> = [
  ['primary', 'Colors.evergreenTeal', Colors.evergreenTeal],
  ['backgroundPrimary', 'Colors.mistWhite', Colors.mistWhite],
  ['backgroundSurface', 'Colors.white', Colors.white],
  ['secondary', 'Colors.silverSage', Colors.silverSage],
  ['surfaceTinted', 'Colors.dewSage', Colors.dewSage],
  ['surfaceTintedLight', 'Colors.dewSageLight', Colors.dewSageLight],
  ['accentWarm', 'Colors.sunriseAmber', Colors.sunriseAmber],
  ['accentApricot', 'Colors.goldenApricot', Colors.goldenApricot],
  ['textPrimary', 'Colors.softCharcoal', Colors.softCharcoal],
  ['textSecondary', 'Colors.mutedSageGray', Colors.mutedSageGray],
  ['textOnPrimary', 'Colors.white', Colors.white],
  ['error', 'Colors.softCoral', Colors.softCoral],
  ['primaryLight', 'Colors.tealLight', Colors.tealLight],
  ['disabled', 'Colors.textDisabled', Colors.textDisabled],
];

// Every aliased TypographyTokens key, and the canonical it points at.
const TYPOGRAPHY_ALIASES: Array<[keyof typeof TypographyTokens, string, string | number]> = [
  ['fontH1', "Typography.fontSize['2xl']", Typography.fontSize['2xl']],
  ['fontH2', 'Typography.fontSize.xl', Typography.fontSize.xl],
  ['fontH3', 'Typography.fontSize.lg', Typography.fontSize.lg],
  ['fontBody', 'Typography.fontSize.base', Typography.fontSize.base],
  ['fontBodySm', 'Typography.fontSize.sm', Typography.fontSize.sm],
  ['fontCaption', 'Typography.fontSize.xs', Typography.fontSize.xs],
  ['fontButton', 'Typography.fontSize.base', Typography.fontSize.base],
  ['fontTimerPlayer', 'Typography.fontSize.timer', Typography.fontSize.timer],
  ['fontNav', 'Typography.fontSize.xs', Typography.fontSize.xs],
  ['weightRegular', 'Typography.fontWeight.regular', Typography.fontWeight.regular],
  ['weightMedium', 'Typography.fontWeight.medium', Typography.fontWeight.medium],
  ['weightSemibold', 'Typography.fontWeight.semibold', Typography.fontWeight.semibold],
  ['weightBold', 'Typography.fontWeight.bold', Typography.fontWeight.bold],
  ['lineHeightHeading', 'Typography.lineHeight.heading', Typography.lineHeight.heading],
  ['lineHeightBody', 'Typography.lineHeight.normal', Typography.lineHeight.normal],
];

/** The keys that are declarations on purpose. Named so an omission is visible. */
const NON_ALIASES = ['secondaryLight', 'fontTimerLarge', 'letterSpacingTimer'] as const;

describe('ColorTokens is an alias of the canonical palette', () => {
  it.each(COLOR_ALIASES)('ColorTokens.%s === %s', (key, _label, canonical) => {
    expect(ColorTokens[key]).toBe(canonical);
  });

  it('covers every key except the one declared non-alias', () => {
    const covered = COLOR_ALIASES.map(([k]) => k).sort();
    const declared = Object.keys(ColorTokens)
      .filter((k) => !NON_ALIASES.includes(k as (typeof NON_ALIASES)[number]))
      .sort();
    // A new key added to ColorTokens without an entry here fails, which is what
    // stops the next literal from arriving unnoticed.
    expect(covered).toEqual(declared);
  });
});

describe('TypographyTokens is an alias of the canonical scale', () => {
  it.each(TYPOGRAPHY_ALIASES)('TypographyTokens.%s === %s', (key, _label, canonical) => {
    expect(TypographyTokens[key]).toBe(canonical);
  });

  it('covers every key except the two declared non-aliases', () => {
    const covered = TYPOGRAPHY_ALIASES.map(([k]) => k).sort();
    const declared = Object.keys(TypographyTokens)
      .filter((k) => !NON_ALIASES.includes(k as (typeof NON_ALIASES)[number]))
      .sort();
    expect(covered).toEqual(declared);
  });
});

describe('the three deliberate non-aliases', () => {
  // Each is pinned at its value AND at the reason it cannot be an alias, so a
  // later reader who tries to "finish the job" finds the argument here.

  it('secondaryLight: Silver Sage at 0.25, an alpha the palette does not carry', () => {
    expect(ColorTokens.secondaryLight).toBe('rgba(184, 205, 186, 0.25)');
    const silverSageAlphas = Object.values(Colors).filter(
      (v) => typeof v === 'string' && v.startsWith('rgba(184,205,186,')
    );
    expect(silverSageAlphas).not.toContain('rgba(184,205,186,0.25)');
  });

  it('fontTimerLarge: 52, and the canonical timer size is 48 - both ship', () => {
    expect(TypographyTokens.fontTimerLarge).toBe(52);
    expect(Typography.fontSize.timer).toBe(48);
    expect(TypographyTokens.fontTimerLarge).not.toBe(Typography.fontSize.timer);
  });

  it('letterSpacingTimer: an em ratio, not a point value on the tracking scale', () => {
    expect(TypographyTokens.letterSpacingTimer).toBe(-0.02);
    expect(Object.values(Typography.letterSpacing)).not.toContain(
      TypographyTokens.letterSpacingTimer
    );
    // It is used as a multiplier: -0.02 * 52 is about -1.04pt on the Pomodoro
    // timer, which is real tracking. Assigned directly it would be -0.02pt.
    expect(TypographyTokens.letterSpacingTimer * TypographyTokens.fontTimerLarge).toBeCloseTo(
      -1.04
    );
  });
});

describe('the keys R1d deleted stay deleted', () => {
  // Both had zero consumers and a canonical twin; re-adding either restores the
  // fork this slice closed.
  it('primaryMedium is gone (it was a second spelling of Colors.tealMedium)', () => {
    expect('primaryMedium' in ColorTokens).toBe(false);
  });

  it('letterSpacingCaps is gone (an em ratio with no caller)', () => {
    expect('letterSpacingCaps' in TypographyTokens).toBe(false);
  });
});
