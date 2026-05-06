// AsyncStorage marker for the first-shift footer's dismissal state.
//
// Sub-step 2.7 — the FirstShiftFooter on Today is shown exactly once
// per (device, user) pair, on the first DashboardScreen render after
// the user's `firstShiftAt` is set. This module owns the local
// persistence of "already shown" so the footer doesn't reappear on
// subsequent renders.
//
// Source-of-truth split:
//   - Server (`UserProfile.firstShiftAt` in Firestore) — was a
//     qualifying shift recorded? Drives WHETHER to ever show the
//     footer.
//   - Local (this marker) — has the footer been shown on THIS device
//     for THIS user? Drives WHETHER to render on a given mount.
//
// The split means the footer can render once per (device, user): on
// multi-device users, each device shows the footer once for each
// account. Acceptable v1 trade-off — keeps Firestore clean of pure-
// UI state and avoids a round-trip on every Today mount.
//
// Round 8 (marker scoping fix): the key is now scoped by userId.
// Previously the key was device-global ("@vara/firstShiftFooterShownAt"),
// which silently no-op'd the footer for any second user on the same
// device — covering account switches, household device sharing, app
// reinstalls, and (during development) repeated fresh-test-user
// runs against the same dev build. Round 8 device verification
// reproduced the silenced-footer symptom on a fresh test user
// because an earlier test run had set the global marker. The
// scoping fix changes the key to
// `@vara/firstShiftFooterShownAt:{userId}`, so each account on a
// device gets its own once-per-account display.
//
// Migration: any markers stored under the old global key are
// abandoned (not migrated). On first dashboard mount after upgrade,
// users who already saw the footer will see it ONE more time per
// account if their `firstShiftAt` is set. Acceptable — strictly
// better than the current state where some users may have missed
// the footer entirely due to the leak.
//
// Marker shape:
//   string-encoded ms-since-epoch integer (locked decision per
//   sub-step 2.7 commit-2 review). Any non-null value = already shown.
//   No TTL; the marker is permanent once written. Storing the
//   timestamp (rather than a boolean) gives a debug trace for "I
//   never saw the footer" reports.
//
// Errors are swallowed with a warning — marker tracking is
// opportunistic, never fatal to the dashboard render.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from './logger';

const STORAGE_KEY_PREFIX = '@vara/firstShiftFooterShownAt';

function storageKeyFor(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export async function readMarker(userId: string): Promise<number | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(storageKeyFor(userId));
  } catch (error) {
    logger.warn('firstShiftFooterMarker: readMarker failed', error);
    return null;
  }
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    logger.warn(
      'firstShiftFooterMarker: readMarker found non-numeric value, ignoring'
    );
    return null;
  }
  return parsed;
}

export async function writeMarker(
  userId: string,
  timestampMs: number
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKeyFor(userId), String(timestampMs));
  } catch (error) {
    logger.warn('firstShiftFooterMarker: writeMarker failed', error);
  }
}

// Test-only: exposed for tests that need to assert the canonical key
// shape. Not for production code.
export const _FIRST_SHIFT_FOOTER_MARKER_KEY_PREFIX = STORAGE_KEY_PREFIX;
export function _firstShiftFooterMarkerKeyFor(userId: string): string {
  return storageKeyFor(userId);
}
