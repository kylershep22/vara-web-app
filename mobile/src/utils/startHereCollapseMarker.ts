// AsyncStorage marker for the Start here row's collapse state.
//
// Slice 5c decision 5 (Kyle, 2026-09-09). The row starts expanded and collapses
// once the user has opened the video; this module owns the local persistence of
// "already opened" so the row does not re-expand on the next mount.
//
// COLLAPSE MEANS "AFTER THE USER OPENS IT", not after they watch it through.
// Recorded here as well as at the row so it is never read later as an
// oversight: `VideoPlayerModal` exposes `visible`, `storagePath`, `title` and
// `onClose` and nothing else (VideoPlayerModal.tsx:63-73). There is no
// completion, progress or ended callback, and the component is section
// 3.5-unchanged and wrapped, never edited. So the only playback event a
// container can observe is the one it causes itself: the open. True
// play-completion is a deliberate fence change with its own slice.
//
// Source-of-truth split, the same one FirstShiftFooter uses:
//   - Data (`START_HERE_PATHS`) — is there a video for this surface at all?
//     Drives WHETHER the row can ever render.
//   - Local (this marker) — has this user opened it on THIS device? Drives
//     whether it renders expanded or collapsed.
//
// PER (DEVICE, USER), AND PER SURFACE. Two axes, both load bearing:
//
//   - SCOPED BY userId FROM THE FIRST COMMIT. A device-global key silently
//     no-ops for the second user on a device, which covers account switches,
//     shared devices, reinstalls and every repeated fresh-test-user run during
//     development. That is not a hypothetical: firstShiftFooterMarker.ts shipped
//     with a device-global key and had to be re-scoped in its Round 8, and
//     `hooks/useNotificationOptInCards.ts:27` is still keyed
//     `@vara_notif_optin_dismiss_` with no uid in it. That one is a known
//     separate defect, queued rather than fixed here, so this file does not
//     touch it and does not copy it.
//
//   - SCOPED BY SURFACE. Section 1 has the map's row collapsing after first
//     play; section 8 lists Today's inside the three-card ceiling as a collapsed
//     row already. Whether those are the same moment in a user's life is slice
//     7's question, and one shared key would answer it by accident: opening the
//     video on Practices would silently collapse a row on Today that the user
//     has never seen.
//
// Multi-device users see the expanded row once per device. Same trade
// firstShiftFooterMarker.ts took deliberately: it keeps Firestore clean of pure
// UI state and costs no round trip on a tab mount. `userPrivate` was the
// alternative and needs no rules change to accept a new field
// (firestore.rules:742-746); it stays available if the collapse should ever
// follow the account rather than the handset, which is a product call about what
// the collapse means.
//
// Marker shape: string-encoded ms-since-epoch, matching firstShiftFooterMarker.
// Any non-null value means collapsed. No TTL. The timestamp rather than a
// boolean is what turns an "it keeps re-expanding" report into something
// readable.
//
// Errors are swallowed with a warning. Persistence here is opportunistic and
// must never be fatal to the render: a failed read costs an expanded row, and a
// failed write costs one more expansion.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StartHereSurface } from '../constants/startHere';
import { logger } from './logger';

const STORAGE_KEY_PREFIX = '@vara/startHereOpenedAt';

function storageKeyFor(surface: StartHereSurface, userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${surface}:${userId}`;
}

/** Ms-since-epoch of the first open on this device, or null if never opened. */
export async function readStartHereMarker(
  surface: StartHereSurface,
  userId: string
): Promise<number | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(storageKeyFor(surface, userId));
  } catch (error) {
    logger.warn('startHereCollapseMarker: read failed', error);
    return null;
  }
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    logger.warn(
      'startHereCollapseMarker: read found a non-numeric value, ignoring'
    );
    return null;
  }
  return parsed;
}

export async function writeStartHereMarker(
  surface: StartHereSurface,
  userId: string,
  timestampMs: number
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      storageKeyFor(surface, userId),
      String(timestampMs)
    );
  } catch (error) {
    logger.warn('startHereCollapseMarker: write failed', error);
  }
}

// Test-only: exposed so a test can assert the canonical key shape rather than
// re-deriving it. Not for production code.
export const _START_HERE_MARKER_KEY_PREFIX = STORAGE_KEY_PREFIX;
export function _startHereMarkerKeyFor(
  surface: StartHereSurface,
  userId: string
): string {
  return storageKeyFor(surface, userId);
}
