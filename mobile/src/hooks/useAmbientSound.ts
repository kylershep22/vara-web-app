/**
 * useAmbientSound Hook
 * Audio playback with fade in/out for ambient sounds
 *
 * Per Focus Page Spec Section 5.6:
 * - fadeIn: 2000ms linear fade from 0 to 40% volume
 * - fadeOut: 2000ms linear fade from 40% to 0
 * - Audio loops seamlessly
 * - Volume fixed at 40% of system volume
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_PREFERENCE_KEY = '@ambient_sound_selection';
const TARGET_VOLUME = 0.4; // 40% per spec
const FADE_DURATION = 2000; // 2 seconds per spec
const FADE_STEPS = 40; // Number of volume steps during fade
const FADE_INTERVAL = FADE_DURATION / FADE_STEPS; // ~50ms per step

// Sound file availability flag
// Set to true once actual audio files are added to assets/sounds/
const SOUNDS_AVAILABLE = false;

// Sound file mapping
// Uncomment and add actual requires once files are available
const getSoundFile = (id: string): any => {
  if (!SOUNDS_AVAILABLE) return null;

  // Once files are added, uncomment the appropriate line:
  // switch (id) {
  //   case 'soft-rain': return require('../../assets/sounds/soft-rain.mp3');
  //   case 'forest': return require('../../assets/sounds/forest.mp3');
  //   case 'ocean-waves': return require('../../assets/sounds/ocean-waves.mp3');
  //   case 'white-noise': return require('../../assets/sounds/white-noise.mp3');
  //   default: return null;
  // }

  return null;
};

interface UseAmbientSoundReturn {
  /** Currently selected sound ID (null if none) */
  selectedSound: string | null;
  /** Set the selected sound (null to deselect) */
  setSelectedSound: (id: string | null) => void;
  /** Whether sound is currently playing */
  isPlaying: boolean;
  /** Fade in the sound (call when timer starts) */
  fadeIn: () => Promise<void>;
  /** Fade out the sound (call when timer stops) */
  fadeOut: () => Promise<void>;
  /** Stop sound immediately */
  stop: () => Promise<void>;
  /** Whether sound is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether sounds are available */
  soundsAvailable: boolean;
}

export const useAmbientSound = (): UseAmbientSoundReturn => {
  const [selectedSound, setSelectedSoundState] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVolumeRef = useRef(0);
  const isFadingRef = useRef(false);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(SOUND_PREFERENCE_KEY);
        if (saved) {
          setSelectedSoundState(saved);
        }
      } catch (err) {
        console.warn('[AmbientSound] Error loading preference:', err);
      }
    };
    loadPreference();

    // Cleanup on unmount
    return () => {
      cleanupSound();
    };
  }, []);

  // Set up audio mode for background playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('[AmbientSound] Error setting audio mode:', err);
      }
    };
    setupAudio();
  }, []);

  const cleanupSound = useCallback(async () => {
    // Clear any fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // Unload sound
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        // Ignore errors during cleanup
      }
      soundRef.current = null;
    }

    currentVolumeRef.current = 0;
    isFadingRef.current = false;
  }, []);

  const setSelectedSound = useCallback(async (id: string | null) => {
    // Stop and cleanup current sound
    await cleanupSound();

    setSelectedSoundState(id);
    setIsPlaying(false);
    setError(null);

    // Save preference
    try {
      if (id) {
        await AsyncStorage.setItem(SOUND_PREFERENCE_KEY, id);
      } else {
        await AsyncStorage.removeItem(SOUND_PREFERENCE_KEY);
      }
    } catch (err) {
      console.warn('[AmbientSound] Error saving preference:', err);
    }
  }, [cleanupSound]);

  const loadSound = useCallback(async (): Promise<boolean> => {
    if (!selectedSound) return false;

    const soundFile = getSoundFile(selectedSound);
    if (!soundFile) {
      console.log('[AmbientSound] Sound file not available:', selectedSound);
      console.log('[AmbientSound] Add audio files to assets/sounds/ and set SOUNDS_AVAILABLE = true');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: true,
          volume: 0,
          shouldPlay: false,
        }
      );

      soundRef.current = sound;
      currentVolumeRef.current = 0;
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[AmbientSound] Error loading sound:', err);
      setError("Sound couldn't load. Try again when ready.");
      setIsLoading(false);
      return false;
    }
  }, [selectedSound]);

  const fadeIn = useCallback(async () => {
    if (!selectedSound) {
      console.log('[AmbientSound] No sound selected, skipping fadeIn');
      return;
    }

    // Check if sounds are available
    if (!SOUNDS_AVAILABLE) {
      console.log('[AmbientSound] fadeIn called for:', selectedSound);
      console.log('[AmbientSound] Sounds not available - this is a placeholder');
      console.log('[AmbientSound] Would fade in over 2000ms to 40% volume');
      setIsPlaying(true);
      return;
    }

    // Cancel any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    isFadingRef.current = true;

    // Load sound if not loaded
    if (!soundRef.current) {
      const loaded = await loadSound();
      if (!loaded) {
        isFadingRef.current = false;
        return;
      }
    }

    // Start playback
    try {
      await soundRef.current?.playAsync();
      setIsPlaying(true);

      // Fade in volume
      const volumeStep = TARGET_VOLUME / FADE_STEPS;
      let currentStep = 0;

      fadeIntervalRef.current = setInterval(async () => {
        currentStep++;
        const newVolume = Math.min(volumeStep * currentStep, TARGET_VOLUME);
        currentVolumeRef.current = newVolume;

        try {
          await soundRef.current?.setVolumeAsync(newVolume);
        } catch (err) {
          console.warn('[AmbientSound] Error setting volume:', err);
        }

        if (currentStep >= FADE_STEPS) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          isFadingRef.current = false;
        }
      }, FADE_INTERVAL);
    } catch (err) {
      console.error('[AmbientSound] Error starting playback:', err);
      setError("Sound couldn't play. Try again when ready.");
      isFadingRef.current = false;
    }
  }, [selectedSound, loadSound]);

  const fadeOut = useCallback(async () => {
    if (!isPlaying && !isFadingRef.current) {
      return;
    }

    // Check if sounds are available
    if (!SOUNDS_AVAILABLE) {
      console.log('[AmbientSound] fadeOut called');
      console.log('[AmbientSound] Would fade out over 2000ms');
      setIsPlaying(false);
      return;
    }

    // Cancel any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    isFadingRef.current = true;

    if (!soundRef.current) {
      setIsPlaying(false);
      isFadingRef.current = false;
      return;
    }

    // Fade out volume
    const startVolume = currentVolumeRef.current;
    const volumeStep = startVolume / FADE_STEPS;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(async () => {
      currentStep++;
      const newVolume = Math.max(startVolume - (volumeStep * currentStep), 0);
      currentVolumeRef.current = newVolume;

      try {
        await soundRef.current?.setVolumeAsync(newVolume);
      } catch (err) {
        console.warn('[AmbientSound] Error setting volume:', err);
      }

      if (currentStep >= FADE_STEPS) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        isFadingRef.current = false;

        // Stop and cleanup
        try {
          await soundRef.current?.stopAsync();
        } catch (err) {
          // Ignore
        }
        setIsPlaying(false);
      }
    }, FADE_INTERVAL);
  }, [isPlaying]);

  const stop = useCallback(async () => {
    // Cancel any fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    isFadingRef.current = false;

    // Stop sound immediately
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.setVolumeAsync(0);
      } catch (err) {
        // Ignore
      }
    }

    currentVolumeRef.current = 0;
    setIsPlaying(false);
  }, []);

  return {
    selectedSound,
    setSelectedSound,
    isPlaying,
    fadeIn,
    fadeOut,
    stop,
    isLoading,
    error,
    soundsAvailable: SOUNDS_AVAILABLE,
  };
};

export default useAmbientSound;
