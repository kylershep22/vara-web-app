// Typed screen-option wrappers for the app's navigators.
//
// These were introduced (Phase 2.8.1) to carry a custom `showFAB` option
// through to the descriptor for the global FAB host. The Four-Pillar IA
// retired that mechanism: the AI Guide is now a docked pill mounted per pillar
// hub (components/ai/GuidePill.tsx), and session surfaces hide it by not
// mounting it — so there is no longer a custom option to thread.
//
// The helpers are retained as thin, typed pass-throughs so the existing
// `<Stack.Screen options={stackOpts({ ... })}>` call sites keep a single,
// consistent shape; they can be inlined in a later cleanup.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/** Typed wrapper for a native-stack screen's `options`. */
export function stackOpts(
  opts: NativeStackNavigationOptions
): NativeStackNavigationOptions {
  return opts;
}

/** Typed wrapper for a bottom-tab screen's `options`. */
export function tabOpts(
  opts: BottomTabNavigationOptions
): BottomTabNavigationOptions {
  return opts;
}
