/**
 * useTabBarInset — the bottom clearance a tab-bar-visible route needs.
 *
 * UI Standards 12.2 and 6.2. Sixteen routes today: the four tab roots plus the
 * twelve `CommunityNavigator` routes.
 *
 * WHY `useBottomTabBarHeight()` IS NOT THE INSET, WHICH IS THE WHOLE REASON
 * THIS FILE EXISTS.
 *
 * 12.2 says a tab-bar-visible route "takes its bottom inset from
 * `useBottomTabBarHeight()`". Read literally that is not enough, and the gap is
 * silent rather than loud.
 *
 * React Navigation reports the bar's OWN MEASURED FRAME, not its footprint.
 * `BottomTabBar` attaches an `onLayout` handler, passes the measured height up
 * through `BottomTabBarHeightCallbackContext`, and `BottomTabView` publishes
 * exactly that number on `BottomTabBarHeightContext`, which is what
 * `useBottomTabBarHeight()` reads. (`getTabBarHeight` only supplies the initial
 * value before first layout, so reasoning from it is reasoning about one
 * frame.) An `onLayout` height excludes margin and excludes the `bottom`
 * offset an absolutely positioned bar sits at.
 *
 * So for the floating capsule the hook returns 60 - the bar's height - while
 * the bar's actual footprint on a device with a home indicator is 60 + 34.
 * Consuming the raw value would leave every one of the sixteen routes short by
 * the offset plus the breathing gap, and the failure mode is a trapped last
 * item on one screen scrolled fully to the bottom. That is R1d's defect shape,
 * which shipped once, was masked by the 14 Plus's 34pt inset, and is still
 * outstanding on the SE where the inset is 0.
 *
 * This hook composes the three parts, so 12.2's rule is satisfied - the inset
 * IS taken from `useBottomTabBarHeight()` - and the gap is closed:
 *
 *     bar height (measured)  60
 *   + bottom offset          max(insets.bottom, minBottomOffset)
 *   + content gap            16
 *
 *   = 110 on a 14 Plus / 16 Pro Max (34pt inset), 88 on an SE (0pt inset)
 *
 * IT MUST STAY IN SYNC WITH THE BAR'S OWN `bottom`. The offset term repeats the
 * expression `FivePillarTabs` uses to position the capsule. Both read
 * `Layout.tabBar.minBottomOffset`, so a change to the floor moves both at once;
 * a change to the SHAPE of the expression must be made in both places.
 *
 * DO NOT USE IT ON A ROUTE WHERE THE BAR IS HIDDEN. `Chat` sets
 * `tabBarStyle: { display: 'none' }`, and `display` does not make
 * `useBottomTabBarHeight()` return 0 - `getTabBarHeight` short-circuits on the
 * numeric `height` and never looks at `display`. A hidden bar therefore still
 * reports 60, and this hook would hand back a phantom inset of the full
 * footprint on a screen with no bar on it. `Chat` uses `insets.bottom`
 * directly and says so at its call site.
 *
 * OUTSIDE A BOTTOM-TAB NAVIGATOR IT RETURNS 6.2's 48, AND THAT IS THE RULE
 * RATHER THAN A FALLBACK. `useBottomTabBarHeight()` THROWS when there is no
 * bottom-tab ancestor, so this hook reads `BottomTabBarHeightContext` itself
 * and handles the undefined case. The reason is not test convenience: 6.2 says
 * "the 48 rule stands for any other fixed bottom control", so a caller with no
 * tab bar above it is asking for exactly 48 and should receive it, not an
 * exception. That the app's screen tests render these screens in isolation -
 * which is the deliberate pattern here, for the reasons pillarRoutes.test.ts
 * sets out - is a consequence of the same fact and not the motivation for it.
 */

import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { Layout, Spacing } from '../constants';

/**
 * Bottom padding, in points, that clears the floating tab bar on a route where
 * it is visible; 6.2's fixed 48 where there is no tab bar above the caller.
 */
export const useTabBarInset = (): number => {
  // BOTH READ AS CONTEXTS RATHER THAN THROUGH THEIR HOOKS, and symmetrically.
  // `useBottomTabBarHeight()` throws without a tab ancestor and
  // `useSafeAreaInsets()` throws without a SafeAreaProvider; reading the
  // contexts keeps this hook total, and keeps both reads unconditional so the
  // hook order never depends on where the caller is mounted.
  const barHeight = useContext(BottomTabBarHeightContext);
  const insets = useContext(SafeAreaInsetsContext);

  // No bottom-tab ancestor: 6.2's rule for any other fixed bottom control.
  // Returned BEFORE any inset arithmetic, because 48 is a fixed figure and
  // must not pick up the device's bottom inset on the way past.
  if (barHeight === undefined) {
    return Spacing['2xl'];
  }

  const bottomOffset = Math.max(
    insets?.bottom ?? 0,
    Layout.tabBar.minBottomOffset
  );

  return barHeight + bottomOffset + Layout.tabBar.contentGap;
};
