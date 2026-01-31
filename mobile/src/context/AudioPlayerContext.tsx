/**
 * Audio Player Context
 * Global audio player state for persistent playback across screens
 * Handles sleep sounds, breathwork audio, and guided meditations
 */

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

// =====================
// Type Definitions
// =====================

export interface AudioTrack {
  title: string;
  uri: string;
}

interface AudioPlayerContextValue {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0-1
  duration: number; // milliseconds
  isLooping: boolean;
  error: string | null;
  playTrack: (title: string, uri: string, loop?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setLooping: (loop: boolean) => Promise<void>;
}

// =====================
// Context Creation
// =====================

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

// =====================
// Provider Component
// =====================

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLoopingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  // Configure audio mode on mount
  useEffect(() => {
    configureAudioMode();
    return () => {
      cleanupSound();
    };
  }, []);

  /**
   * Configure audio mode for playback
   */
  const configureAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (err) {
      console.error('Error configuring audio mode:', err);
    }
  };

  /**
   * Update playback status
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

    setIsPlaying(status.isPlaying);
    setIsLoading(false);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setProgress(status.positionMillis / status.durationMillis);
    }

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
   * Play a new track
   */
  const playTrack = async (title: string, uri: string, loop: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

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
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error resuming:', err);
      }
    }
  };

  /**
   * Stop playback and reset
   */
  const stop = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
        setProgress(0);
        setCurrentTrack(null);
        await cleanupSound();
      } catch (err) {
        console.error('Error stopping:', err);
      }
    }
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

  const value: AudioPlayerContextValue = {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    isLooping,
    error,
    playTrack,
    pause,
    resume,
    stop,
    seek,
    setLooping,
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
