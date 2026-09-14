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
 */

import { renderHook } from '@testing-library/react-native';

import { useTabBarInset } from '../useTabBarInset';
import { Layout } from '../../constants';

let mockBarHeight = 60;
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => mockBarHeight,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

const setDevice = (bottomInset: number, barHeight = 60) => {
  mockBarHeight = barHeight;
  mockInsets = { top: 0, bottom: bottomInset, left: 0, right: 0 };
};

describe('useTabBarInset', () => {
  it('iPhone 14 Plus / 16 Pro Max: 34pt home-indicator inset gives 110', () => {
    // 60 bar + 34 inset + 16 gap. The bar reports 60; the footprint is 94.
    setDevice(34);
    const { result } = renderHook(() => useTabBarInset());
    expect(result.current).toBe(110);
  });

  it('iPhone SE 3rd gen: 0pt inset falls back to the 12pt floor, giving 88', () => {
    // 60 bar + 12 floor + 16 gap. Without the floor this would be 76 and the
    // capsule would sit 0pt off the screen edge with content 12pt too close.
    setDevice(0);
    const { result } = renderHook(() => useTabBarInset());
    expect(result.current).toBe(88);
  });

  it('is strictly greater than the raw bar height on both devices', () => {
    // The defect, stated as the assertion. If someone "simplifies" this hook
    // back to `useBottomTabBarHeight()`, both of these go equal and fail.
    setDevice(34);
    const { result: large } = renderHook(() => useTabBarInset());
    expect(large.current).toBeGreaterThan(60);

    setDevice(0);
    const { result: small } = renderHook(() => useTabBarInset());
    expect(small.current).toBeGreaterThan(60);
  });

  it('clears 6.2 fixed 48 on both devices, which is what 12.2 retires it for', () => {
    // 12.2 retires 6.2's 48 for these routes on the grounds that a floating
    // bar's footprint is not a constant. That argument only holds if the
    // computed inset actually exceeds 48; if it did not, the retirement would
    // have made the sixteen routes WORSE than the rule it replaced.
    setDevice(34);
    expect(renderHook(() => useTabBarInset()).result.current).toBeGreaterThan(48);
    setDevice(0);
    expect(renderHook(() => useTabBarInset()).result.current).toBeGreaterThan(48);
  });

  it('takes the inset when it exceeds the floor, and the floor when it does not', () => {
    // The Math.max branch, both directions. A taller gesture-nav inset (Android
    // edge-to-edge, app.json:46) is the case that exercises the first branch
    // beyond iOS values.
    setDevice(48);
    expect(renderHook(() => useTabBarInset()).result.current).toBe(60 + 48 + 16);

    setDevice(4);
    expect(renderHook(() => useTabBarInset()).result.current).toBe(
      60 + Layout.tabBar.minBottomOffset + 16
    );
  });

  it('follows the measured bar height rather than assuming the token', () => {
    // React Navigation publishes what it measured, not what we asked for. If
    // Dynamic Type or a future label treatment makes the bar taller than
    // Layout.tabBar.height, the inset must track the measurement.
    setDevice(34, 72);
    expect(renderHook(() => useTabBarInset()).result.current).toBe(72 + 34 + 16);
  });

  it('the tokens it reads are the ones 3.3 records', () => {
    // Guards the other direction: the numbers above are only meaningful while
    // they are the shipped token values.
    expect(Layout.tabBar.height).toBe(60);
    expect(Layout.tabBar.minBottomOffset).toBe(12);
    expect(Layout.tabBar.contentGap).toBe(16);
  });
});
