/**
 * WellnessScoreBreakdown
 * Modal overlay that shows the full pillar-by-pillar breakdown of the
 * user's wellness score, including component details and incomplete actions.
 */

import React, { useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SCORE_COLOR_RED   = '#D97A6E';
const SCORE_COLOR_AMBER = '#F5B971';
const SCORE_COLOR_TEAL  = '#1B5E57';

function getScoreColor(score) {
  if (score >= 70) return SCORE_COLOR_TEAL;
  if (score >= 40) return SCORE_COLOR_AMBER;
  return SCORE_COLOR_RED;
}

function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp  size={16} className="text-evergreen-teal" aria-hidden="true" />;
  if (trend === 'down') return <TrendingDown size={16} className="text-soft-coral"    aria-hidden="true" />;
  return <Minus size={16} className="text-muted-sage-gray" aria-hidden="true" />;
}

const PILLAR_META = {
  foundation:  { label: 'Foundation',  weight: '40%' },
  consistency: { label: 'Consistency', weight: '30%' },
  mind:        { label: 'Mind',        weight: '20%' },
  growth:      { label: 'Growth',      weight: '10%' },
};

/** Horizontal progress bar (0-100) */
function PillarBar({ score }) {
  const color = getScoreColor(score);
  return (
    <div className="w-full h-2 rounded-vara-pill bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-vara-pill transition-all duration-500"
        style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * WellnessScoreBreakdown
 *
 * Props:
 *   score   – { score, pillars: { foundation, consistency, mind, growth }, trend,
 *               incompleteActions, suggestion }
 *   onClose – () => void
 */
export default function WellnessScoreBreakdown({ score, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!score) return null;

  const overallColor = getScoreColor(score.score);
  const pillars      = score.pillars ?? {};
  const pillarOrder  = ['foundation', 'consistency', 'mind', 'growth'];
  const incomplete   = score.incompleteActions ?? [];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Wellness Score Breakdown"
    >
      {/* Modal panel — stop clicks from bubbling to overlay */}
      <div
        className="relative bg-white rounded-vara-xl p-vara-xl w-full max-w-lg mx-vara-base mt-20 mb-vara-xl shadow-vara-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-vara-lg">
          <h2 className="text-vara-lg font-bold text-soft-charcoal">
            Wellness Score Breakdown
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close breakdown"
            className="p-1 text-muted-sage-gray hover:opacity-70 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Overall score ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-vara-md mb-vara-xl">
          <span
            className="text-vara-3xl font-bold"
            style={{ color: overallColor }}
          >
            {score.score}
          </span>
          <div className="flex flex-col">
            <span className="text-vara-sm text-muted-sage-gray">out of 100</span>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon trend={score.trend} />
              <span className="text-vara-xs text-muted-sage-gray capitalize">
                {score.trend ?? 'stable'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Pillar sections ──────────────────────────────────────────────── */}
        <div className="space-y-vara-lg">
          {pillarOrder.map((key) => {
            const pillar = pillars[key];
            if (!pillar) return null;

            const meta = PILLAR_META[key];
            const pillarScore = pillar.score ?? 0;
            const components  = pillar.components ?? [];

            return (
              <div key={key}>
                {/* Pillar header */}
                <div className="flex items-center justify-between mb-vara-xs">
                  <span className="text-vara-sm font-semibold text-soft-charcoal">
                    {meta.label}{' '}
                    <span className="font-normal text-muted-sage-gray">
                      ({meta.weight})
                    </span>
                  </span>
                  <span
                    className="text-vara-sm font-bold"
                    style={{ color: getScoreColor(pillarScore) }}
                  >
                    {pillarScore}
                  </span>
                </div>

                {/* Progress bar */}
                <PillarBar score={pillarScore} />

                {/* Component list */}
                {components.length > 0 && (
                  <ul className="mt-vara-sm space-y-vara-xs pl-vara-sm">
                    {components.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-center gap-2 text-vara-xs text-muted-sage-gray"
                      >
                        {/* Status dot */}
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              c.status === 'positive' ? SCORE_COLOR_TEAL
                              : c.status === 'negative' ? SCORE_COLOR_RED
                              : c.status === 'missing'  ? '#D1D5DB'
                              : SCORE_COLOR_AMBER,
                          }}
                          aria-hidden="true"
                        />
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Suggestion ───────────────────────────────────────────────────── */}
        {score.suggestion && (
          <div className="mt-vara-xl p-vara-md rounded-vara-md bg-teal-light border border-divider">
            <p className="text-vara-xs text-evergreen-teal font-medium">
              {score.suggestion}
            </p>
          </div>
        )}

        {/* ── Incomplete Actions ───────────────────────────────────────────── */}
        {incomplete.length > 0 && (
          <div className="mt-vara-xl">
            <p className="text-vara-sm font-semibold text-soft-charcoal mb-vara-sm">
              Incomplete Actions
            </p>
            <ul className="space-y-vara-xs">
              {incomplete.map((action) => (
                <li
                  key={action.component}
                  className="flex items-start gap-2 text-vara-xs text-muted-sage-gray"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-medium text-soft-charcoal capitalize">
                      {action.label}
                    </span>
                    {': '}
                    {action.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
