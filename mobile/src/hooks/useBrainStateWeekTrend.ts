import { useState, useEffect } from 'react';
import { getBrainStateHistory } from '../services/firebase/brainStateCheckIn.service';
import { BrainState } from '../types';
import { Colors } from '../constants';

export interface DaySlot {
  date: string;
  dayLabel: string;
  brainState: BrainState | null;
  color: string | null;
}

export interface WeekTrend {
  days: DaySlot[];
  summary: string | null;
}

const STATE_COLORS: Record<BrainState, string> = {
  wired: Colors.softCoral,
  foggy: Colors.sunriseAmber,
  okay: Colors.mutedSageGray,
  clear: Colors.evergreenTeal,
  energized: Colors.success,
};

const STATE_RANK: Record<BrainState, number> = {
  foggy: 1,
  wired: 2,
  okay: 3,
  clear: 4,
  energized: 5,
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Build the 7-day slot array for a rolling last-7-days window (today and 6 days prior).
 * `history` is an array of { date: 'YYYY-MM-DD', brainState: BrainState }.
 */
export function buildWeekSlots(
  history: Array<{ date: string; brainState: BrainState }>
): DaySlot[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const historyMap = new Map(history.map((h) => [h.date, h.brainState]));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayIndex = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0 based index
    const state = historyMap.get(dateStr) ?? null;
    return {
      date: dateStr,
      dayLabel: DAY_LABELS[dayIndex],
      brainState: state,
      color: state ? STATE_COLORS[state] : null,
    };
  });
}

/**
 * Compute a human-readable summary from the week's brain state data.
 * Returns null if fewer than 2 days have data.
 */
export function computeSummary(days: DaySlot[]): string | null {
  const withData = days.filter((d) => d.brainState !== null);
  if (withData.length < 2) return null;

  // Rule 1: Dominant state (3+ days)
  const counts = new Map<BrainState, number>();
  for (const d of withData) {
    counts.set(d.brainState!, (counts.get(d.brainState!) ?? 0) + 1);
  }
  for (const [state, count] of counts) {
    if (count >= 3) {
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      return `${label} ${count} of ${withData.length} days`;
    }
  }

  // Rule 2 & 3: Trending better or worse
  // Compare average rank of first half vs second half of days with data
  if (withData.length >= 4) {
    const mid = Math.floor(withData.length / 2);
    const firstHalf = withData.slice(0, mid);
    const secondHalf = withData.slice(mid);
    const avg = (arr: DaySlot[]) =>
      arr.reduce((sum, d) => sum + STATE_RANK[d.brainState!], 0) / arr.length;
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    if (secondAvg - firstAvg >= 0.5) return 'Trending clearer this week';
    if (firstAvg - secondAvg >= 0.5) return 'Trending foggier this week';
  }

  // Rule 4: Fallback — top 2 states
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const parts = sorted
    .slice(0, 2)
    .map(([state, count]) => `${count} ${state}`);
  return `Mixed week: ${parts.join(', ')}`;
}

/**
 * Hook that fetches 7-day brain state history and computes trend data.
 * Returns { days, summary, loading }.
 */
export function useBrainStateWeekTrend(userId: string | undefined, refreshKey?: string | null) {
  const [trend, setTrend] = useState<WeekTrend>({ days: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const history = await getBrainStateHistory(userId!, 7);
        if (cancelled) return;

        const mapped = history.map((h) => ({
          date: h.date,
          brainState: h.brainState,
        }));

        const days = buildWeekSlots(mapped);
        const summary = computeSummary(days);
        setTrend({ days, summary });
      } catch {
        // Fail silently — trend is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return { ...trend, loading };
}
