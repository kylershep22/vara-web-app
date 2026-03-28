// src/components/brain/AIBrainInsightCard.jsx
// Daily AI-generated brain health insight, cached in localStorage for the day.

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { authedPost } from '../../lib/apiClient';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

const CACHE_KEY_PREFIX = 'vara_brain_insight_';

export default function AIBrainInsightCard() {
  const { user } = useAuth();
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const todayKey = getTodayKey();
  const cacheKey = `${CACHE_KEY_PREFIX}${todayKey}`;

  // On mount: load from cache or generate
  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setInsight(cached);
    } else {
      generateInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function generateInsight() {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Fetch today's metrics for context
      const snap = await getDoc(doc(db, 'brainMetrics', `${user.uid}_${todayKey}`));
      const metrics = snap.exists() ? snap.data() : {};

      const brainMetrics = {
        readinessScore: metrics.readinessScore ?? null,
        neuroplasticityCount: metrics.neuroplasticityCount ?? 0,
        amccStreak: null, // streak is computed in AMCCChallengeCard; skip for simplicity here
        nervousSystemToolUses: metrics.nervousSystemToolUses ?? 0,
      };

      const payload = {
        messages: [
          {
            role: 'user',
            content:
              'Based on my brain health status, give me one actionable insight or recommendation for today. Be concise (2-3 sentences max).',
          },
        ],
        context: {
          page: 'Brain Health',
          brainMetrics,
        },
      };

      const res = await authedPost('/api/ai-chat', payload);
      if (!res.ok) throw new Error(`AI error (${res.status})`);
      const data = await res.json();
      const text = data?.reply || "Focus on one small win today. Consistency compounds over time.";
      setInsight(text);
      localStorage.setItem(cacheKey, text);
    } catch (e) {
      console.error('AIBrainInsightCard error', e);
      setError("Couldn't load your insight right now. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    localStorage.removeItem(cacheKey);
    generateInsight();
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-vara-base">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-evergreen-teal shrink-0" />
          <p className="text-[15px] font-semibold text-soft-charcoal">Today's Insight</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1 text-muted-sage-gray hover:text-evergreen-teal transition-colors disabled:opacity-40"
          title="Refresh insight"
          aria-label="Refresh insight"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-vara-base text-[13px] text-muted-sage-gray">
          <Loader2 size={14} className="animate-spin shrink-0" />
          Generating your personalized insight…
        </div>
      ) : error ? (
        <div className="space-y-vara-sm">
          <p className="text-[13px] text-soft-coral">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-[12px] text-evergreen-teal hover:underline"
          >
            Try again
          </button>
        </div>
      ) : insight ? (
        <div className="bg-teal-light rounded-vara-lg p-vara-base">
          <p className="text-[14px] text-soft-charcoal leading-relaxed">{insight}</p>
        </div>
      ) : null}
    </div>
  );
}
