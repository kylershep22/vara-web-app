/**
 * useReducedMotion Hook
 * Respects system accessibility preferences for reduced motion
 */

import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to check if the user prefers reduced motion
 * Returns true if reduce motion is enabled, false otherwise
 */
export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
