/**
 * Breathwork Tracking Hook
 * Manages favorites and completion tracking for breathwork sessions
 * Uses AsyncStorage for local persistence
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@breathwork_favorites';
const COMPLETIONS_KEY = '@breathwork_completions';

interface CompletionRecord {
  sessionId: string;
  completedAt: string; // ISO date string
}

interface UseBreathworkTrackingReturn {
  favorites: string[];
  completedToday: string[];
  isFavorite: (sessionId: string) => boolean;
  isCompletedToday: (sessionId: string) => boolean;
  toggleFavorite: (sessionId: string) => Promise<void>;
  markCompleted: (sessionId: string) => Promise<void>;
  loading: boolean;
}

export function useBreathworkTracking(): UseBreathworkTrackingReturn {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [favoritesData, completionsData] = await Promise.all([
          AsyncStorage.getItem(FAVORITES_KEY),
          AsyncStorage.getItem(COMPLETIONS_KEY),
        ]);

        if (favoritesData) {
          setFavorites(JSON.parse(favoritesData));
        }

        if (completionsData) {
          setCompletions(JSON.parse(completionsData));
        }
      } catch (error) {
        console.error('Error loading breathwork tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get today's date string for comparison
  const getTodayString = useCallback(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Check if a session is favorited
  const isFavorite = useCallback(
    (sessionId: string) => favorites.includes(sessionId),
    [favorites]
  );

  // Check if a session was completed today
  const isCompletedToday = useCallback(
    (sessionId: string) => {
      const today = getTodayString();
      return completions.some(
        (c) => c.sessionId === sessionId && c.completedAt.startsWith(today)
      );
    },
    [completions, getTodayString]
  );

  // Get list of session IDs completed today
  const completedToday = completions
    .filter((c) => c.completedAt.startsWith(getTodayString()))
    .map((c) => c.sessionId);

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (sessionId: string) => {
      try {
        const newFavorites = favorites.includes(sessionId)
          ? favorites.filter((id) => id !== sessionId)
          : [...favorites, sessionId];

        setFavorites(newFavorites);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    },
    [favorites]
  );

  // Mark a session as completed
  const markCompleted = useCallback(
    async (sessionId: string) => {
      try {
        const newCompletion: CompletionRecord = {
          sessionId,
          completedAt: new Date().toISOString(),
        };

        // Keep last 100 completions to prevent storage bloat
        const newCompletions = [...completions, newCompletion].slice(-100);

        setCompletions(newCompletions);
        await AsyncStorage.setItem(COMPLETIONS_KEY, JSON.stringify(newCompletions));
      } catch (error) {
        console.error('Error marking completion:', error);
      }
    },
    [completions]
  );

  return {
    favorites,
    completedToday,
    isFavorite,
    isCompletedToday,
    toggleFavorite,
    markCompleted,
    loading,
  };
}

export default useBreathworkTracking;
