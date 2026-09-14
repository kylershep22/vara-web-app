/**
 * useReduceTransparency Hook
 * Respects the system Reduce Transparency accessibility preference.
 *
 * A LINE-FOR-LINE SIBLING OF `useReducedMotion`, deliberately. The two settings
 * are read the same way, change the same way and are cleaned up the same way,
 * so the second one is not an opportunity to invent a second pattern.
 *
 * WHAT IT IS FOR (UI Standards 12.2). The floating tab bar is the only glass in
 * the app. Under Reduce Transparency it must render the DESIGNED opaque
 * fallback - White with a `divider` hairline - rather than a degraded accident.
 * Walk assertion 18(f) is what makes that checkable, and 18(f) has never been
 * run: the promise has stood in the standards since v2.0 with nothing capable
 * of falling back from, because there was no glass until R2.
 *
 * iOS ONLY, AND THAT IS NOT A GAP. `isReduceTransparencyEnabled` resolves
 * `false` on Android and `reduceTransparencyChanged` never fires there. That
 * costs nothing, because 12.2 rules `expo-blur` out on Android entirely and the
 * bar takes the opaque branch there on a `Platform.OS` check that runs first.
 * The consequence worth stating: on Android this hook's `true` path is never
 * exercised, so do not read an Android pass as evidence the fallback works.
 */

import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to check if the user prefers reduced transparency.
 * Returns true if Reduce Transparency is enabled, false otherwise.
 */
export const useReduceTransparency = (): boolean => {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      setReduceTransparency(enabled);
    });

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (enabled) => {
        setReduceTransparency(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
};
