/**
 * useNotificationPreferences Hook
 * React hook for managing V2 notification preferences state.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateNotificationCategory,
  toggleAllNotifications,
  updateQuietHours,
} from '../services/firebase';
import { NotificationPreferences } from '../types';

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  updateCategory: <K extends keyof NotificationPreferences>(
    category: K,
    settings: NotificationPreferences[K],
  ) => Promise<void>;
  toggleAll: (enabled: boolean) => Promise<void>;
  setQuietHours: (quietHours: NotificationPreferences['quietHours']) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!user?.uid) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const prefs = await getNotificationPreferences(user.uid);
      setPreferences(prefs);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user?.uid) return;

      try {
        await updateNotificationPreferences(user.uid, updates);
        setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (err) {
        console.error('Error updating notification preferences:', err);
        throw err;
      }
    },
    [user?.uid],
  );

  const updateCategory = useCallback(
    async <K extends keyof NotificationPreferences>(
      category: K,
      settings: NotificationPreferences[K],
    ) => {
      if (!user?.uid) return;

      try {
        await updateNotificationCategory(user.uid, category, settings);
        setPreferences((prev) => (prev ? { ...prev, [category]: settings } : null));
      } catch (err) {
        console.error('Error updating notification category:', err);
        throw err;
      }
    },
    [user?.uid],
  );

  const toggleAll = useCallback(
    async (enabled: boolean) => {
      if (!user?.uid) return;

      try {
        await toggleAllNotifications(user.uid, enabled);
        setPreferences((prev) => (prev ? { ...prev, allNotificationsEnabled: enabled } : null));
      } catch (err) {
        console.error('Error toggling notifications:', err);
        throw err;
      }
    },
    [user?.uid],
  );

  const setQuietHours = useCallback(
    async (quietHours: NotificationPreferences['quietHours']) => {
      if (!user?.uid) return;

      try {
        await updateQuietHours(user.uid, quietHours);
        setPreferences((prev) => (prev ? { ...prev, quietHours } : null));
      } catch (err) {
        console.error('Error updating quiet hours:', err);
        throw err;
      }
    },
    [user?.uid],
  );

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateCategory,
    toggleAll,
    setQuietHours,
    refresh: loadPreferences,
  };
}

export default useNotificationPreferences;
