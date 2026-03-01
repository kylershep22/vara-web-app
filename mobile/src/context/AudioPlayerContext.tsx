/**
 * Audio Player Context
 * Global audio player state for persistent playback across screens
 * Handles sleep sounds, breathwork audio, and guided meditations
 *
 * Features:
 * - Persistent playback across navigation
 * - Sleep timer with absolute-time countdown (survives backgrounding)
 * - Expanded/mini player state management
 * - Audio interruption handling (phone calls)
 * - Content inset for scrollable screens
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// =====================
// Type Definitions
// =====================

export interface AudioTrack {
  title: string;
  uri: string;
}

interface AudioPlayerContextValue {
  // Playback state
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0-1
  duration: number; // milliseconds
  isLooping: boolean;
  error: string | null;

  // Sleep timer state
  sleepTimer: number | null;        // minutes originally set, null = off
  sleepTimerEndTime: number | null; // Date.now() + ms when timer was set

  // Player UI state
  isExpanded: boolean;

  // Content inset (bottom padding for scrollable screens)
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

// =====================
// Constants
// =====================

const MINI_PLAYER_HEIGHT = 72; // container height + vertical padding
const MINI_PLAYER_BUFFER = 8;  // extra buffer below mini player

// =====================
// Context Creation
// =====================

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

// =====================
// Provider Component
// =====================

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLoopingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sleep timer state
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerEndTime, setSleepTimerEndTimeState] = useState<number | null>(null);

  // Player UI state
  const [isExpanded, setIsExpandedState] = useState(false);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wasInterruptedRef = useRef(false);
  const userPausedRef = useRef(false);

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

  /**
   * Configure audio mode for playback with interruption handling
   */
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
      console.error('Error configuring audio mode:', err);
    }
  };

  /**
   * Update playback status with interruption detection
   */
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
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

    // Interruption detection: if playback stopped unexpectedly (not user-initiated)
    if (!status.isPlaying && isPlaying && !userPausedRef.current) {
      // Audio was interrupted (e.g., phone call)
      wasInterruptedRef.current = true;
    }

    // Auto-resume after interruption
    if (status.isPlaying && wasInterruptedRef.current) {
      wasInterruptedRef.current = false;
    }

    // If we were interrupted and playback is available again, resume
    if (!status.isPlaying && wasInterruptedRef.current && status.isLoaded && !status.isBuffering) {
      // Attempt to resume playback after interruption
      soundRef.current?.playAsync().catch(() => {
        // If resume fails, clear the flag
        wasInterruptedRef.current = false;
      });
    }

    setIsPlaying(status.isPlaying);

    // Handle playback completion
    if (status.didJustFinish && !status.isLooping) {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  /**
   * Cleanup current sound
   */
  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (err) {
        console.error('Error cleaning up sound:', err);
      }
    }
  };

  /**
   * Reset sleep timer state
   */
  const resetSleepTimer = () => {
    setSleepTimerState(null);
    setSleepTimerEndTimeState(null);
  };

  /**
   * Play a new track
   */
  const playTrack = async (title: string, uri: string, loop: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      userPausedRef.current = false;
      wasInterruptedRef.current = false;

      // Cleanup existing sound
      await cleanupSound();

      // Create and load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isLooping: loop,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentTrack({ title, uri });
      setIsLoopingState(loop);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing track:', err);
      setError('Failed to play audio. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  /**
   * Pause playback
   */
  const pause = async () => {
    if (soundRef.current) {
      try {
        userPausedRef.current = true;
        wasInterruptedRef.current = false;
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (err) {
        console.error('Error pausing:', err);
      }
    }
  };

  /**
   * Resume playback
   */
  const resume = async () => {
    if (soundRef.current) {
      try {
        userPausedRef.current = false;
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error resuming:', err);
      }
    }
  };

  /**
   * Stop playback and reset all state
   */
  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await cleanupSound();
      } catch (err) {
        console.error('Error stopping:', err);
      }
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentTrack(null);
    resetSleepTimer();
    setIsExpandedState(false);
    userPausedRef.current = false;
    wasInterruptedRef.current = false;
  };

  /**
   * Seek to position (0-1)
   */
  const seek = async (position: number) => {
    if (soundRef.current && duration > 0) {
      try {
        const positionMillis = position * duration;
        await soundRef.current.setPositionAsync(positionMillis);
        setProgress(position);
      } catch (err) {
        console.error('Error seeking:', err);
      }
    }
  };

  /**
   * Set looping mode
   */
  const setLooping = async (loop: boolean) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setIsLoopingAsync(loop);
        setIsLoopingState(loop);
      } catch (err) {
        console.error('Error setting loop:', err);
      }
    }
  };

  /**
   * Set sleep timer
   * Converts minutes to absolute end time for reliability
   */
  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerState(minutes);
    if (minutes === null) {
      setSleepTimerEndTimeState(null);
    } else {
      setSleepTimerEndTimeState(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  /**
   * Set expanded player visibility
   */
  const setIsExpanded = useCallback((expanded: boolean) => {
    setIsExpandedState(expanded);
  }, []);

  // Computed: bottom inset for scrollable content
  const miniPlayerVisible = currentTrack !== null && !isExpanded;
  const audioBottomInset = miniPlayerVisible ? MINI_PLAYER_HEIGHT + MINI_PLAYER_BUFFER : 0;

  const value: AudioPlayerContextValue = {
    // Playback state
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    isLooping,
    error,

    // Sleep timer state
    sleepTimer,
    sleepTimerEndTime,

    // Player UI state
    isExpanded,

    // Content inset
    audioBottomInset,

    // Playback controls
    playTrack,
    pause,
    resume,
    stop: stopPlayback,
    seek,
    setLooping,

    // Sleep timer controls
    setSleepTimer,

    // Player UI controls
    setIsExpanded,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// =====================
// Hook
// =====================

export function useAudioPlayer(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
