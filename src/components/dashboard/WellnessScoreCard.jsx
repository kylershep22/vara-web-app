/**
 * WellnessScoreCard
 * SVG circular gauge showing overall wellness score (0-100) with color coding,
 * trend indicator, and opt-in state for users who haven't enabled the feature.
 */

import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SCORE_COLOR_RED   = '#D97A6E';
const SCORE_COLOR_AMBER = '#F5B971';
const SCORE_COLOR_TEAL  = '#1B5E57';

function getScoreColor(score) {
  if (score >= 70) return SCORE_COLOR_TEAL;
  if (score >= 40) return SCORE_COLOR_AMBER;
  return SCORE_COLOR_RED;
}

function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp  size={16} className="text-evergreen-teal" />;
  if (trend === 'down') return <TrendingDown size={16} className="text-soft-coral" />;
  return <Minus size={16} className="text-muted-sage-gray" />;
}

/**
 * WellnessScoreCard
 *
 * Props:
 *   score      – { score: number, pillars: object, trend: 'up'|'down'|'stable' } | null
 *   loading    – boolean
 *   enabled    – boolean (has user opted in)
 *   onRefresh  – () => void
 *   onEnable   – () => void
 *   onShowBreakdown – () => void
 */
export default function WellnessScoreCard({
  score,
  loading,
  enabled,
  onRefresh,
  onEnable,
  onShowBreakdown,
}) {
  // ── Opt-in state ──────────────────────────────────────────────────────────
  if (!enabled) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <p className="text-vara-base font-semibold text-soft-charcoal mb-1">
          Track your wellness score?
        </p>
        <p className="text-vara-sm text-muted-sage-gray leading-relaxed mb-vara-lg">
          Your daily score reflects sleep, habits, mood, and more — giving you a
          single number that shows how your foundations are holding up.
        </p>
        <button
          type="button"
          onClick={onEnable}
          className="px-vara-lg py-vara-sm rounded-vara-md bg-evergreen-teal text-white text-vara-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Enable
        </button>
      </div>
    );
  }

  // ── Score gauge ───────────────────────────────────────────────────────────
  const currentScore = score?.score ?? 0;
  const trend        = score?.trend  ?? 'stable';
  const scoreColor   = getScoreColor(currentScore);

  const radius       = 52;
  const circumference = 2 * Math.PI * radius;
  const progress     = (currentScore / 100) * circumference;
  const offset       = circumference - progress;

  return (
    <div
      className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider cursor-pointer hover:shadow-vara-lg transition-shadow duration-200"
      onClick={onShowBreakdown}
      role="button"
      tabIndex={0}
      aria-label={`Wellness score: ${currentScore}. Click to see breakdown.`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onShowBreakdown?.(); }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-vara-lg">
        <p className="text-vara-sm font-semibold text-soft-charcoal">Wellness Score</p>

        {/* Refresh button — stop event propagation so it doesn't open the modal */}
        <button
          type="button"
          aria-label="Refresh wellness score"
          onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
          className="p-1 text-muted-sage-gray hover:opacity-70 transition-opacity"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative inline-block">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            {/* Background track */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="#E8E8E8"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          {/* Centered score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-3xl font-bold leading-none"
              style={{ color: scoreColor }}
            >
              {currentScore}
            </span>
            <span className="text-vara-xs text-muted-sage-gray mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-1 mt-vara-sm">
          <TrendIcon trend={trend} />
          <span className="text-vara-xs text-muted-sage-gray capitalize">{trend}</span>
        </div>

        {/* Hint text */}
        <p className="text-vara-xs text-muted-sage-gray mt-vara-sm opacity-70">
          Tap to see breakdown
        </p>
      </div>
    </div>
  );
}
