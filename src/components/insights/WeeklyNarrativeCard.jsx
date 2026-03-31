// src/components/insights/WeeklyNarrativeCard.jsx
// AI-generated weekly narrative card showing personalized week story.

import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { authedPost } from '../../lib/apiClient';
import { useWeeklyCorrelations } from '../../hooks/useWeeklyCorrelations';

const CACHE_KEY = 'vara_weekly_narrative';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.text;
  } catch {
    return null;
  }
}

function setCache(text) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), text }));
  } catch {
    // Non-critical
  }
}

export default function WeeklyNarrativeCard({ userId }) {
  const { correlations, loading: corrLoading } = useWeeklyCorrelations();
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const cached = getCache();
    if (cached) {
      setNarrative(cached);
      setLoading(false);
      return;
    }

    // Wait for correlations to be ready before calling API
    if (corrLoading) return;

    async function fetchNarrative() {
      setLoading(true);
      setError(false);
      try {
        const c = correlations || {};
        const correlationData = {
          sleepAvg: c.sleepAvg ?? null,
          moodAvg: c.moodAvg ?? null,
          energyAvg: c.energyAvg ?? null,
          stressAvg: c.stressAvg ?? null,
          habitCompletionRate: c.habitCompletionRate ?? null,
          focusMinutesAvg: c.focusMinutesAvg ?? null,
          journalDays: c.journalDays ?? null,
          totalDays: 7,
          sleepHabitCorrelation: c.sleepHabitCorrelation ?? null,
          journalMoodCorrelation: c.journalMoodCorrelation ?? null,
          stressTrend: c.stressTrend ?? null,
          brightSpot: c.brightSpot ?? null,
          bestDay: c.bestDay ?? null,
          hardestDay: c.hardestDay ?? null,
          weekOverWeek: c.weekOverWeek ?? null,
        };

        const res = await authedPost(
          `${process.env.REACT_APP_API_URL}/api/weekly-narrative`,
          { correlationData }
        );
        const data = await res.json();
        const text = data?.text || data?.narrative || '';
        if (text) {
          setNarrative(text);
          setCache(text);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Weekly narrative error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchNarrative();
  }, [userId, correlations, corrLoading]);

  // Fallback template text
  const fallbackText = (() => {
    if (!correlations) return 'Keep tracking your habits and check-ins to unlock your personalized week story.';
    const rate = correlations.habitCompletionRate != null
      ? `${Math.round(correlations.habitCompletionRate)}%`
      : 'some';
    const brightSpot = correlations.brightSpot
      ? ` ${correlations.brightSpot}`
      : ' Keep building on your momentum.';
    return `This week you completed about ${rate} of your habits.${brightSpot}`;
  })();

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
      <div className="flex items-center gap-vara-sm mb-vara-base">
        <BookOpen size={20} className="text-evergreen-teal flex-shrink-0" />
        <h2 className="text-vara-lg font-semibold text-soft-charcoal">Your Week Story</h2>
      </div>

      {loading || corrLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      ) : error ? (
        <p className="text-vara-sm text-soft-charcoal leading-relaxed">{fallbackText}</p>
      ) : (
        <p className="text-vara-sm text-soft-charcoal leading-relaxed whitespace-pre-wrap">{narrative}</p>
      )}
    </div>
  );
}
