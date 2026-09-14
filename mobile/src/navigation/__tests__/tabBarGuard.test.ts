/**
 * The floating tab bar's four 12.2 constraints, made machine-checkable.
 *
 * WHY THIS FILE EXISTS. R2's Step 0 grepped the whole suite for anything
 * asserting `tabBarStyle`, height, tint, label or icon and found ONE hit, and
 * it was a comment. R2 changes every pixel of the bar and no machine noticed.
 * That is not reassurance, it is the finding: four clauses of 12.2 lived in
 * prose only, and prose does not fail a build.
 *
 * ASSERTED BY READING SOURCE, not by rendering. This follows the precedent
 * `pillarRoutes.test.ts` set and for its stated reason: rendering AppNavigator
 * pulls auth, subscriptions, RevenueCat and the onboarding tree, and the
 * navigator mounts one branch of the auth state machine at a time, so a
 * render-based check would have to drive it into signed-in-and-onboarded before
 * it could see the tab bar at all. Source is the honest artifact for "does this
 * file contain a badge".
 *
 * WHAT THIS CANNOT DO, said plainly so nobody reads it as more than it is. It
 * proves the SOURCE has the shape 12.2 requires. It proves nothing about what
 * renders: whether the capsule clears the home indicator, whether the blur
 * links, whether the outline glyph is distinguishable from the filled one at a
 * glance. Those are walk assertions 18(c), 18(d), 18(f) and step A10, and this
 * file is not a substitute for any of them.
 *
 * SCOPED TO `FivePillarTabs`. The legacy `BottomTabsNavigator` above it is
 * retired IA, does not mount (FOUR_PILLAR_IA has been on since 2026-07-02) and
 * keeps its pre-R2 literals on purpose. Asserting against it would fail this
 * suite for a navigator nobody can reach, so every check below slices the live
 * navigator out of the file first.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const NAVIGATOR_SOURCE = readFileSync(join(__dirname, '..', 'AppNavigator.tsx'), 'utf8');

/**
 * The body of `FivePillarTabs`, from its declaration to the closing of its JSX.
 * Sliced rather than regex-matched so a failure reads as "the navigator moved"
 * rather than as a silent empty match - a check that greps an empty string
 * passes vacuously, which is the exact failure mode this board has paid for
 * twice.
 */
const liveNavigatorSource = (): string => {
  const start = NAVIGATOR_SOURCE.indexOf('const FivePillarTabs = () => {');
  expect(start).toBeGreaterThan(-1);
  const end = NAVIGATOR_SOURCE.indexOf('</BottomTabs.Navigator>', start);
  expect(end).toBeGreaterThan(start);
  const body = NAVIGATOR_SOURCE.slice(start, end);
  // Non-vacuity: the slice must actually contain the four tabs, or every
  // "absence" assertion below would pass against nothing.
  expect(body).toContain('ROUTES.Home');
  expect(body).toContain('ROUTES.PillarPractices');
  expect(body).toContain('ROUTES.PillarLearn');
  expect(body).toContain('ROUTES.Community');
  return body;
};

/** Source with comments stripped, so a clause NAMING a rule cannot trip it. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('(i) the bar carries no badge, count or dot', () => {
  /**
   * 12.2: "No badges, counts or dots on the bar", from
   * docs/Vara_FourPillar_IA_Spec.md:161 - "the tab bar stays calm: muted
   * inactive, teal active, no badges/counts/dots, no streaks." The bar is
   * chrome; it never carries state the user has to clear. 18(h) says the same
   * thing from the journey side.
   */
  it('sets no tabBarBadge anywhere in the live navigator', () => {
    expect(stripComments(liveNavigatorSource())).not.toMatch(/tabBarBadge/);
  });

  it('sets no tabBarBadgeStyle either', () => {
    expect(stripComments(liveNavigatorSource())).not.toMatch(/tabBarBadgeStyle/);
  });
});

describe('(ii) every tab distinguishes its states by GLYPH, not by hue alone', () => {
  /**
   * 12.2 and 7: active is the FILLED variant, inactive the OUTLINE one. Before
   * R2 no tabBarIcon read `focused` at all, so the only difference between
   * states was #1B5E57 against #56655D - two dark desaturated greens - plus the
   * label. R1b-i's step 11 passed on that and recorded the pass as weaker than
   * before. A tabBarIcon that stops reading `focused` silently returns the bar
   * to hue-only, and nothing else in the suite would see it.
   */
  const iconBlocks = (): string[] =>
    stripComments(liveNavigatorSource()).split('tabBarIcon:').slice(1);

  it('has exactly four tabBarIcon declarations', () => {
    expect(iconBlocks()).toHaveLength(4);
  });

  it.each([0, 1, 2, 3])('tabBarIcon %i destructures focused', (index) => {
    const block = iconBlocks()[index].slice(0, 200);
    expect(block).toMatch(/\{\s*focused\s*,/);
  });

  it.each([0, 1, 2, 3])('tabBarIcon %i branches its glyph on focused', (index) => {
    // Reading `focused` and ignoring it would satisfy the check above.
    const block = iconBlocks()[index].slice(0, 300);
    expect(block).toMatch(/focused\s*\?/);
  });

  it('pairs every filled glyph with the -outline variant of the same name', () => {
    // The pairing, not just the presence of a ternary: `focused ? a : b` where
    // b is not a's outline is a design error a shape check would miss.
    const source = stripComments(liveNavigatorSource());
    const ternaries = [...source.matchAll(/focused \? '([a-z-]+)' : '([a-z-]+)'/g)];
    expect(ternaries).toHaveLength(4);
    for (const [, filled, outline] of ternaries) {
      expect(outline).toBe(filled + '-outline');
    }
  });

  it('no longer names the leaf glyph, which has no outline variant in MCI', () => {
    // The reason the Journey tab moved to sprout. If someone puts leaf back,
    // 12.2's outline rule becomes unsatisfiable for that tab again.
    expect(stripComments(liveNavigatorSource())).not.toMatch(/'leaf'/);
  });
});

describe('(iii) the bar reads its geometry from tokens, not from literals', () => {
  /**
   * 3.3: a value in code with no token row is undocumented drift. The geometry
   * here is walk-tuned - 18(d) on the SE at 667pt is what settles it - and a
   * tuning pass must be one edit in spacing.ts, not a hunt through a 1700-line
   * navigator.
   */
  const tabBarStyleBlock = (): string => {
    const body = stripComments(liveNavigatorSource());
    const start = body.indexOf('tabBarStyle: {');
    expect(start).toBeGreaterThan(-1);
    const glassBranch = body.indexOf('...(useGlass', start);
    expect(glassBranch).toBeGreaterThan(start);
    const block = body.slice(start, glassBranch);
    // Non-vacuity again: a slice that missed would grep an empty string and
    // pass every "no literal" assertion below.
    expect(block).toContain('position:');
    return block;
  };

  it('sets no numeric height literal', () => {
    expect(tabBarStyleBlock()).not.toMatch(/height:\s*\d/);
  });

  it('sets no numeric borderRadius literal', () => {
    expect(tabBarStyleBlock()).not.toMatch(/borderRadius:\s*\d/);
  });

  it('sets no numeric marginHorizontal literal', () => {
    expect(tabBarStyleBlock()).not.toMatch(/marginHorizontal:\s*\d/);
  });

  it('reads height, radius and margin from Layout.tabBar', () => {
    const block = tabBarStyleBlock();
    expect(block).toContain('Layout.tabBar.height');
    expect(block).toContain('Layout.tabBar.radius');
    expect(block).toContain('Layout.tabBar.marginHorizontal');
  });

  it('positions the bar absolutely, which is what moves the inset to the screens', () => {
    // If this ever reverts, BottomTabView starts reserving space for the bar
    // again and all sixteen routes are double-inset rather than trapped - the
    // quieter half of the same defect.
    expect(tabBarStyleBlock()).toMatch(/position:\s*'absolute'/);
  });
});

describe('(iv) tabBarHideOnKeyboard stays unset', () => {
  /**
   * Not a style preference. Its show/hide runs an Animated.timing on a
   * translateY INSIDE @react-navigation/bottom-tabs, where useReducedMotion
   * cannot reach it, and 18(e) covers every animation on a touched surface
   * rather than only the ones a slice wrote. The keyboard-up case exists on
   * three Community routes, which 2.8 marks retained-as-is until R6+, so
   * setting it would buy a Community-only fix at the price of an unreducible
   * animation app-wide.
   */
  it('is absent from the live navigator', () => {
    expect(stripComments(liveNavigatorSource())).not.toMatch(/tabBarHideOnKeyboard/);
  });

  it('the only visibility animation configured is the Reduce Motion cut', () => {
    const source = stripComments(liveNavigatorSource());
    expect(source).toContain('tabBarVisibilityAnimationConfig');
    expect(source).toContain('REDUCED_MOTION_VISIBILITY');
  });

  it('REDUCED_MOTION_VISIBILITY really is zero in both directions', () => {
    // A config that animates at some small duration would pass the shape check
    // above and still fail 18(e).
    const start = NAVIGATOR_SOURCE.indexOf('const REDUCED_MOTION_VISIBILITY');
    expect(start).toBeGreaterThan(-1);
    const block = NAVIGATOR_SOURCE.slice(start, NAVIGATOR_SOURCE.indexOf('} as const;', start));
    const durations = [...block.matchAll(/duration:\s*(\d+)/g)].map(([, d]) => Number(d));
    expect(durations).toEqual([0, 0]);
  });
});

describe('(v) Chat hides the bar from the TAB, not from the stack screen', () => {
  /**
   * THE FAILURE THIS PREVENTS IS A SILENT ONE. `Chat` is registered on
   * `CommunityStack`, a native stack. `tabBarStyle` is a BOTTOM-TAB option, so
   * a native-stack screen does not read it: writing
   * `options={{ tabBarStyle: { display: 'none' } }}` on the Chat registration
   * would look exactly like the rule being applied and would do nothing at all.
   * The tab that owns the nested stack is the only place that can hide it.
   */
  const chatRegistration = (): string => {
    const start = NAVIGATOR_SOURCE.indexOf('name="Chat"');
    expect(start).toBeGreaterThan(-1);
    const block = NAVIGATOR_SOURCE.slice(start, start + 400);
    expect(block).toContain('ChatScreen');
    return block;
  };

  it('the Chat stack registration sets no tabBarStyle, because it could not work', () => {
    expect(stripComments(chatRegistration())).not.toMatch(/tabBarStyle/);
  });

  it('the Community TAB is what hides it, keyed on the focused route', () => {
    const body = stripComments(liveNavigatorSource());
    expect(body).toContain('hidesTabBar(route)');
    expect(body).toMatch(/display:\s*'none'/);
  });

  it('the hide is SPREAD conditionally rather than set to undefined', () => {
    // A key present in a screen's options wins over screenOptions even when its
    // value is undefined, so `tabBarStyle: isChat ? hidden : undefined` would
    // blank the capsule's entire style on every other Community route. Absent
    // when it does not apply is the only safe shape.
    const body = stripComments(liveNavigatorSource());
    expect(body).toMatch(/\.\.\.\(hidesTabBar\(route\)/);
  });

  it('hidesTabBar names Chat and nothing else', () => {
    const start = NAVIGATOR_SOURCE.indexOf('const hidesTabBar =');
    expect(start).toBeGreaterThan(-1);
    const block = NAVIGATOR_SOURCE.slice(start, start + 200);
    const names = [...block.matchAll(/=== '([A-Za-z]+)'/g)].map(([, n]) => n);
    expect(names).toEqual(['Chat']);
  });
});

describe('the legacy navigator is out of scope and stays that way', () => {
  /**
   * Pinned so a later reader does not "finish the job" by restyling a navigator
   * that cannot mount, and so the divergence is a recorded decision rather than
   * an oversight someone tidies up.
   */
  it('BottomTabsNavigator still carries its pre-R2 literals', () => {
    const start = NAVIGATOR_SOURCE.indexOf('const BottomTabsNavigator = () => {');
    expect(start).toBeGreaterThan(-1);
    const dead = NAVIGATOR_SOURCE.slice(
      start,
      NAVIGATOR_SOURCE.indexOf('</BottomTabs.Navigator>', start)
    );
    expect(dead).toContain('height: 62');
    expect(dead).toContain('paddingBottom: 5');
    expect(dead).not.toContain('position:');
  });
});
