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

import * as fs from 'fs';
import * as path from 'path';

import { Colors } from '../colors';
import { Typography } from '../typography';
import { BlurTokens, ColorTokens, TypographyTokens } from '../designTokens';

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
  ['tabBarTranslucent', 'Colors.tabBarTranslucent', Colors.tabBarTranslucent],
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

describe('Muted Sage Gray has one declaration and three references', () => {
  /**
   * THE COLOUR R1b-i HAD TO MOVE FOUR TIMES BY HAND. It failed AA at `#6F7F77`
   * and was declared four separate times - `mutedSageGray`, `text.secondary`
   * and `textSecondary` in `colors.ts`, and `ColorTokens.textSecondary` in
   * `designTokens.ts`. R1b-i moved all four literals; standards 4.1 warned that
   * until they became real references, "a change to one of the four is a change
   * to one quarter of the colour". R1d closed all three forks: the
   * `designTokens` one by aliasing, the two `colors.ts` ones by lifting the
   * value to a module const the three keys read.
   *
   * This suite is the thing that keeps it closed. A future contrast fix edits
   * one line; if someone re-forks any of the four, these fail.
   */
  const MUTED_SAGE_GRAY = '#56655D';

  it.each([
    ['Colors.mutedSageGray', Colors.mutedSageGray],
    ['Colors.textSecondary', Colors.textSecondary],
    ['Colors.text.secondary', Colors.text.secondary],
    ['ColorTokens.textSecondary', ColorTokens.textSecondary],
  ])('%s is the one value', (_label, value) => {
    expect(value).toBe(MUTED_SAGE_GRAY);
  });

  it('all four keys agree with each other, not merely with a literal', () => {
    // Asserting each against a literal would still pass if the literal here and
    // the palette drifted together. This pins them to ONE ANOTHER.
    const all = [
      Colors.mutedSageGray,
      Colors.textSecondary,
      Colors.text.secondary,
      ColorTokens.textSecondary,
    ];
    expect(new Set(all).size).toBe(1);
  });

  it('`colors.ts` holds the value exactly once as a literal', () => {
    // The mechanism, not just the outcome: three keys reading one const is what
    // makes a future value change a one-line edit. If someone inlines a literal
    // back into any of the three keys, the count goes to 2 and this fails.
    const src = fs.readFileSync(path.join(__dirname, '..', 'colors.ts'), 'utf-8');
    const literals = src.match(/#56655D/gi) ?? [];
    expect(literals).toHaveLength(1);
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

describe('BlurTokens declares, and declares only what it must (R2)', () => {
  /**
   * BlurTokens has no aliased key, so it gets a coverage assertion of the
   * opposite shape: every key must be on the declared list. The contract is the
   * same one R1d wrote for the other two objects - a key arriving without an
   * entry in this file is a red suite, not a silent second value.
   *
   * THESE CANNOT BE ALIASES AND THE REASON IS NOT STYLE. `tint` is one of
   * BlurView's own enum strings and `intensity` is its 0-100 scale. Neither is
   * a colour, a size or a spacing value, so no canonical Vara scale has a key
   * either one could point at.
   */
  const DECLARED = ['tabBarIntensity', 'tabBarTint'] as const;

  it('covers every key', () => {
    expect(Object.keys(BlurTokens).sort()).toEqual([...DECLARED].sort());
  });

  it('tabBarIntensity is on the BlurView 0-100 scale', () => {
    expect(typeof BlurTokens.tabBarIntensity).toBe('number');
    expect(BlurTokens.tabBarIntensity).toBeGreaterThanOrEqual(0);
    expect(BlurTokens.tabBarIntensity).toBeLessThanOrEqual(100);
  });

  it('tabBarTint is one of the BlurView tint strings', () => {
    expect(['light', 'dark', 'default']).toContain(BlurTokens.tabBarTint);
  });
});

describe('the floating bar translucent fill (R2)', () => {
  /**
   * A DECLARATION IN `colors.ts`, ALIASED INTO `designTokens.ts`. The alias
   * equality is asserted with the rest of COLOR_ALIASES above; what is pinned
   * here is the thing that equality cannot see - that the value is Mist White's
   * own RGB, so the bar fades against the page ground with no hue shift.
   */
  it('is the Mist White RGB at 0.55', () => {
    expect(Colors.tabBarTranslucent).toBe('rgba(250,250,246,0.55)');
  });

  it('shares its RGB with mistWhite and mistWhiteTransparent, differing only in alpha', () => {
    // #FAFAF6 is 250,250,246. If someone later "corrects" this to white or to a
    // sage, the bar picks up a hue shift against every Mist White ground in the
    // app and nothing else in the suite would notice.
    const rgb = (v: string) => v.replace(/^rgba?\(/, '').split(',').slice(0, 3).map((n) => n.trim()).join(',');
    expect(rgb(Colors.tabBarTranslucent)).toBe('250,250,246');
    expect(rgb(Colors.mistWhiteTransparent)).toBe('250,250,246');
    expect(Colors.mistWhite.toUpperCase()).toBe('#FAFAF6');
  });

  it('`colors.ts` holds it exactly once as a literal', () => {
    // Same mechanism as Muted Sage Gray above: one declaration, referenced.
    const src = fs.readFileSync(path.join(__dirname, '..', 'colors.ts'), 'utf-8');
    const literals = src.match(/rgba\(250,250,246,0\.55\)/g) ?? [];
    expect(literals).toHaveLength(1);
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
