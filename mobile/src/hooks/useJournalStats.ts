/**
 * useJournalStats Hook
 * Calculates tag frequency and mood statistics from journal entries
 */

import { useMemo } from 'react';
import { JournalEntry } from '../types';

interface TagCount {
  value: string;
  count: number;
}

interface JournalStats {
  /** Top tags sorted by frequency (top 7) */
  topTags: TagCount[];
  /** Mood distribution counts */
  moodDistribution: Record<string, number>;
  /** Number of entries this week */
  thisWeekCount: number;
  /** Whether user has any entries this week */
  hasEntriesThisWeek: boolean;
}

/**
 * Get the start of the current week (Monday)
 */
const getWeekStart = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Hook to calculate journal entry statistics
 */
export const useJournalStats = (entries: JournalEntry[]): JournalStats => {
  return useMemo(() => {
    const tagCounts: Record<string, number> = {};
    const moodDistribution: Record<string, number> = {};
    const weekStart = getWeekStart();
    let thisWeekCount = 0;

    entries.forEach((entry) => {
      // Count tags
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }

      // Count moods
      if (entry.mood) {
        moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
      }

      // Check if entry is from this week
      const entryDate = entry.createdAt?.toDate?.() || new Date(entry.createdAt as any);
      if (entryDate >= weekStart) {
        thisWeekCount++;
      }
    });

    // Sort tags by frequency and take top 7
    const topTags: TagCount[] = Object.entries(tagCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    return {
      topTags,
      moodDistribution,
      thisWeekCount,
      hasEntriesThisWeek: thisWeekCount > 0,
    };
  }, [entries]);
};
