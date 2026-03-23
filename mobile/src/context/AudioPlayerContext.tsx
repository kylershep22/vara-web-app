/**
 * Audio Player Context
 * Global audio player state for persistent playback across screens
 * Handles sleep sounds, breathwork audio, and guided meditations
 *
 * Split into two contexts for performance:
 * - AudioPlaybackContext: frequently-changing values (progress, duration, position)
 * - AudioControlsContext: stable functions and metadata (controls, track info)
 *
 * Components that only need controls (play button, track info) consume
 * AudioControlsContext and do NOT re-render on every progress tick.
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { logger } from '../utils/logger';

// =====================
// Type Definitions
// =====================

export interface AudioTrack {
  title: string;
  uri: string;
}

/** Frequently-changing playback values */
interface AudioPlaybackContextValue {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0-1
  duration: number; // milliseconds
  error: string | null;
}

/** Stable functions and metadata */
interface AudioControlsContextValue {
  currentTrack: AudioTrack | null;
  isLooping: boolean;

  // Sleep timer state
  sleepTimer: number | null;
  sleepTimerEndTime: number | null;

  // Player UI state
  isExpanded: boolean;
  audioBottomInset: number;

  // Playback controls
  playTrack: (title: string, uri: string, loop?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setLooping: (loop: boolean) => Promise<void>;

  // Sleep timer controls
  setSleepTimer: (minutes: number | null) => void;

  // Player UI controls
  setIsExpanded: (expanded: boolean) => void;
}

/** Combined type for backwards compatibility */
export type AudioPlayerContextValue = AudioPlaybackContextValue & AudioControlsContextValue;

// =====================
// Constants
// =====================

const MINI_PLAYER_HEIGHT = 72;
const MINI_PLAYER_BUFFER = 8;

// =====================
// Context Creation
// =====================

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | undefined>(undefined);
const AudioControlsContext = createContext<AudioControlsContextValue | undefined>(undefined);

// =====================
// Provider Component
// =====================

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  // Playback state (changes frequently)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Controls state (changes infrequently)
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isLooping, setIsLoopingState] = useState(false);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerEndTime, setSleepTimerEndTimeState] = useState<number | null>(null);
  const [isExpanded, setIsExpandedState] = useState(false);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wasInterruptedRef = useRef(false);
  const userPausedRef = useRef(false);
  // Ref to track isPlaying for interruption detection without stale closures
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  // Ref to track duration for seek calculations
  const durationRef = useRef(0);
  durationRef.current = duration;

  // Configure audio mode on mount
  useEffect(() => {
    configureAudioMode();
    return () => {
      cleanupSound();
    };
  }, []);

  // Sleep timer countdown effect
  useEffect(() => {
    if (sleepTimerEndTime === null) return;

    const interval = setInterval(() => {
      const remaining = sleepTimerEndTime - Date.now();
      if (remaining <= 0) {
        stopPlayback();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  const configureAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    } catch (err) {
      logger.error('Error configuring audio mode:', err);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        logger.error('Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
        setIsPlaying(false);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setProgress(status.positionMillis / status.durationMillis);
    }

    // Only update isPlaying state when the user explicitly paused.
    // When staysActiveInBackground is true, the OS manages background
    // playback — we should not fight it by forcing state changes here.
    // We track userPausedRef to distinguish intentional pauses from
    // transient OS interruptions (screen off, phone call, etc.).
    if (userPausedRef.current) {
      setIsPlaying(status.isPlaying);
    } else if (status.isPlaying !== isPlayingRef.current) {
      setIsPlaying(status.isPlaying);
    }

    if (status.didJustFinish && !status.isLooping) {
      setIsPlaying(false);
      setProgress(0);
    }
  }, []);

  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (err) {
        logger.error('Error cleaning up sound:', err);
      }
    }
  };

  const resetSleepTimer = () => {
    setSleepTimerState(null);
    setSleepTimerEndTimeState(null);
  };

  const playTrack = useCallback(async (title: string, uri: string, loop: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      userPausedRef.current = false;
      wasInterruptedRef.current = false;

      await cleanupSound();

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, isLooping: loop },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentTrack({ title, uri });
      setIsLoopingState(loop);
      setIsPlaying(true);
    } catch (err) {
      logger.error('Error playing track:', err);
      setError('Failed to play audio. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [onPlaybackStatusUpdate]);

  const pause = useCallback(async () => {
    if (soundRef.current) {
      try {
        userPausedRef.current = true;
        wasInterruptedRef.current = false;
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (err) {
        logger.error('Error pausing:', err);
      }
    }
  }, []);

  const resume = useCallback(async () => {
    if (soundRef.current) {
      try {
        userPausedRef.current = false;
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } catch (err) {
        logger.error('Error resuming:', err);
      }
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await cleanupSound();
      } catch (err) {
        logger.error('Error stopping:', err);
      }
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentTrack(null);
    resetSleepTimer();
    setIsExpandedState(false);
    userPausedRef.current = false;
    wasInterruptedRef.current = false;
  }, []);

  const seek = useCallback(async (position: number) => {
    if (soundRef.current && durationRef.current > 0) {
      try {
        const positionMillis = position * durationRef.current;
        await soundRef.current.setPositionAsync(positionMillis);
        setProgress(position);
      } catch (err) {
        logger.error('Error seeking:', err);
      }
    }
  }, []);

  const setLooping = useCallback(async (loop: boolean) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setIsLoopingAsync(loop);
        setIsLoopingState(loop);
      } catch (err) {
        logger.error('Error setting loop:', err);
      }
    }
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerState(minutes);
    if (minutes === null) {
      setSleepTimerEndTimeState(null);
    } else {
      setSleepTimerEndTimeState(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  const setIsExpanded = useCallback((expanded: boolean) => {
    setIsExpandedState(expanded);
  }, []);

  // Computed: bottom inset for scrollable content
  const miniPlayerVisible = currentTrack !== null && !isExpanded;
  const audioBottomInset = miniPlayerVisible ? MINI_PLAYER_HEIGHT + MINI_PLAYER_BUFFER : 0;

  const playbackValue: AudioPlaybackContextValue = {
    isPlaying,
    isLoading,
    progress,
    duration,
    error,
  };

  const controlsValue: AudioControlsContextValue = {
    currentTrack,
    isLooping,
    sleepTimer,
    sleepTimerEndTime,
    isExpanded,
    audioBottomInset,
    playTrack,
    pause,
    resume,
    stop: stopPlayback,
    seek,
    setLooping,
    setSleepTimer,
    setIsExpanded,
  };

  return (
    <AudioControlsContext.Provider value={controlsValue}>
      <AudioPlaybackContext.Provider value={playbackValue}>
        {children}
      </AudioPlaybackContext.Provider>
    </AudioControlsContext.Provider>
  );
}

// =====================
// Hooks
// =====================

/** Use only stable controls and metadata — does NOT re-render on progress changes */
export function useAudioControls(): AudioControlsContextValue {
  const context = useContext(AudioControlsContext);
  if (context === undefined) {
    throw new Error('useAudioControls must be used within an AudioPlayerProvider');
  }
  return context;
}

/** Use only frequently-changing playback state (progress, duration, isPlaying) */
export function useAudioPlayback(): AudioPlaybackContextValue {
  const context = useContext(AudioPlaybackContext);
  if (context === undefined) {
    throw new Error('useAudioPlayback must be used within an AudioPlayerProvider');
  }
  return context;
}

/** Combined hook for backwards compatibility — re-renders on ALL changes */
export function useAudioPlayer(): AudioPlayerContextValue {
  const controls = useAudioControls();
  const playback = useAudioPlayback();
  return { ...controls, ...playback };
}
