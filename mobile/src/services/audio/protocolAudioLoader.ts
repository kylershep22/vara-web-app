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

import { logger } from '../../utils/logger';
import {
  resolveStorageUrl,
  _clearStorageUrlCacheForTesting,
  _getStorageUrlCacheSizeForTesting,
} from '../storage/resolveStorageUrl';

// Firebase Storage root prefix for all protocol audio. Concatenated with
// the per-step `audioPath` (e.g. `nsdr/nsdr_10min_v1.mp3`).
const STORAGE_ROOT = 'protocolAudio';

const LOAD_ERROR_MESSAGE =
  `Couldn't load protocol audio. Check your connection and try again.`;

// Resolve and cache the Firebase Storage download URL for an audio path.
// Delegates to the shared resolver so audio and video share one fetch-and-
// cache implementation; this function only owns the `protocolAudio/` prefix.
async function resolveUrl(audioPath: string): Promise<string> {
  return resolveStorageUrl(`${STORAGE_ROOT}/${audioPath}`, LOAD_ERROR_MESSAGE);
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
    throw new Error(LOAD_ERROR_MESSAGE);
  }
}

// Test-only: clear the URL cache. Used by the dev test screen and unit
// tests to force a re-resolve. Production code should not call this.
// Now clears the shared cache, so it also drops any video URLs.
export function _clearProtocolAudioCacheForTesting(): void {
  _clearStorageUrlCacheForTesting();
}

// Test-only: inspect cache state. Used by unit tests.
export function _getProtocolAudioCacheSizeForTesting(): number {
  return _getStorageUrlCacheSizeForTesting();
}

// Re-export the playback status type so call sites don't need a
// direct expo-av import.
export type { AVPlaybackStatus };
