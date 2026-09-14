/**
 * useTabBarInset — the arithmetic 12.2's sentence does not contain.
 *
 * THE DEFECT THIS SUITE EXISTS TO PREVENT. 12.2 says a tab-bar-visible route
 * "takes its bottom inset from `useBottomTabBarHeight()`". Consuming that value
 * raw is wrong for a floating bar: React Navigation reports the bar's own
 * measured frame, which excludes the `bottom` offset the capsule sits at. The
 * result is a route short by the offset plus the gap, and the symptom is a
 * trapped last item on one screen scrolled fully to the bottom - invisible
 * until someone scrolls that far, which is why a machine checks it.
 *
 * BOTH MATRIX DEVICES ARE PINNED BY NUMBER, not by formula. Asserting
 * `height + offset + gap` against an implementation that computes
 * `height + offset + gap` is the vacuous green this board has paid for before:
 * it would pass if every token changed to the wrong value. The two cases below
 * are the 18(d) matrix, and the SE case is the one that matters - its 0pt inset
 * is what R1d's defect hid behind on the 14 Plus.
 *
 * THE REAL CONTEXT IS USED, NOT A MOCKED HOOK. The bar height is supplied by
 * `BottomTabBarHeightContext.Provider`, which is exactly how React Navigation
 * supplies it in the app, and the no-tab-bar case is the absence of that
 * provider rather than a stubbed `undefined`. An earlier draft mocked React's
 * `useContext` wholesale and broke the renderer, which is its own small lesson:
 * a mock that reaches past the thing under test takes the test harness with it.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTabBarInset } from '../useTabBarInset';
import { Layout, Spacing } from '../../constants';

/** Both real contexts, supplied the way the app supplies them. No mocks. */
const wrap = (bottomInset: number, barHeight?: number) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const withInsets = (
      <SafeAreaInsetsContext.Provider
        value={{ top: 0, bottom: bottomInset, left: 0, right: 0 }}
      >
        {children}
      </SafeAreaInsetsContext.Provider>
    );
    return barHeight === undefined ? (
      withInsets
    ) : (
      <BottomTabBarHeightContext.Provider value={barHeight}>
        {withInsets}
      </BottomTabBarHeightContext.Provider>
    );
  };
  return Wrapper;
};

/** Render the hook inside a tab navigator reporting `barHeight`. */
const insetInTabBar = (bottomInset: number, barHeight = 60): number =>
  renderHook(() => useTabBarInset(), { wrapper: wrap(bottomInset, barHeight) })
    .result.current;

/** Render the hook with NO bottom-tab ancestor, as an isolated screen has. */
const insetWithNoTabBar = (bottomInset: number): number =>
  renderHook(() => useTabBarInset(), { wrapper: wrap(bottomInset) }).result
    .current;

describe('useTabBarInset, on a route where the bar is visible', () => {
  it('iPhone 14 Plus / 16 Pro Max: 34pt home-indicator inset gives 110', () => {
    // 60 bar + 34 inset + 16 gap. The bar REPORTS 60; its footprint is 94.
    expect(insetInTabBar(34)).toBe(110);
  });

  it('iPhone SE 3rd gen: 0pt inset falls back to the 12pt floor, giving 88', () => {
    // 60 bar + 12 floor + 16 gap. Without the floor this would be 76 and the
    // capsule would sit flush to the screen edge with content 12pt too close.
    expect(insetInTabBar(0)).toBe(88);
  });

  it('is strictly greater than the raw bar height on both devices', () => {
    // The defect, stated as the assertion. If someone "simplifies" this hook
    // back to the raw context value, both of these go equal and fail.
    expect(insetInTabBar(34)).toBeGreaterThan(60);
    expect(insetInTabBar(0)).toBeGreaterThan(60);
  });

  it('clears 6.2 fixed 48 on both devices, which is what 12.2 retires it for', () => {
    // 12.2 retires 6.2's 48 for these routes on the grounds that a floating
    // bar's footprint is not a constant. That argument only holds if the
    // computed inset actually EXCEEDS 48; if it did not, the retirement would
    // have made the sixteen routes worse than the rule it replaced.
    expect(insetInTabBar(34)).toBeGreaterThan(48);
    expect(insetInTabBar(0)).toBeGreaterThan(48);
  });

  it('takes the inset when it exceeds the floor, and the floor when it does not', () => {
    // The Math.max branch, both directions. A taller gesture-nav inset
    // (Android edge-to-edge, app.json:46) exercises the first branch beyond
    // any iOS value.
    expect(insetInTabBar(48)).toBe(60 + 48 + 16);
    expect(insetInTabBar(4)).toBe(60 + Layout.tabBar.minBottomOffset + 16);
  });

  it('follows the MEASURED bar height rather than assuming the token', () => {
    // React Navigation publishes what it measured, not what we asked for. If
    // Dynamic Type or a future label treatment makes the bar taller than
    // Layout.tabBar.height, the inset has to track the measurement.
    expect(insetInTabBar(34, 72)).toBe(72 + 34 + 16);
  });
});

describe('useTabBarInset, where there is no tab bar above the caller', () => {
  /**
   * NOT A TEST-ONLY ESCAPE HATCH. 6.2: "the 48 rule stands for any other fixed
   * bottom control." A caller with no bottom-tab ancestor is asking for exactly
   * 48 and should receive it. `useBottomTabBarHeight()` would have THROWN,
   * which would turn a documented layout rule into an exception and force every
   * isolated screen test for the sixteen routes to mock this hook.
   */
  it('returns 6.2 fixed 48', () => {
    expect(insetWithNoTabBar(34)).toBe(48);
    expect(insetWithNoTabBar(34)).toBe(Spacing['2xl']);
  });

  it('ignores the safe-area inset entirely', () => {
    // 48 is a fixed rule, not a composed value: it must not pick up the
    // device's bottom inset on the way past.
    expect(insetWithNoTabBar(0)).toBe(48);
    expect(insetWithNoTabBar(34)).toBe(48);
  });
});

describe('the tokens this hook reads', () => {
  it('are the ones 3.3 records', () => {
    // Guards the other direction: the numbers above are only meaningful while
    // they are the shipped token values.
    expect(Layout.tabBar.height).toBe(60);
    expect(Layout.tabBar.minBottomOffset).toBe(12);
    expect(Layout.tabBar.contentGap).toBe(16);
  });
});
