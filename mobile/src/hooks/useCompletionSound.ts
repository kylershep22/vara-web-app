/**
 * useCompletionSound Hook
 * Loads and plays a short completion alert sound when timers/sessions finish.
 * Follows the useAmbientSound pattern with expo-av Audio.Sound.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { logger } from '../utils/logger';
import { useNotificationPreferences } from './useNotificationPreferences';

type CompletionSoundKey = 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';

// Map sound keys to asset requires
// These must be static require() calls for Metro bundler
const SOUND_ASSETS: Record<CompletionSoundKey, any> = {
  'singing-bowl': null, // require('../../../assets/sounds/completion/singing-bowl.mp3'),
  'soft-chime': null,   // require('../../../assets/sounds/completion/soft-chime.mp3'),
  'nature-bell': null,  // require('../../../assets/sounds/completion/nature-bell.mp3'),
  'stream': null,       // require('../../../assets/sounds/completion/stream.mp3'),
};

// Set to true once actual audio files are added to assets
const SOUNDS_AVAILABLE = false;

const PLAYBACK_VOLUME = 0.6;

interface UseCompletionSoundReturn {
  playCompletionSound: () => void;
  isReady: boolean;
}

export function useCompletionSound(): UseCompletionSoundReturn {
  const { preferences } = useNotificationPreferences();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isReady, setIsReady] = useState(false);

  const selectedSound: CompletionSoundKey =
    preferences?.completionSound?.sound ?? 'singing-bowl';
  const enabled = preferences?.completionSound?.enabled ?? true;

  // Load sound on mount
  useEffect(() => {
    if (!enabled || !SOUNDS_AVAILABLE) {
      setIsReady(false);
      return;
    }

    const asset = SOUND_ASSETS[selectedSound];
    if (!asset) {
      logger.warn(`[useCompletionSound] No asset for sound: ${selectedSound}`);
      setIsReady(false);
      return;
    }

    let mounted = true;

    const loadSound = async () => {
      try {
        // staysActiveInBackground matches the global App.tsx setting
        // (true) per sub-step 2.7 round 2 — Observation 7. Previously
        // false (intentional: completion sounds are short, don't
        // need background), but setAudioModeAsync is GLOBAL state;
        // setting it false here would clobber the global config and
        // cause subsequent NSDR audio to stop on screen lock.
        // Completion sounds being staysActiveInBackground=true is
        // harmless — the sounds are short and the user is
        // foregrounded when they fire.
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(asset, {
          volume: PLAYBACK_VOLUME,
          shouldPlay: false,
        });

        if (mounted) {
          soundRef.current = sound;
          setIsReady(true);
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        logger.warn('[useCompletionSound] Failed to load sound:', error);
        if (mounted) setIsReady(false);
      }
    };

    loadSound();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsReady(false);
    };
  }, [selectedSound, enabled]);

  const playCompletionSound = useCallback(() => {
    if (!enabled || !isReady || !soundRef.current) return;

    // Fire-and-forget: play then reset position for next play
    (async () => {
      try {
        await soundRef.current?.setPositionAsync(0);
        await soundRef.current?.playAsync();
      } catch (error) {
        logger.warn('[useCompletionSound] Failed to play sound:', error);
      }
    })();
  }, [enabled, isReady]);

  return { playCompletionSound, isReady };
}
