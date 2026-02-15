/**
 * useSuggestedConnections Hook
 * Provides suggested connections and mutual connection calculations
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSuggestedConnections,
  getMutualConnections,
  getMutualConnectionProfiles,
  formatLastActive,
  getSuggestionReasonLabel,
  EnhancedUserProfile,
} from '../services/firebase/connections.service';

interface UseSuggestedConnectionsReturn {
  suggestions: EnhancedUserProfile[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useSuggestedConnections(maxSuggestions: number = 10): UseSuggestedConnectionsReturn {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSuggestions = useCallback(async () => {
    if (!user) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await getSuggestedConnections(user.uid, maxSuggestions);
      setSuggestions(results);
    } catch (err) {
      console.error('Error loading suggested connections:', err);
      setError(err instanceof Error ? err : new Error('Failed to load suggestions'));
    } finally {
      setLoading(false);
    }
  }, [user, maxSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return {
    suggestions,
    loading,
    error,
    refresh: loadSuggestions,
  };
}

interface UseMutualConnectionsReturn {
  mutualIds: string[];
  mutualProfiles: EnhancedUserProfile[];
  loading: boolean;
  error: Error | null;
}

export function useMutualConnections(otherUserId: string): UseMutualConnectionsReturn {
  const { user } = useAuth();
  const [mutualIds, setMutualIds] = useState<string[]>([]);
  const [mutualProfiles, setMutualProfiles] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !otherUserId || user.uid === otherUserId) {
      setMutualIds([]);
      setMutualProfiles([]);
      setLoading(false);
      return;
    }

    const loadMutuals = async () => {
      try {
        setLoading(true);
        setError(null);

        const [ids, profiles] = await Promise.all([
          getMutualConnections(user.uid, otherUserId),
          getMutualConnectionProfiles(user.uid, otherUserId, 3),
        ]);

        setMutualIds(ids);
        setMutualProfiles(profiles);
      } catch (err) {
        console.error('Error loading mutual connections:', err);
        setError(err instanceof Error ? err : new Error('Failed to load mutual connections'));
      } finally {
        setLoading(false);
      }
    };

    loadMutuals();
  }, [user, otherUserId]);

  return {
    mutualIds,
    mutualProfiles,
    loading,
    error,
  };
}

// Re-export utility functions for use in components
export { formatLastActive, getSuggestionReasonLabel };
