/**
 * Sleep Favorites Hook
 * Manages favorite state for sleep content using AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SLEEP_FAVORITES_KEY = '@sleep_favorites';

interface UseSleepFavoritesReturn {
  favorites: string[];
  isFavorite: (contentId: string) => boolean;
  toggleFavorite: (contentId: string) => Promise<void>;
  loading: boolean;
}

export function useSleepFavorites(): UseSleepFavoritesReturn {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const data = await AsyncStorage.getItem(SLEEP_FAVORITES_KEY);
        if (data) {
          setFavorites(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading sleep favorites:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, []);

  const isFavorite = useCallback(
    (contentId: string) => favorites.includes(contentId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (contentId: string) => {
      try {
        const newFavorites = favorites.includes(contentId)
          ? favorites.filter((id) => id !== contentId)
          : [...favorites, contentId];
        setFavorites(newFavorites);
        await AsyncStorage.setItem(SLEEP_FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error toggling sleep favorite:', error);
      }
    },
    [favorites]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}
