/**
 * useWeeklySummary Hook
 * Fetches and caches AI-generated weekly journal summary
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry, JournalWeeklySummary } from '../types';
import { generateStructuredJournalSummary } from '../services/api/ai.service';

interface UseWeeklySummaryResult {
  /** The weekly summary data */
  summary: JournalWeeklySummary | null;
  /** Whether the summary is loading */
  loading: boolean;
  /** Error if summary generation failed */
  error: Error | null;
  /** Function to refetch the summary */
  refetch: () => void;
  /** Whether there are enough entries to generate a summary */
  hasEnoughEntries: boolean;
}

const MIN_ENTRIES_FOR_SUMMARY = 3;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get entries from the past 7 days
 */
const getWeekEntries = (entries: JournalEntry[]): JournalEntry[] => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  return entries.filter((entry) => {
    const entryDate = entry.createdAt?.toDate?.()
      ? entry.createdAt.toDate()
      : new Date(entry.createdAt?.seconds ? entry.createdAt.seconds * 1000 : entry.createdAt);
    return entryDate >= weekAgo;
  });
};

/**
 * Format entries as text for the AI prompt
 */
const formatEntriesForAI = (entries: JournalEntry[]): string => {
  return entries
    .map((entry) => {
      const date = entry.createdAt?.toDate?.()
        ? entry.createdAt.toDate()
        : new Date(entry.createdAt?.seconds ? entry.createdAt.seconds * 1000 : entry.createdAt);

      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const content = entry.text || entry.content || '';
      const mood = entry.mood ? `[Mood: ${entry.mood}]` : '';
      const tags = entry.tags?.length ? `[Tags: ${entry.tags.join(', ')}]` : '';

      return `${dateStr} ${mood} ${tags}\n${content}`;
    })
    .join('\n\n---\n\n');
};

/**
 * Hook to fetch and cache weekly journal summary
 */
export const useWeeklySummary = (entries: JournalEntry[]): UseWeeklySummaryResult => {
  const [summary, setSummary] = useState<JournalWeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache tracking
  const lastFetchTime = useRef<number>(0);
  const lastEntriesHash = useRef<string>('');

  // Get week entries
  const weekEntries = getWeekEntries(entries);
  const hasEnoughEntries = weekEntries.length >= MIN_ENTRIES_FOR_SUMMARY;

  // Create a simple hash of entries to detect changes
  const entriesHash = weekEntries.map((e) => e.id).sort().join(',');

  const fetchSummary = useCallback(async () => {
    if (!hasEnoughEntries) {
      setSummary(null);
      return;
    }

    // Check cache validity
    const now = Date.now();
    const cacheValid =
      now - lastFetchTime.current < CACHE_DURATION_MS &&
      lastEntriesHash.current === entriesHash;

    if (cacheValid && summary) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedEntries = formatEntriesForAI(weekEntries);
      const result = await generateStructuredJournalSummary(formattedEntries);

      setSummary(result);
      lastFetchTime.current = now;
      lastEntriesHash.current = entriesHash;
    } catch (err) {
      console.error('Failed to fetch weekly summary:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate summary'));
    } finally {
      setLoading(false);
    }
  }, [hasEnoughEntries, entriesHash, summary, weekEntries]);

  // Auto-fetch when entries change and we have enough
  useEffect(() => {
    if (hasEnoughEntries && !summary && !loading) {
      fetchSummary();
    }
  }, [hasEnoughEntries, summary, loading, fetchSummary]);

  const refetch = useCallback(() => {
    // Force refetch by clearing cache
    lastFetchTime.current = 0;
    lastEntriesHash.current = '';
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch,
    hasEnoughEntries,
  };
};
