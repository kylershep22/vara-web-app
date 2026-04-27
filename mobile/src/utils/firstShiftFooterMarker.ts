// AsyncStorage marker for the first-shift footer's dismissal state.
//
// Sub-step 2.7 — the FirstShiftFooter on Today is shown exactly once
// per device, on the first DashboardScreen render after the user's
// `firstShiftAt` is set. This module owns the local persistence of
// "already shown" so the footer doesn't reappear on subsequent renders.
//
// Source-of-truth split:
//   - Server (`UserProfile.firstShiftAt` in Firestore) — was a
//     qualifying shift recorded? Drives WHETHER to ever show the
//     footer.
//   - Local (this marker) — has the footer been shown on THIS device?
//     Drives WHETHER to render on a given mount.
//
// The split means the footer can render once per device: on multi-
// device users, each device shows the footer once. Acceptable v1
// trade-off — keeps Firestore clean of pure-UI state and avoids a
// round-trip on every Today mount.
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

const STORAGE_KEY = '@vara/firstShiftFooterShownAt';

export async function readMarker(): Promise<number | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
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

export async function writeMarker(timestampMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(timestampMs));
  } catch (error) {
    logger.warn('firstShiftFooterMarker: writeMarker failed', error);
  }
}

// Test-only: exposed for tests that need to assert the canonical key.
// Not for production code.
export const _FIRST_SHIFT_FOOTER_MARKER_KEY = STORAGE_KEY;
