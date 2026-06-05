// Phase 2.8.1 — typed shims for the custom `showFAB` screen option.
//
// React Navigation v6 exports NativeStackNavigationOptions and
// BottomTabNavigationOptions as type aliases, not interfaces, so
// `declare module` augmentation cannot merge new fields into them.
// Instead, we use small helpers that accept the navigator's own
// options type intersected with `{ showFAB?: boolean }`, then return
// the original type so `<Stack.Screen options={...}>` accepts the
// result. The runtime object still carries `showFAB` through to the
// descriptor, where FABHost reads it via
// `navigationRef.getCurrentOptions()`.
//
// Default behavior when no <Stack.Screen> declares options.showFAB:
// HIDDEN. Destinations explicitly opt in via options.showFAB = true.
// Guided/single-focus screens stay silent and inherit the safe default.
//
// Rationale: a missing destination declaration produces a missing FAB
// (easy to spot, easy to fix). A missing guided-sequence declaration
// in a default-show pattern produces CTA overlap (the bug class this
// rule eliminates). See PHASE_NOTES.md and feedback memory for context.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/** Allow `showFAB` on a Stack.Screen's `options` prop without losing type-check on the other fields. */
export function stackOpts(
  opts: NativeStackNavigationOptions & { showFAB?: boolean }
): NativeStackNavigationOptions {
  return opts as NativeStackNavigationOptions;
}

/** Allow `showFAB` on a BottomTab.Screen's `options` prop without losing type-check on the other fields. */
export function tabOpts(
  opts: BottomTabNavigationOptions & { showFAB?: boolean }
): BottomTabNavigationOptions {
  return opts as BottomTabNavigationOptions;
}
