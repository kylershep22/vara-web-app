// Shared Firebase Storage download-URL resolver.
//
// Extracted from protocolAudioLoader so audio and video resolve streamable
// URLs through one code path instead of two hand-rolled copies. The cache is
// in-memory and lives for the JS bundle lifetime — deliberately NOT persisted,
// because Firebase download URLs carry a token that rotates when an object is
// re-uploaded. Versioned filenames (e.g. `nsdr_10min_v1.mp3`) are how content
// invalidates a cached entry.
//
// Callers pass a FULL storage path (`protocolAudio/nsdr/x.mp3`,
// `focus-video/clip.mp4`) — this module has no knowledge of any particular
// media family, and no root prefix is baked in.

import { ref, getDownloadURL } from 'firebase/storage';

import { storage } from '../../config/firebase';
import { logger } from '../../utils/logger';

// Keyed by full storage path.
const urlCache = new Map<string, string>();

const DEFAULT_ERROR_MESSAGE =
  "Couldn't load that. Check your connection and try again.";

/**
 * Resolve (and memoise) the download URL for a full Storage path.
 *
 * Throws with `errorMessage` — a user-facing string — when resolution fails,
 * so call sites can surface it directly and render a retry affordance. The
 * underlying SDK error is logged, not shown.
 */
export async function resolveStorageUrl(
  fullPath: string,
  errorMessage: string = DEFAULT_ERROR_MESSAGE
): Promise<string> {
  if (!storage) {
    throw new Error('resolveStorageUrl: Firebase Storage is not initialized');
  }

  const cached = urlCache.get(fullPath);
  if (cached) {
    return cached;
  }

  try {
    const storageRef = ref(storage, fullPath);
    const url = await getDownloadURL(storageRef);
    urlCache.set(fullPath, url);
    return url;
  } catch (error) {
    logger.error(
      `resolveStorageUrl: failed to resolve URL for "${fullPath}"`,
      error
    );
    throw new Error(errorMessage);
  }
}

// Test-only: clear the shared cache. Production code should not call this.
export function _clearStorageUrlCacheForTesting(): void {
  urlCache.clear();
}

// Test-only: inspect cache state.
export function _getStorageUrlCacheSizeForTesting(): number {
  return urlCache.size;
}
