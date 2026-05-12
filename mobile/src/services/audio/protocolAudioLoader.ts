// Protocol audio loader for the GuidedSessionPlayer (Phase 1 sub-step 4).
//
// Resolves a Firebase Storage path under `protocolAudio/` to a download
// URL, then loads it into an `Audio.Sound` instance via expo-av. The
// resolved URL is cached in memory for the lifetime of the JS bundle —
// versioned filenames (e.g. `nsdr/nsdr_10min_v1.mp3`) handle cache
// invalidation when audio is re-recorded.
//
// First-play budget: <2s on a warm network. Achieved by pre-fetching the
// audio when the user opens the Protocol Detail screen (via
// `prefetchProtocolAudio`), so the URL is resolved and the bytes are
// warm in the platform HTTP cache by the time the user taps "Start."

import { Audio, AVPlaybackStatus } from 'expo-av';
import { ref, getDownloadURL } from 'firebase/storage';

import { storage } from '../../config/firebase';
import { logger } from '../../utils/logger';

// Firebase Storage root prefix for all protocol audio. Concatenated with
// the per-step `audioPath` (e.g. `nsdr/nsdr_10min_v1.mp3`).
const STORAGE_ROOT = 'protocolAudio';

// In-memory cache of resolved download URLs. Lives for the JS bundle
// lifetime; cleared on hot reload or app restart. We deliberately do not
// persist this — Firebase URLs can expire (signed URLs, token refresh)
// and the resolution call is cheap on the warm path.
const urlCache = new Map<string, string>();

// Resolve and cache the Firebase Storage download URL for an audio path.
// Throws on missing Storage init or on Storage SDK failures.
async function resolveUrl(audioPath: string): Promise<string> {
  if (!storage) {
    throw new Error(
      'protocolAudioLoader: Firebase Storage is not initialized'
    );
  }
  const cached = urlCache.get(audioPath);
  if (cached) {
    return cached;
  }
  const fullPath = `${STORAGE_ROOT}/${audioPath}`;
  try {
    const storageRef = ref(storage, fullPath);
    const url = await getDownloadURL(storageRef);
    urlCache.set(audioPath, url);
    return url;
  } catch (error) {
    logger.error(
      `protocolAudioLoader: failed to resolve URL for "${fullPath}"`,
      error
    );
    throw new Error(
      `Couldn't load protocol audio. Check your connection and try again.`
    );
  }
}

// Pre-fetch an audio file. Call from Protocol Detail screen mount so the
// audio is ready by the time the user taps "Start." Resolves the URL,
// then briefly opens an `Audio.Sound` (which pulls bytes into the
// platform HTTP cache) and immediately unloads. Discards errors silently
// so a pre-fetch failure on a flaky network doesn't break the Detail
// screen — the real `loadProtocolAudio` call will surface the error
// when the user actually starts the protocol.
export async function prefetchProtocolAudio(audioPath: string): Promise<void> {
  let sound: Audio.Sound | null = null;
  try {
    const url = await resolveUrl(audioPath);
    const { sound: created } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false }
    );
    sound = created;
  } catch (error) {
    logger.warn(
      `protocolAudioLoader: prefetch failed for "${audioPath}" (non-fatal)`,
      error
    );
  } finally {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (unloadError) {
        logger.warn(
          'protocolAudioLoader: unload after prefetch failed',
          unloadError
        );
      }
    }
  }
}

// Load an audio file, ready to play. Throws on URL resolution or
// playback-load failures with a user-friendly message — call sites
// should catch and render a retry CTA. The returned Sound is owned by
// the caller; they must call `unloadAsync()` when finished (typically
// in the player's cleanup effect).
export async function loadProtocolAudio(
  audioPath: string
): Promise<Audio.Sound> {
  const url = await resolveUrl(audioPath);
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false }
    );
    return sound;
  } catch (error) {
    logger.error(
      `protocolAudioLoader: failed to load Sound for "${audioPath}"`,
      error
    );
    throw new Error(
      `Couldn't load protocol audio. Check your connection and try again.`
    );
  }
}

// Test-only: clear the URL cache. Used by the dev test screen and unit
// tests to force a re-resolve. Production code should not call this.
export function _clearProtocolAudioCacheForTesting(): void {
  urlCache.clear();
}

// Test-only: inspect cache state. Used by unit tests.
export function _getProtocolAudioCacheSizeForTesting(): number {
  return urlCache.size;
}

// Re-export the playback status type so call sites don't need a
// direct expo-av import.
export type { AVPlaybackStatus };
